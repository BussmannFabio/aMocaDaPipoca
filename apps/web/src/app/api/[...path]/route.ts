import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { randomUUID } from 'node:crypto';
import { validateConfig } from '@/modules/config';
import { actor, requireActor, register, login, logout, forgotPassword, resetPassword, throttle } from '@/modules/identity/auth';
import { settings, calendar, catalog, saveProduct, saveSchedule, dateSchema } from '@/modules/catalog/catalog';
import { reserve, expireReservations } from '@/modules/checkout/checkout';
import { listOrders, orderDetail, requestCancellation, decideCancellation, advanceOrder, resolveFakeRefund } from '@/modules/orders/orders';
import { applyVerifiedPayment } from '@/modules/payments/payments';
import { asUser, db, transaction } from '@/modules/db';
import { BusinessError } from '@/modules/domain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path: string[] }> };
function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } }); }
async function handle(request: NextRequest, context: Context) {
  try {
    const config = validateConfig(process.env);
    const parts = (await context.params).path;
    const path = parts.join('/');
    const method = request.method;
    let data: any = {};
    if (method !== 'GET') {
      if (request.headers.get('origin') !== config.appUrl) throw new BusinessError('Origem da solicitação não permitida.', 403);
      if (!request.headers.get('content-type')?.includes('application/json')) throw new BusinessError('Envie os dados como JSON.', 415);
      const raw = await request.text();
      if (raw.length > 65536) throw new BusinessError('Solicitação muito grande.', 413);
      try { data = JSON.parse(raw); } catch { throw new BusinessError('Dados inválidos.'); }
    }
    if (method === 'GET') {
      if (path === 'health') { await db().query('SELECT 1'); return json({ status: 'ok', payments: config.paymentsMode, environment: config.appEnv }); }
      if (path === 'bootstrap') return json({ user: await actor(), settings: await settings(), mode: config.paymentsMode, environment: config.appEnv });
      if (path === 'calendar') { await expireReservations(); return json(await calendar(await actor())); }
      if (path === 'catalog') { await expireReservations(); return json(await catalog(await actor(), request.nextUrl.searchParams.get('date') || '')); }
      const user = await requireActor(parts[0] === 'admin');
      if (path === 'orders') return json({ orders: await listOrders(user) });
      if (parts[0] === 'orders' && parts.length === 2) return json(await orderDetail(user, parts[1]));
      if (path === 'admin') {
        await expireReservations();
        const content = await asUser(user.id, async client => ({
          products: (await client.query('SELECT * FROM products ORDER BY created_at,name')).rows,
          dates: (await client.query("SELECT d.*,d.date::text AS date FROM business_dates d WHERE d.date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date ORDER BY d.date LIMIT 120")).rows,
          offers: (await client.query("SELECT f.*,f.date::text AS date FROM date_offers f WHERE f.date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date ORDER BY f.date")).rows,
          slots: (await client.query("SELECT s.*,s.date::text AS date FROM pickup_slots s WHERE s.date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date ORDER BY s.date,s.label")).rows,
          customers: (await client.query("SELECT id,name,email,phone FROM users WHERE role='customer' ORDER BY name LIMIT 500")).rows,
          exceptions: (await client.query('SELECT *,date::text FROM lead_time_exceptions')).rows,
          financialExceptions: (await client.query("SELECT f.*,o.number,p.status AS payment_status FROM financial_exceptions f JOIN orders o ON o.id=f.order_id JOIN payment_attempts p ON p.id=f.payment_id ORDER BY f.created_at DESC LIMIT 100")).rows
        }));
        return json({ ...content, orders: await listOrders(user), settings: await settings() });
      }
      throw new BusinessError('Página não encontrada.', 404);
    }
    if (path === 'auth/register') { await throttle(`register:${String(data.email).toLowerCase()}`, 5); await register(data); return json({ ok: true }, 201); }
    if (path === 'auth/login') { await login(data); return json({ ok: true }); }
    if (path === 'auth/logout') { await logout(); return json({ ok: true }); }
    if (path === 'auth/forgot') { await forgotPassword(data); return json({ message: 'Se o e-mail estiver cadastrado, enviamos um link para redefinir sua senha.' }); }
    if (path === 'auth/reset') { await resetPassword(data); return json({ ok: true }); }
    const user = await requireActor(parts[0] === 'admin');
    if (path === 'profile') {
      const profile = z.object({ name: z.string().trim().min(3).max(100), phone: z.string().regex(/^\d{10,13}$/) }).parse(data);
      await asUser(user.id, client => client.query('UPDATE users SET name=$1,phone=$2 WHERE id=$3', [profile.name, profile.phone, user.id]));
      return json({ ok: true });
    }
    if (path === 'checkout') return json(await reserve(user, data), 201);
    if (parts[0] === 'orders' && parts[2] === 'cancel' && parts.length === 3) { await requestCancellation(user, parts[1], data); return json({ ok: true }); }
    if (parts[0] === 'simulator' && parts.length === 2) {
      if (config.paymentsMode !== 'fake' || !['local', 'test'].includes(config.appEnv)) throw new BusinessError('Simulador indisponível neste ambiente.', 404);
      const order = await orderDetail(user, parts[1]);
      const status = z.enum(['approved', 'rejected', 'pending']).parse(data.status);
      return json(await applyVerifiedPayment({ eventId: `fake:${order.payment.id}:${status}:${data.eventId ? z.uuid().parse(data.eventId) : randomUUID()}`, paymentId: order.payment.id, orderId: order.id, amountCents: order.total_cents, currency: 'BRL', status, provider: 'fake' }));
    }
    if (path === 'admin/products') return json(await saveProduct(user, data));
    if (path === 'admin/schedule') { await saveSchedule(user, data); return json({ ok: true }); }
    if (path === 'admin/settings') {
      const value = z.object({ name: z.string().trim().min(3).max(100), whatsapp: z.string().regex(/^(\d{10,15})?$/), pickup_address: z.string().trim().min(5).max(300), lead_days: z.number().int().min(0).max(365) }).parse(data);
      await asUser(user.id, client => client.query('UPDATE store_settings SET name=$1,whatsapp=$2,pickup_address=$3,lead_days=$4 WHERE id=true', [value.name, value.whatsapp, value.pickup_address, value.lead_days]));
      return json({ ok: true });
    }
    if (path === 'admin/exception') {
      const value = z.object({ user_id: z.uuid(), date: dateSchema, reason: z.string().trim().min(5).max(300), revoked: z.boolean().default(false) }).parse(data);
      await transaction(async client => {
        await client.query('INSERT INTO lead_time_exceptions(user_id,date,reason,created_by,revoked) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,date) DO UPDATE SET reason=$3,created_by=$4,revoked=$5', [value.user_id, value.date, value.reason, user.id, value.revoked]);
        await client.query('INSERT INTO audit_log(actor_id,action,details) VALUES($1,$2,$3)', [user.id, value.revoked ? 'Exceção revogada' : 'Exceção de antecedência autorizada', JSON.stringify({ user_id: value.user_id, date: value.date, reason: value.reason })]);
      });
      return json({ ok: true });
    }
    if (parts[0] === 'admin' && parts[1] === 'cancellations' && parts.length === 3) { await decideCancellation(user, parts[2], data); return json({ ok: true }); }
    if (parts[0] === 'admin' && parts[1] === 'orders' && parts.length === 3) { await advanceOrder(user, parts[2], data); return json({ ok: true }); }
    if (parts[0] === 'admin' && parts[1] === 'refunds' && parts.length === 3) { await resolveFakeRefund(user, parts[2], z.boolean().parse(data.success)); return json({ ok: true }); }
    throw new BusinessError('Operação não encontrada.', 404);
  } catch (error: any) {
    if (error instanceof BusinessError) return json({ error: error.message }, error.status);
    if (error instanceof ZodError) return json({ error: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).slice(0, 3).join(' · ') }, 400);
    if (error.code === '22P02' || error.code === '23514') return json({ error: 'Dados inválidos. Confira quantidades, horários e opções.' }, 400);
    if (error.code === '23503') return json({ error: 'Confira se o cliente, produto ou data estão cadastrados.' }, 400);
    console.error(JSON.stringify({ event: 'request_error', code: error.code || 'internal', route: request.nextUrl.pathname }));
    return json({ error: 'Não foi possível concluir agora. Tente novamente.' }, 500);
  }
}
export const GET = handle;
export const POST = handle;
