import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });
if (process.env.APP_ENV !== 'local') throw new Error('Caixa de e-mail disponível somente no ambiente local.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const result = await pool.query('SELECT recipient,subject,reset_url,created_at FROM local_mailbox ORDER BY created_at DESC LIMIT 5');
for (const message of result.rows) console.log(`${message.recipient}\n${message.subject}\n${message.reset_url}\n`);
await pool.end();
