// One-time setup: applies migrations, makes sure the storage bucket exists, seeds launch content.
// Usage: npm run db:setup            (safe to re-run; never overwrites existing content)
//        npm run db:setup -- --reseed (WIPES all content and re-seeds)
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { seedIfEmpty } from '../src/content.js';
import { db, pool } from '../src/db/client.js';
import { ensureBucket } from '../src/storage.js';

try {
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations applied.');

  console.log(`Storage bucket: ${await ensureBucket()}`);

  const result = await seedIfEmpty({ force: process.argv.includes('--reseed') });
  console.log(result.seeded ? 'Seeded launch content.' : 'Content already present, seed skipped.');
} finally {
  await pool.end();
}
