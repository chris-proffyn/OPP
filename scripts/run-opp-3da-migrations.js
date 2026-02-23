/**
 * One-off: run level_averages migrations (create + populate) via direct Postgres.
 * Requires: SUPABASE_DB_PASSWORD and SUPABASE_URL (or VITE_SUPABASE_URL) in env or .env.
 * Usage: node scripts/run-opp-3da-migrations.js
 */
/* eslint-disable @typescript-eslint/no-var-requires */
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

// Load .env if present
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  const env = readFileSync(envPath, 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const password = process.env.SUPABASE_DB_PASSWORD;
if (!url || !password) {
  console.error('Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_DB_PASSWORD in the environment.');
  process.exit(1);
}
const match = url.match(/https?:\/\/([^.]+)/);
const projectRef = match ? match[1] : '';
if (!projectRef) {
  console.error('Could not parse project ref from', url);
  process.exit(1);
}
const dbUrl = `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`;

async function main() {
  const pg = await import('pg');
  const client = new pg.default.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const dir = join(process.cwd(), 'supabase', 'migrations');
    const files = [
      '20260229120000_create_opp_3_dart_average.sql',  // creates level_averages
      '20260229130000_populate_opp_3_dart_average.sql',  // populates level_averages
    ];
    for (const file of files) {
      const sql = readFileSync(join(dir, file), 'utf8');
      console.log('Running', file, '...');
      await client.query(sql);
      console.log('OK:', file);
    }
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}
main();
