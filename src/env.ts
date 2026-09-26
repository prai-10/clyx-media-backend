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
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  mailFrom: process.env.MAIL_FROM || 'Clyx Careers <careers@clyxmedia.com>',
  careersTo: process.env.CAREERS_TO_EMAIL || 'HR Clyx <hr@clyxmedia.com>',
  corsOrigins: (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),
};

if (env.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}
