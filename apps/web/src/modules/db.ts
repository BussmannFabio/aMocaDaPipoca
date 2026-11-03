import { Pool, type PoolClient } from 'pg';
const globalDb = globalThis as unknown as { pipocaPool?: Pool };
export function db() {
  if (!process.env.DATABASE_URL) throw new Error('Banco não configurado. Execute pnpm dev na raiz.');
  return globalDb.pipocaPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 25, connectionTimeoutMillis: 5000 });
}
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db().connect();
  try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
export async function asUser<T>(userId: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  return transaction(async client => { await client.query('SET LOCAL ROLE pipoca_app'); await client.query("SELECT set_config('app.user_id',$1,true)", [userId]); return fn(client); });
}
export async function asPublic<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  return transaction(async client => { await client.query('SET LOCAL ROLE pipoca_public'); return fn(client); });
}
export async function dateLock(client: PoolClient, date: string) {
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended('date:' || $1,0))", [date]);
}
