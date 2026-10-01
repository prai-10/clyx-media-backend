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

async function sendMail(payload: Record<string, unknown>) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'there';

/** Short note to a visitor: plain-text paragraphs in, matching html + text out. */
function visitorNote(paragraphs: string[]) {
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#101010;max-width:560px">
${paragraphs.map((p) => `  <p>${escapeHtml(p)}</p>`).join('\n')}
  <p style="margin-top:24px">— Team CLYX Media<br><a href="https://clyxmedia.com" style="color:#013AA3">clyxmedia.com</a></p>
</div>`;
  const text = [...paragraphs, '— Team CLYX Media\nhttps://clyxmedia.com'].join('\n\n');
  return { html, text };
}

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

  await sendMail({
    from: env.mailFrom,
    to: [env.careersTo],
    reply_to: app.email,
    subject: `Application: ${app.role} — ${app.name}`,
    html,
    text,
    attachments: [{ filename: `Resume-${safeName}.${resume.ext}`, content: resume.buffer.toString('base64') }],
  });

  // Confirmation to the candidate comes from the HR inbox itself, so their reply lands there.
  // HR already has the application, so a failure here must not fail the request.
  await sendMail({
    from: env.careersTo,
    to: [app.email],
    reply_to: env.careersTo,
    subject: `We received your application for ${app.role}`,
    ...visitorNote([
      `Hi ${firstName(app.name)},`,
      `Thanks for applying for the ${app.role} role at CLYX Media. We have your details and resume.`,
      'Our team reviews every application. If your profile is a fit, we will get in touch on this email address.',
      'If you have anything to add, just reply to this email.',
    ]),
  }).catch((e) => console.error('candidate confirmation failed', e));
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

  await sendMail({
    from: env.contactFrom,
    to: [env.contactTo],
    reply_to: q.email,
    subject: `Enquiry: ${q.name}${q.company ? ` (${q.company})` : ''}`,
    html,
    text,
  });

  // Acknowledgement to the visitor comes from the team inbox, so their reply lands there.
  await sendMail({
    from: env.contactTo,
    to: [q.email],
    reply_to: env.contactTo,
    subject: 'We got your message — CLYX Media',
    ...visitorNote([
      `Hi ${firstName(q.name)},`,
      'Thanks for reaching out to CLYX Media. Your message is with our founders and we will get back to you soon.',
      'If you want to add context, such as your ad spend, goals or timelines, just reply to this email.',
    ]),
  }).catch((e) => console.error('enquiry acknowledgement failed', e));
}

// Newsletter: the subscriber gets a welcome email from the team inbox, the team gets the address. Nothing is stored,
// so the team inbox is the subscriber list.
export async function sendNewsletterEmails(email: string) {
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
  await sendMail({ from: env.contactTo, to: [email], reply_to: env.contactTo, subject: "You're subscribed to the CLYX Media newsletter", html, text });
  await sendMail({
    from: env.contactFrom,
    to: [env.contactTo],
    reply_to: email,
    subject: `Newsletter signup: ${email}`,
    text: `${email} subscribed to the newsletter on clyxmedia.com.`,
  }).catch((e) => console.error('newsletter team notice failed', e));
}
