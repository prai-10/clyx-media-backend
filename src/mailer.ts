import { env } from './env.js';

// Email goes out through Resend's HTTPS API: Render's free plan blocks outbound SMTP ports.
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const RESUME_TYPES = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const;

/** Detects PDF / DOC / DOCX from the file's first bytes, ignoring the client-supplied mime type. */
export function sniffResumeType(buf: Buffer, fileName: string): keyof typeof RESUME_TYPES | null {
  if (buf.length < 8) return null;
  if (buf.subarray(0, 5).toString('ascii') === '%PDF-') return 'pdf';
  if (buf.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) return 'doc';
  // DOCX is a zip; only accept it when the name says so, so arbitrary archives are refused.
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04 && /\.docx$/i.test(fileName)) return 'docx';
  return null;
}

export const resumeMimeType = (ext: keyof typeof RESUME_TYPES) => RESUME_TYPES[ext];

export const mailerReady = () => Boolean(env.resendApiKey);

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

export type Application = { name: string; email: string; phone?: string; role: string; note?: string };

export async function sendApplicationEmail(app: Application, resume: { buffer: Buffer; ext: keyof typeof RESUME_TYPES }) {
  const safeName = app.name.replace(/[^\p{L}\p{N} _-]/gu, '').trim().replace(/\s+/g, '-') || 'candidate';
  const rows: [string, string][] = [
    ['Name', app.name],
    ['Email', app.email],
    ['Phone', app.phone || '—'],
    ['Role', app.role],
  ];
  if (app.note) rows.push(['Note', app.note]);

  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#101010">
  <h2 style="margin:0 0 16px;color:#013AA3">New application: ${escapeHtml(app.role)}</h2>
  <table cellpadding="8" style="border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="color:#666;vertical-align:top">${k}</td><td style="white-space:pre-wrap">${escapeHtml(v)}</td></tr>`)
    .join('')}</table>
  <p style="color:#666;margin-top:16px">Resume attached. Reply to this email to reach the candidate.</p>
</div>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + '\n\nResume attached.';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.mailFrom,
      to: [env.careersTo],
      reply_to: app.email,
      subject: `Application: ${app.role} — ${app.name}`,
      html,
      text,
      attachments: [{ filename: `Resume-${safeName}.${resume.ext}`, content: resume.buffer.toString('base64') }],
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

export type Enquiry = { name: string; email: string; company?: string; message: string };

export async function sendContactEmail(q: Enquiry) {
  const rows: [string, string][] = [
    ['Name', q.name],
    ['Email', q.email],
    ['Company', q.company || '—'],
    ['Message', q.message],
  ];

  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#101010">
  <h2 style="margin:0 0 16px;color:#013AA3">New enquiry from ${escapeHtml(q.name)}</h2>
  <table cellpadding="8" style="border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="color:#666;vertical-align:top">${k}</td><td style="white-space:pre-wrap">${escapeHtml(v)}</td></tr>`)
    .join('')}</table>
  <p style="color:#666;margin-top:16px">Sent from the contact form on clyxmedia.com. Reply to this email to reach them.</p>
</div>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.contactFrom,
      to: [env.contactTo],
      reply_to: q.email,
      subject: `Enquiry: ${q.name}${q.company ? ` (${q.company})` : ''}`,
      html,
      text,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

// Newsletter: the subscriber gets a welcome email, the team gets the address. Nothing is stored,
// so the team inbox is the subscriber list.
export async function sendNewsletterEmails(email: string) {
  const send = async (payload: Record<string, unknown>) => {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.newsletterFrom, ...payload }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  };

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#101010;max-width:560px">
  <h2 style="margin:0 0 16px;color:#013AA3">You're subscribed</h2>
  <p>Thanks for signing up to the CLYX Media newsletter.</p>
  <p>Once a month we'll send you actionable breakdowns of whitelisted creator campaigns, Meta ad teardowns and creative frameworks that scale. No fluff.</p>
  <p>If you didn't sign up, just reply to this email and we'll take you off the list.</p>
  <p style="margin-top:24px">— Team CLYX Media<br><a href="https://clyxmedia.com" style="color:#013AA3">clyxmedia.com</a></p>
</div>`;
  const text = [
    "You're subscribed",
    '',
    'Thanks for signing up to the CLYX Media newsletter.',
    "Once a month we'll send you actionable breakdowns of whitelisted creator campaigns, Meta ad teardowns and creative frameworks that scale. No fluff.",
    "If you didn't sign up, just reply to this email and we'll take you off the list.",
    '',
    '— Team CLYX Media',
    'https://clyxmedia.com',
  ].join('\n');

  // The welcome email is what the visitor sees, so it decides success; the team copy is best effort.
  await send({ to: [email], reply_to: env.contactTo, subject: "You're subscribed to the CLYX Media newsletter", html, text });
  await send({
    to: [env.contactTo],
    subject: `Newsletter signup: ${email}`,
    text: `${email} subscribed to the newsletter on clyxmedia.com.`,
  }).catch((e) => console.error('newsletter team notice failed', e));
}
