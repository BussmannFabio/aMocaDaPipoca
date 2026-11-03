import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import { db } from '../apps/web/src/modules/db';
import { reserve } from '../apps/web/src/modules/checkout/checkout';
import { applyVerifiedPayment } from '../apps/web/src/modules/payments/payments';
import { advanceOrder } from '../apps/web/src/modules/orders/orders';
import { todaySP, addDays } from '../apps/web/src/modules/domain';
import type { Actor } from '../apps/web/src/modules/identity/auth';
dotenv.config({ path: '.env.local', quiet: true });
if (process.env.APP_ENV !== 'local' || process.env.PAYMENTS_MODE !== 'fake') throw new Error('Pedidos de demonstração somente em ambiente local/fake.');
const url = new URL(process.env.DATABASE_URL!);
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/pipoca') throw new Error('Banco de demonstração inválido.');
const customer = (await db().query("SELECT id,name,email,phone,role FROM users WHERE email='cliente@pipoca.local'")).rows[0] as Actor;
const admin = (await db().query("SELECT id,name,email,phone,role FROM users WHERE email='admin@pipoca.local'")).rows[0] as Actor;
for (const [i, target] of ['in_production', 'ready', 'pending_payment'].entries()) {
  const day = (await db().query("SELECT d.date::text FROM business_dates d JOIN date_offers f ON f.date=d.date JOIN products p ON p.id=f.product_id WHERE d.is_open AND d.date >= $1 AND p.name='Pipoca gourmet' AND f.capacity-f.reserved-f.confirmed>=2 ORDER BY d.date LIMIT 1", [addDays(todaySP(), 17 + i)])).rows[0];
  if (!day) continue;
  const slot = (await db().query('SELECT id FROM pickup_slots WHERE date=$1 AND enabled AND capacity>reserved+confirmed ORDER BY label LIMIT 1', [day.date])).rows[0];
  const product = (await db().query("SELECT id,version FROM products WHERE name='Pipoca gourmet' AND active")).rows[0];
  const result = await reserve(customer, { date: day.date, slotId: slot.id, checkoutKey: `demo-${target}-${day.date}`, method: target === 'pending_payment' ? 'card' : 'pix', items: [{ productId: product.id, version: product.version, quantity: 2, flavors: { 'Caramelo flor de sal': 1, 'Chocolate belga': 1 }, addons: [], fields: {}, notes: 'Encomenda fictícia para explorar a operação local.' }] });
  const order = (await db().query('SELECT * FROM orders WHERE id=$1', [result.id])).rows[0];
  if (order.state === 'pending_payment' && target !== 'pending_payment') {
    const payment = (await db().query('SELECT * FROM payment_attempts WHERE order_id=$1', [result.id])).rows[0];
    await applyVerifiedPayment({ eventId: `demo:${randomUUID()}`, paymentId: payment.id, orderId: result.id, amountCents: payment.amount_cents, currency: 'BRL', status: 'approved', provider: 'fake' });
    await advanceOrder(admin, result.id, { state: 'in_production' });
    if (target === 'ready') await advanceOrder(admin, result.id, { state: 'ready' });
  }
  console.log(`Pedido demonstrativo #${order.number}: ${target}`);
}
await db().end();
