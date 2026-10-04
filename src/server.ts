import * as trpcExpress from '@trpc/server/adapters/express';
import cors from 'cors';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import express from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { z } from 'zod';
import { isAdminRequest } from './auth.js';
import { blockNames, collectionNames, type BlockName, type CollectionName } from './content-schema.js';
import { getPublicPayload, seedNewCollections, type PublicScope } from './content.js';
import { db } from './db/client.js';
import { media } from './db/schema.js';
import { env } from './env.js';
import { mailerReady, MAX_RESUME_BYTES, sendApplicationEmail, sendContactEmail, sendNewsletterEmails, sniffResumeType } from './mailer.js';
import { createCourseOrder, DuplicatePaymentError, orderInputSchema } from './orders.js';
import { appRouter } from './routers.js';
import { ensureBucket, MAX_UPLOAD_BYTES, removeImage, sniffImageType, uploadImage } from './storage.js';
import { createContext } from './trpc.js';

const app = express();

// Render sits behind a proxy; without this every visitor shares one IP for rate limiting.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  cors({
    origin: env.corsOrigins.length ? env.corsOrigins : '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 86400,
  }),
);

if (!env.corsOrigins.length) {
  console.warn('CORS_ORIGIN is not set: allowing requests from any origin.');
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// "?blocks=hero&collections=team,stats&fields[team]=name,role" -> only the names this site knows. Without
// blocks/collections the whole content is returned, so older cached copies of the website keep working.
const FIELD_NAME = /^[a-zA-Z][a-zA-Z0-9]{0,63}$/;
const MAX_FIELDS = 30;

function parseScope(query: express.Request['query']): PublicScope {
  const names = <T extends string>(value: unknown, known: readonly T[]): T[] | undefined => {
    if (typeof value !== 'string') return undefined;
    return value
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is T => (known as readonly string[]).includes(s));
  };
  const collections = names<CollectionName>(query.collections, collectionNames);
  // fields[<collection>]=a,b,c, only for collections that were asked for.
  const fields: NonNullable<PublicScope['fields']> = {};
  const rawFields = query.fields;
  if (collections && rawFields && typeof rawFields === 'object' && !Array.isArray(rawFields)) {
    for (const name of collections) {
      const value = (rawFields as Record<string, unknown>)[name];
      if (typeof value !== 'string') continue;
      const list = value
        .split(',')
        .map((s) => s.trim())
        .filter((s) => FIELD_NAME.test(s))
        .slice(0, MAX_FIELDS);
      if (list.length) fields[name] = list;
    }
  }
  return { blocks: names<BlockName>(query.blocks, blockNames), collections, fields };
}

// Public read used by the website. Browsers must revalidate every time (cheap 304 via ETag),
// so an admin edit is visible on the very next page load. The body is built and gzipped once and reused.
app.get('/api/public/content', async (req, res) => {
  try {
    const payload = await getPublicPayload(parseScope(req.query));
    res.set({ 'Cache-Control': 'no-cache', ETag: payload.etag, 'Content-Type': 'application/json; charset=utf-8' });
    res.vary('Accept-Encoding');
    if (req.fresh) return res.status(304).end();
    if (payload.gzip && req.acceptsEncodings('gzip') === 'gzip') {
      res.set('Content-Encoding', 'gzip');
      return res.send(payload.gzip);
    }
    res.send(payload.body);
  } catch (err) {
    console.error('public content failed', err);
    res.status(500).json({ error: 'Could not load content' });
  }
});

// Slow down password guessing on the login procedure.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.path.includes('auth.login'),
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

app.use('/api/trpc', loginLimiter, trpcExpress.createExpressMiddleware({ router: appRouter, createContext }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

app.post('/api/admin/upload', async (req, res) => {
  if (!(await isAdminRequest(req.headers.authorization))) {
    return res.status(401).json({ error: 'Please sign in again.' });
  }

  upload.single('file')(req, res, async (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image is larger than 5 MB.' : err.message;
      return res.status(400).json({ error: message });
    }
    if (err) return res.status(400).json({ error: 'Upload failed.' });
    if (!req.file) return res.status(400).json({ error: 'No file received.' });

    const mimeType = sniffImageType(req.file.buffer);
    if (!mimeType) return res.status(400).json({ error: 'Only JPG, PNG, WebP or GIF images are allowed.' });

    let stored: Awaited<ReturnType<typeof uploadImage>> | undefined;
    try {
      stored = await uploadImage(req.file.buffer, mimeType);
      const [row] = await db
        .insert(media)
        .values({
          name: req.file.originalname.slice(0, 200),
          url: stored.url,
          storagePath: stored.storagePath,
          mimeType,
          sizeBytes: req.file.size,
        })
        .returning();
      res.json({ id: row.id, url: row.url, name: row.name });
    } catch (e) {
      console.error('upload failed', e);
      if (stored) await removeImage(stored.storagePath).catch(() => {});
      res.status(500).json({ error: 'Could not save the image. Please try again.' });
    }
  });
});

// Careers apply form: the resume is emailed straight to HR and not stored anywhere.
const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many applications from this network. Please try again in an hour.' },
});

const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_BYTES, files: 1, fields: 10, fieldSize: 4000 },
});

const applicationSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name.').max(120),
  email: z.string().trim().email('Please enter a valid email.').max(200),
  phone: z.string().trim().max(40).optional().default(''),
  role: z.string().trim().min(2, 'Please choose a role.').max(160),
  note: z.string().trim().max(2000).optional().default(''),
  // Honeypot: hidden from people, filled in by bots.
  website: z.string().max(500).optional(),
});

