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
