import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../env.js';
import * as schema from './schema.js';

// Supabase's pooler terminates TLS with its own chain, so certificate verification is relaxed
// for the pooled connection only. Traffic is still encrypted.
export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
});

// The pooler drops idle connections (ECONNRESET). Without this listener Node treats the pool's
// 'error' event as unhandled and the whole server crashes; with it the dead client is discarded.
pool.on('error', (err) => {
  console.error('Idle database connection dropped:', err.message);
});

export const db = drizzle(pool, { schema });
