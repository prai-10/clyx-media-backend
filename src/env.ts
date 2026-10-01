import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  databaseUrl: required('DATABASE_URL'),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  supabaseBucket: process.env.SUPABASE_BUCKET || 'site-images',
  adminUsername: required('ADMIN_USERNAME'),
  adminPassword: required('ADMIN_PASSWORD'),
  jwtSecret: required('JWT_SECRET'),
  port: Number(process.env.PORT) || 3000,
  // Careers applications. Without RESEND_API_KEY the apply form reports that applications are closed.
  // MAIL_FROM sends the application to CAREERS_TO_EMAIL; the candidate's confirmation is sent from CAREERS_TO_EMAIL.
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  mailFrom: process.env.MAIL_FROM || 'Clyx Careers <careers@clyxmedia.com>',
  careersTo: process.env.CAREERS_TO_EMAIL || 'CLYX Media Careers <hr@clyxmedia.com>',
  // Contact form and newsletter (same Resend key). CONTACT_FROM sends the team notices to CONTACT_TO_EMAIL;
  // the visitor's acknowledgement / welcome email is sent from CONTACT_TO_EMAIL.
  contactFrom: process.env.CONTACT_FROM || 'Clyx Website <website@clyxmedia.com>',
  contactTo: process.env.CONTACT_TO_EMAIL || 'CLYX Media <work@clyxmedia.com>',
  corsOrigins: (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),
};

if (env.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}
