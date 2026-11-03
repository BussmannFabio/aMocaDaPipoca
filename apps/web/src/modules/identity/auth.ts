import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { db, transaction } from '../db';
import { BusinessError } from '../domain';

export type Actor = { id: string; name: string; email: string; phone: string; role: 'customer' | 'admin' };
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export function passwordHash(password: string) { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; }
function passwordMatches(password: string, hash: string) { const [salt, expected] = hash.split(':'); const actual = scryptSync(password, salt, 64); const decoded = Buffer.from(expected, 'hex'); return decoded.length === actual.length && timingSafeEqual(decoded, actual); }
const registration = z.object({ name: z.string().trim().min(3).max(100), email: z.email().max(180).transform(v => v.toLowerCase().trim()), phone: z.string().regex(/^\d{10,13}$/), password: z.string().min(10).max(128) });

export async function actor(): Promise<Actor | null> {
  const token = (await cookies()).get('pipoca_session')?.value;
  if (!token) return null;
  const result = await db().query('SELECT u.id,u.name,u.email,u.phone,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()', [digest(token)]);
  return result.rows[0] || null;
}
export async function requireActor(admin = false) { const user = await actor(); if (!user) throw new BusinessError('Entre na sua conta para continuar.', 401); if (admin && user.role !== 'admin') throw new BusinessError('Acesso restrito à administração.', 403); return user; }
async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  await db().query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')", [digest(token), userId]);
  (await cookies()).set('pipoca_session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.APP_ENV === 'production', path: '/', maxAge: 7 * 86400 });
}
export async function register(input: unknown) {
  const data = registration.parse(input);
  const result = await db().query('INSERT INTO users(name,email,phone,password_hash) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO NOTHING RETURNING id', [data.name, data.email, data.phone, passwordHash(data.password)]);
  if (!result.rowCount) throw new BusinessError('Este e-mail já está cadastrado. Entre ou recupere sua senha.', 409);
  await createSession(result.rows[0].id);
}
export async function throttle(key: string, maximum = 10) {
  const result = await db().query("INSERT INTO auth_attempts(key,attempts) VALUES($1,1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_attempts.window_start < now()-interval '15 minutes' THEN 1 ELSE auth_attempts.attempts+1 END,window_start=CASE WHEN auth_attempts.window_start < now()-interval '15 minutes' THEN now() ELSE auth_attempts.window_start END RETURNING attempts", [digest(key)]);
  if (result.rows[0].attempts > maximum) throw new BusinessError('Muitas tentativas. Aguarde 15 minutos e tente novamente.', 429);
}
export async function login(input: unknown) {
  const data = z.object({ email: z.email().transform(v => v.toLowerCase().trim()), password: z.string().min(1).max(128) }).parse(input);
  await throttle(`login:${data.email}`);
  const result = await db().query('SELECT id,password_hash FROM users WHERE email=$1', [data.email]);
  const user = result.rows[0];
  const hash = user?.password_hash || '00000000000000000000000000000000:' + '00'.repeat(64);
  if (!passwordMatches(data.password, hash) || !user) throw new BusinessError('E-mail ou senha incorretos.', 401);
  await createSession(user.id);
}
export async function logout() { const cookieStore = await cookies(); const token = cookieStore.get('pipoca_session')?.value; if (token) await db().query('DELETE FROM sessions WHERE token_hash=$1', [digest(token)]); cookieStore.delete('pipoca_session'); }
export async function forgotPassword(input: unknown) {
  const { email } = z.object({ email: z.email().transform(v => v.toLowerCase().trim()) }).parse(input);
  await throttle(`recovery:${email}`, 5);
  if (process.env.APP_ENV !== 'local' && process.env.APP_ENV !== 'test') throw new BusinessError('Configure o provedor de e-mail antes de habilitar recuperação neste ambiente.', 503);
  const user = (await db().query('SELECT id FROM users WHERE email=$1', [email])).rows[0];
  if (user) {
    const token = randomBytes(32).toString('base64url');
    await transaction(async client => {
      await client.query('DELETE FROM password_resets WHERE user_id=$1', [user.id]);
      await client.query("INSERT INTO password_resets(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 minutes')", [digest(token), user.id]);
      await client.query('INSERT INTO local_mailbox(recipient,subject,reset_url) VALUES($1,$2,$3)', [email, 'Redefina sua senha · A Moça da Pipoca', `${process.env.APP_URL}/redefinir?token=${token}`]);
    });
  }
}
export async function resetPassword(input: unknown) {
  const data = z.object({ token: z.string().min(30).max(100), password: z.string().min(10).max(128) }).parse(input);
  await transaction(async client => {
    const result = await client.query('SELECT * FROM password_resets WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE', [digest(data.token)]);
    if (!result.rowCount) throw new BusinessError('Link inválido ou expirado. Solicite outro link.');
    await client.query('UPDATE users SET password_hash=$1 WHERE id=$2', [passwordHash(data.password), result.rows[0].user_id]);
    await client.query('UPDATE password_resets SET used_at=now() WHERE token_hash=$1', [digest(data.token)]);
    await client.query('DELETE FROM sessions WHERE user_id=$1', [result.rows[0].user_id]);
  });
}