app.post('/api/public/apply', applyLimiter, (req, res) => {
  if (!mailerReady()) {
    console.error('Apply form used but RESEND_API_KEY is not set.');
    return res.status(503).json({ error: 'Applications are not open online right now. Please email hr@clyxmedia.com.' });
  }

  resumeUpload.single('resume')(req, res, async (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Resume is larger than 5 MB.' : 'Could not read the form.';
      return res.status(400).json({ error: message });
    }
    if (err) return res.status(400).json({ error: 'Upload failed.' });

    const parsed = applicationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Please check the form.' });
    // Pretend success so bots learn nothing.
    if (parsed.data.website) return res.json({ ok: true });

    if (!req.file) return res.status(400).json({ error: 'Please attach your resume.' });
    const ext = sniffResumeType(req.file.buffer, req.file.originalname);
    if (!ext) return res.status(400).json({ error: 'Resume must be a PDF, DOC or DOCX file.' });

    try {
      await sendApplicationEmail(parsed.data, { buffer: req.file.buffer, ext });
      res.json({ ok: true });
    } catch (e) {
      console.error('application email failed', e);
      res.status(502).json({ error: 'Could not send your application. Please try again or email hr@clyxmedia.com.' });
    }
  });
});

// Contact page enquiry form: emailed to CONTACT_TO_EMAIL, not stored.
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages from this network. Please try again in an hour.' },
});

const enquirySchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(120),
  email: z.string().trim().email('Please enter a valid email.').max(200),
  company: z.string().trim().max(200).optional().default(''),
  message: z.string().trim().min(5, 'Please tell us a little more.').max(5000),
  // Honeypot: hidden from people, filled in by bots.
  website: z.string().max(500).optional(),
});

app.post('/api/public/contact', contactLimiter, express.json({ limit: '20kb' }), async (req, res) => {
  if (!mailerReady()) {
    console.error('Contact form used but RESEND_API_KEY is not set.');
    return res.status(503).json({ error: 'The form is not available right now. Please email work@clyxmedia.com.' });
  }
  const parsed = enquirySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Please check the form.' });
  // Pretend success so bots learn nothing.
  if (parsed.data.website) return res.json({ ok: true });

  try {
    await sendContactEmail(parsed.data);
    res.json({ ok: true });
  } catch (e) {
    console.error('contact email failed', e);
    res.status(502).json({ error: 'Could not send your message. Please try again or email work@clyxmedia.com.' });
  }
});

// Landing page newsletter strip: welcome email to the subscriber, signup notice to CONTACT_TO_EMAIL.
const subscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many signups from this network. Please try again in an hour.' },
});

const subscribeSchema = z.object({
  email: z.string().trim().email('Please enter a valid email.').max(200),
  // Honeypot: hidden from people, filled in by bots.
  website: z.string().max(500).optional(),
});

app.post('/api/public/subscribe', subscribeLimiter, express.json({ limit: '2kb' }), async (req, res) => {
  if (!mailerReady()) {
    console.error('Newsletter form used but RESEND_API_KEY is not set.');
    return res.status(503).json({ error: 'Signups are not available right now. Please email work@clyxmedia.com.' });
  }
  const parsed = subscribeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Please check your email.' });
  // Pretend success so bots learn nothing.
  if (parsed.data.website) return res.json({ ok: true });

  try {
    await sendNewsletterEmails(parsed.data.email);
    res.json({ ok: true });
  } catch (e) {
    console.error('newsletter email failed', e);
    res.status(502).json({ error: 'Could not subscribe you right now. Please try again in a moment.' });
  }
});

// Course checkout chat: the buyer paid by UPI QR and sends the UTR / transaction ID. Stored for the team, who check
// the payment in their UPI app and share the class link on WhatsApp. One small INSERT per order.
// The limit is per IP and generous, because a whole college or office can share one IP.
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts from this network. Please wait a few minutes or message us on WhatsApp.' },
});

app.post('/api/public/course-orders', orderLimiter, express.json({ limit: '4kb' }), async (req, res) => {
  const parsed = orderInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Please check your details.' });
  // Pretend success so bots learn nothing.
  if (parsed.data.website) return res.json({ ok: true, ref: parsed.data.ref || 'CLX-000000' });

  try {
    const { ref } = await createCourseOrder(parsed.data);
    res.json({ ok: true, ref });
  } catch (e) {
    if (e instanceof DuplicatePaymentError) return res.status(409).json({ error: e.message });
    console.error('course order failed', e);
    res.status(500).json({ error: 'Could not save your order right now.' });
  }
});

ensureBucket().catch((e) => console.error('Storage bucket check failed:', e.message));

app.listen(env.port, () => {
  console.log(`Backend server running on port ${env.port}`);
  // Fill lists added since launch, then load content and open the database connection now,
  // so the first visitor after a (re)start is not the one who waits.
  // Apply new migrations (e.g. the course_orders table) before seeding, so a plain redeploy is enough.
  migrate(db, { migrationsFolder: './drizzle' })
    .catch((e) => console.error('Database migration failed:', e.message))
    .then(() => seedNewCollections())
    .then((seeded) => seeded.length && console.log(`Seeded new lists: ${seeded.join(', ')}`))
    .catch((e) => console.error('Seeding new lists failed:', e.message))
    .finally(() => getPublicPayload().catch((e) => console.error('Content warm-up failed:', e.message)));
});
