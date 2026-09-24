import * as trpcExpress from '@trpc/server/adapters/express';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { isAdminRequest } from './auth.js';
import { blockNames, collectionNames, type BlockName, type CollectionName } from './content-schema.js';
import { getPublicPayload } from './content.js';
import { db } from './db/client.js';
import { media } from './db/schema.js';
import { env } from './env.js';
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

// "?blocks=hero&collections=team,stats" -> only the names this site knows. Without either parameter the
// whole content is returned, so older cached copies of the website keep working.
function parseScope(query: express.Request['query']) {
  const names = <T extends string>(value: unknown, known: readonly T[]): T[] | undefined => {
    if (typeof value !== 'string') return undefined;
    return value
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is T => (known as readonly string[]).includes(s));
  };
  return { blocks: names<BlockName>(query.blocks, blockNames), collections: names<CollectionName>(query.collections, collectionNames) };
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

ensureBucket().catch((e) => console.error('Storage bucket check failed:', e.message));

app.listen(env.port, () => {
  console.log(`Backend server running on port ${env.port}`);
  // Load content and open the database connection now, so the first visitor after a (re)start is not the one who waits.
  getPublicPayload().catch((e) => console.error('Content warm-up failed:', e.message));
});
