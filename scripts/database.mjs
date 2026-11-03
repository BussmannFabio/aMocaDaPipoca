import EmbeddedPostgres from 'embedded-postgres';
import { Pool } from 'pg';
import { randomBytes, scryptSync } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import dotenv from 'dotenv';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localDir = path.join(root, '.local');
const environmentFile = path.join(root, '.env.local');
mkdirSync(localDir, { recursive: true });
if (!existsSync(environmentFile)) {
  const password = randomBytes(24).toString('hex');
  writeFileSync(environmentFile, `APP_ENV=local\nAPP_URL=http://127.0.0.1:3000\nDATABASE_URL=postgres://postgres:${password}@127.0.0.1:55432/pipoca\nPAYMENTS_MODE=fake\nJOBS_SECRET=${randomBytes(32).toString('hex')}\n`);
}
dotenv.config({ path: environmentFile, quiet: true });

export function assertLocal(urlString = process.env.DATABASE_URL) {
  const url = new URL(urlString);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || !['pipoca', 'pipoca_test'].includes(url.pathname.slice(1))) throw new Error('Operação permitida somente no banco LOCAL pipoca/pipoca_test.');
  return url;
}

export async function migrate(connectionString) {
  const pool = new Pool({ connectionString });
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    for (const name of readdirSync(path.join(root, 'supabase/migrations')).filter(n => n.endsWith('.sql')).sort()) {
      if ((await pool.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name])).rowCount) continue;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(readFileSync(path.join(root, 'supabase/migrations', name), 'utf8'));
        await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    }
  } finally { await pool.end(); }
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export async function seed(connectionString) {
  assertLocal(connectionString);
  const pool = new Pool({ connectionString });
  try {
    for (const [id, name, email, role] of [
      ['10000000-0000-4000-8000-000000000001', 'Admin da Loja', 'admin@pipoca.local', 'admin'],
      ['10000000-0000-4000-8000-000000000002', 'Ana de Oliveira', 'cliente@pipoca.local', 'customer'],
      ['10000000-0000-4000-8000-000000000003', 'Bruno Santos', 'outro@pipoca.local', 'customer']
    ]) await pool.query('INSERT INTO users(id,name,email,phone,password_hash,role) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(email) DO NOTHING', [id, name, email, '11999990000', hashPassword('Pipoca@123'), role]);
    await pool.query(readFileSync(path.join(root, 'supabase/seed.sql'), 'utf8'));
  } finally { await pool.end(); }
}

export async function ensureDatabase() {
  const url = assertLocal();
  const probe = new Pool({ connectionString: url.href, connectionTimeoutMillis: 1500 });
  try { await probe.query('SELECT 1'); await probe.end(); return { owned: false, stop: async () => {} }; } catch { await probe.end(); }
  const server = new EmbeddedPostgres({ databaseDir: path.join(localDir, 'postgres'), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), port: Number(url.port), persistent: true, createPostgresUser: false, autoRehydrateSymlinks: true, initdbFlags: ['--encoding=UTF8', '--locale=C'], postgresFlags: ['-h', '127.0.0.1'], onLog: () => {}, onError: message => { if (String(message).includes('FATAL')) console.error('PostgreSQL:', String(message)); } });
  if (!existsSync(path.join(localDir, 'postgres/PG_VERSION'))) await server.initialise();
  await server.start();
  const admin = new Pool({ connectionString: new URL('/postgres', url).href });
  try {
    if (!(await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', ['pipoca'])).rowCount) await admin.query('CREATE DATABASE pipoca');
  } finally { await admin.end(); }
  await migrate(url.href);
  await seed(url.href);
  return { owned: true, stop: () => server.stop() };
}

export async function prepareTestDatabase() {
  const base = assertLocal();
  const admin = new Pool({ connectionString: new URL('/postgres', base).href });
  try {
    if (!(await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', ['pipoca_test'])).rowCount) await admin.query('CREATE DATABASE pipoca_test');
  } finally { await admin.end(); }
  const testUrl = new URL('/pipoca_test', base).href;
  const pool = new Pool({ connectionString: testUrl });
  try { await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public'); } finally { await pool.end(); }
  await migrate(testUrl);
  await seed(testUrl);
  return testUrl;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const command = process.argv[2] || 'start';
  if (command === 'stop') {
    assertLocal();
    const embeddedRequire = createRequire(createRequire(import.meta.url).resolve('embedded-postgres'));
    const platform = process.platform === 'win32' ? 'windows' : process.platform;
    const binaries = await import(pathToFileURL(embeddedRequire.resolve(`@embedded-postgres/${platform}-${process.arch}`)).href);
    await promisify(execFile)(binaries.pg_ctl, ['-D', path.join(localDir, 'postgres'), '-m', 'fast', '-w', 'stop'], { windowsHide: true });
    console.log('PostgreSQL do projeto encerrado de forma segura; dados preservados.');
  } else {
    const server = await ensureDatabase();
    if (command === 'reset') {
      assertLocal();
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      try { await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public'); } finally { await pool.end(); }
      await migrate(process.env.DATABASE_URL); await seed(process.env.DATABASE_URL);
      console.log('Banco local reconstruído com dados sintéticos.');
    } else if (command === 'migrate') { await migrate(process.env.DATABASE_URL); console.log('Migrations aplicadas no banco local.'); }
    else console.log('PostgreSQL pronto em 127.0.0.1:55432. Banco persistente em .local/postgres.');
    if (server.owned) {
      process.on('SIGINT', async () => { await server.stop(); process.exit(); });
      process.on('SIGTERM', async () => { await server.stop(); process.exit(); });
    }
  }
}
