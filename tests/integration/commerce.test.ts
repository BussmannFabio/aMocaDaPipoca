import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prepareTestDatabase } from '../../scripts/database.mjs';
import { db, asPublic, asUser } from '../../apps/web/src/modules/db.ts';
import { reserve, expireReservations } from '../../apps/web/src/modules/checkout/checkout.ts';
import { applyVerifiedPayment } from '../../apps/web/src/modules/payments/payments.ts';
import { listOrders, orderDetail, requestCancellation, decideCancellation, advanceOrder, resolveFakeRefund } from '../../apps/web/src/modules/orders/orders.ts';
import { saveSchedule, catalog, calendar } from '../../apps/web/src/modules/catalog/catalog.ts';
import { addDays, todaySP } from '../../apps/web/src/modules/domain.ts';
import type { Actor } from '../../apps/web/src/modules/identity/auth.ts';

const admin: Actor = { id: '10000000-0000-4000-8000-000000000001', name: 'Admin', email: 'admin@pipoca.local', phone: '11999990000', role: 'admin' };
const customer: Actor = { ...admin, id: '10000000-0000-4000-8000-000000000002', name: 'Ana', email: 'cliente@pipoca.local', role: 'customer' };
const other: Actor = { ...customer, id: '10000000-0000-4000-8000-000000000003', name: 'Bruno', email: 'outro@pipoca.local' };
const productId = '20000000-0000-4000-8000-000000000001';
let dateOffset = 150;
before(async () => { process.env.DATABASE_URL = await prepareTestDatabase(); process.env.APP_ENV = 'test'; process.env.PAYMENTS_MODE = 'fake'; });
after(async () => { await db().end(); });
async function setup(capacity = 10, slotCapacity = 10) {
  const date = addDays(todaySP(), dateOffset++);
  await saveSchedule(admin, { date, is_open: true, offers: [{ product_id: productId, capacity, enabled: true }], slots: [{ label: '10:00 às 12:00', capacity: slotCapacity, enabled: true }] });
  const slot = (await db().query('SELECT id FROM pickup_slots WHERE date=$1', [date])).rows[0];
  return { date, slotId: slot.id, method: 'pix', checkoutKey: randomUUID(), items: [{ productId, quantity: 1, version: 1, flavors: { 'Caramelo flor de sal': 1 }, addons: [], fields: {}, notes: '' }] };
}
async function event(orderId: string, status: 'approved' | 'rejected' | 'pending' = 'approved', eventId = randomUUID()) {
  const p = (await db().query('SELECT * FROM payment_attempts WHERE order_id=$1', [orderId])).rows[0];
  return { eventId, paymentId: p.id, orderId, amountCents: p.amount_cents, currency: 'BRL', status, provider: 'fake' as const };
}
async function balances(input: any) { return (await db().query('SELECT capacity,reserved,confirmed FROM date_offers WHERE date=$1 AND product_id=$2', [input.date, productId])).rows[0]; }

test('CT-08: vinte requisições disputam última unidade, com conexões reais', async () => {
  const input = await setup(1, 30);
  const results = await Promise.allSettled(Array.from({ length: 20 }, () => reserve(customer, { ...input, checkoutKey: randomUUID() })));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.deepEqual(await balances(input), { capacity: 1, reserved: 1, confirmed: 0 });
});
test('CT-08: último horário permite um pedido mesmo com produto disponível', async () => {
  const input = await setup(30, 1);
  const results = await Promise.allSettled(Array.from({ length: 20 }, () => reserve(customer, { ...input, checkoutKey: randomUUID() })));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
});
test('CT-07/13: idempotência persistida, total forjado e alteração de payload', async () => {
  const input = await setup();
  const [first, second] = await Promise.all([reserve(customer, { ...input, total_cents: 1 }), reserve(customer, input)]);
  assert.equal(first.id, second.id);
  const order = await orderDetail(customer, first.id);
  assert.equal(order.total_cents, 1800);
  await assert.rejects(reserve(customer, { ...input, method: 'card' }), /outra|outro/);
  assert.equal((await db().query('SELECT count(*) FROM payment_attempts WHERE order_id=$1', [first.id])).rows[0].count, '1');
});
test('CT-09: expiração repetida libera uma única vez', async () => {
  const input = await setup(); const order = await reserve(customer, input);
  await db().query("UPDATE reservations SET expires_at=now()-interval '1 second' WHERE order_id=$1", [order.id]);
  await Promise.all([expireReservations(), expireReservations()]);
  assert.deepEqual(await balances(input), { capacity: 10, reserved: 0, confirmed: 0 });
  assert.equal((await orderDetail(customer, order.id)).state, 'expired');
});
test('CT-11: evento duplicado e pendência atrasada não duplicam nem regridem', async () => {
  const input = await setup(); const order = await reserve(customer, input); const approved = await event(order.id);
  await Promise.all([applyVerifiedPayment(approved), applyVerifiedPayment(approved)]);
  await applyVerifiedPayment(await event(order.id, 'pending'));
  assert.deepEqual(await balances(input), { capacity: 10, reserved: 0, confirmed: 1 });
  assert.equal((await orderDetail(customer, order.id)).state, 'confirmed');
});
test('CT-14: RLS e consulta por ID isolam clientes; escrita em pagamento/papel é proibida', async () => {
  const input = await setup(); const order = await reserve(customer, input);
  await assert.rejects(orderDetail(other, order.id), /não encontrado/);
  assert.equal((await listOrders(other)).some(o => o.id === order.id), false);
  assert.equal((await asUser(other.id, c => c.query('SELECT * FROM orders WHERE id=$1', [order.id]))).rowCount, 0);
  assert.equal((await asUser(other.id, c => c.query('SELECT * FROM users WHERE id=$1', [customer.id]))).rowCount, 0);
  await assert.rejects(asUser(customer.id, c => c.query("UPDATE users SET role='admin' WHERE id=$1", [customer.id])), /permission denied/);
  await assert.rejects(asUser(customer.id, c => c.query("UPDATE payment_attempts SET status='approved' WHERE order_id=$1", [order.id])), /permission denied/);
  assert.equal((await orderDetail(admin, order.id)).id, order.id);
});
test('CT-12/21: cancelamento manual e reembolso têm estados separados e liberação única', async () => {
  const input = await setup(); const order = await reserve(customer, input); await applyVerifiedPayment(await event(order.id));
  await requestCancellation(customer, order.id, { reason: 'Mudança na data da comemoração' });
  assert.equal((await balances(input)).confirmed, 1);
  let detail = await orderDetail(admin, order.id);
  const request = detail.cancellations[0];
  await Promise.all([decideCancellation(admin, request.id, { approve: true, note: 'Aprovado no teste' }), decideCancellation(admin, request.id, { approve: true, note: 'Repetição segura' })]);
  assert.equal((await balances(input)).confirmed, 0);
  detail = await orderDetail(admin, order.id); assert.equal(detail.state, 'cancelled'); assert.equal(detail.payment.status, 'refund_pending');
  await resolveFakeRefund(admin, detail.payment.id, false);
  assert.equal((await orderDetail(admin, order.id)).payment.status, 'refund_failed');
  await resolveFakeRefund(admin, detail.payment.id, true);
  assert.equal((await orderDetail(admin, order.id)).payment.status, 'refunded');
});
test('CT-18: aprovação tardia com capacidade readquire; sem capacidade encaminha reembolso', async () => {
  const input = await setup(1, 10); const first = await reserve(customer, input);
  await db().query("UPDATE reservations SET expires_at=now()-interval '1 second' WHERE order_id=$1", [first.id]);
  await expireReservations();
  await applyVerifiedPayment(await event(first.id));
  assert.equal((await orderDetail(customer, first.id)).state, 'confirmed');
  const input2 = await setup(1, 10); const late = await reserve(customer, input2);
  await db().query("UPDATE reservations SET expires_at=now()-interval '1 second' WHERE order_id=$1", [late.id]); await expireReservations();
  await reserve(other, { ...input2, checkoutKey: randomUUID() });
  await applyVerifiedPayment(await event(late.id));
  const detail = await orderDetail(customer, late.id);
  assert.equal(detail.state, 'expired'); assert.equal(detail.payment.status, 'refund_pending');
  assert.deepEqual(await balances(input2), { capacity: 1, reserved: 1, confirmed: 0 });
});
test('CT-19: multi-item sem saldo desfaz todo o carrinho', async () => {
  const input = await setup(); const secondId = '20000000-0000-4000-8000-000000000002';
  await db().query('INSERT INTO date_offers(date,product_id,capacity) VALUES($1,$2,0)', [input.date, secondId]);
  await assert.rejects(reserve(customer, { ...input, items: [...input.items, { ...input.items[0], productId: secondId, flavors: { 'Chocolate ao leite': 1 } }] }), /indisponível/);
  assert.equal((await balances(input)).reserved, 0);
  assert.equal((await db().query('SELECT count(*) FROM orders WHERE date=$1', [input.date])).rows[0].count, '0');
});
test('CT-19: expirar e aprovar ao mesmo tempo conserva a capacidade', async () => {
  const input = await setup(1, 1); const order = await reserve(customer, input);
  await db().query("UPDATE reservations SET expires_at=now()-interval '1 second' WHERE order_id=$1", [order.id]);
  await Promise.all([expireReservations(), applyVerifiedPayment(await event(order.id))]);
  assert.deepEqual(await balances(input), { capacity: 1, reserved: 0, confirmed: 1 });
});
test('CT-04/05/19: exceção não ignora data fechada e capacidade não diminui abaixo do comprometido', async () => {
  const input = await setup(1, 1); await reserve(customer, input);
  await assert.rejects(saveSchedule(admin, { date: input.date, is_open: true, offers: [{ product_id: productId, enabled: true, capacity: 0 }], slots: [] }), /capacidade/);
  await db().query('UPDATE business_dates SET is_open=false WHERE date=$1', [input.date]);
  await db().query('INSERT INTO lead_time_exceptions(user_id,date,reason,created_by) VALUES($1,$2,$3,$4)', [other.id, input.date, 'Exceção de teste', admin.id]);
  await assert.rejects(catalog(other, input.date), /fechada/);
});
test('CT-13: snapshot preservado após edição do produto', async () => {
  const input = await setup(); const order = await reserve(customer, input);
  await db().query('UPDATE products SET price_cents=9900 WHERE id=$1', [productId]);
  const detail = await orderDetail(customer, order.id); assert.equal(detail.total_cents, 1800); assert.equal(detail.snapshot.items[0].unitCents, 1800);
  await db().query('UPDATE products SET price_cents=1800 WHERE id=$1', [productId]);
});
test('CT-20: divergência de valor não altera pagamento', async () => {
  const input = await setup(); const order = await reserve(customer, input);
  const payment = await event(order.id);
  await assert.rejects(applyVerifiedPayment({ ...payment, amountCents: 1 }), /divergente/);
  assert.equal((await orderDetail(customer, order.id)).state, 'pending_payment');
});
test('CT-21: produção só avança em ordem e retirada impede cancelamento', async () => {
  const input = await setup(); const order = await reserve(customer, input); await applyVerifiedPayment(await event(order.id));
  await assert.rejects(advanceOrder(admin, order.id, { state: 'fulfilled' }), /não é permitida/);
  for (const state of ['in_production', 'ready', 'fulfilled']) await advanceOrder(admin, order.id, { state });
  await assert.rejects(requestCancellation(customer, order.id, { reason: 'Pedido já retirado' }), /não aceita/);
});
test('CT-03/04: antecedência de loja/item e exceção por cliente/data', async () => {
  const date = addDays(todaySP(), 14);
  await saveSchedule(admin, { date, is_open: true, offers: [{ product_id: productId, capacity: 5, enabled: true }], slots: [{ label: '10:00 às 12:00', capacity: 5, enabled: true }] });
  assert.equal((await calendar(customer)).dates.find(d => d.date === date)?.status, 'consultation');
  await assert.rejects(catalog(customer, date), /consulte/);
  await db().query('INSERT INTO lead_time_exceptions(user_id,date,reason,created_by) VALUES($1,$2,$3,$4)', [customer.id, date, 'Liberação pontual', admin.id]);
  assert.equal((await catalog(customer, date)).products.length, 1);
  await assert.rejects(catalog(other, date), /consulte/);
  await db().query('UPDATE lead_time_exceptions SET revoked=true WHERE user_id=$1 AND date=$2', [customer.id, date]);
  await assert.rejects(catalog(customer, date), /consulte/);
});
test('CT-01/14: catálogo público sem acesso anônimo a clientes ou pedidos', async () => {
  const available = (await calendar(null)).dates.find(d => ['open', 'partial'].includes(d.status));
  assert.ok(available);
  assert.ok((await catalog(null, available.date)).products.length > 0);
  await assert.rejects(asPublic(c => c.query('SELECT * FROM users')), /permission denied/);
  await assert.rejects(asPublic(c => c.query('SELECT * FROM orders')), /permission denied/);
  await assert.rejects(asPublic(c => c.query("UPDATE products SET price_cents=1")), /permission denied/);
  await db().query('UPDATE products SET active=false WHERE id=$1', [productId]);
  assert.equal((await asPublic(c => c.query('SELECT * FROM products WHERE id=$1', [productId]))).rowCount, 0);
  await db().query('UPDATE products SET active=true WHERE id=$1', [productId]);
});
test('CT-18: pagamento de pedido cancelado abre reembolso e não reativa pedido', async () => {
  const input = await setup(1, 1); const order = await reserve(customer, input);
  await requestCancellation(customer, order.id, { reason: 'Cancelamento antes do pagamento' });
  const request = (await orderDetail(admin, order.id)).cancellations[0];
  await decideCancellation(admin, request.id, { approve: true, note: 'Aprovado antes de pagar' });
  await applyVerifiedPayment(await event(order.id));
  const result = await orderDetail(customer, order.id);
  assert.equal(result.state, 'cancelled'); assert.equal(result.payment.status, 'refund_pending');
  assert.deepEqual(await balances(input), { capacity: 1, reserved: 0, confirmed: 0 });
});
test('CT-05: fechar a data não desfaz uma reserva válida anterior', async () => {
  const input = await setup(1, 1); const order = await reserve(customer, input);
  await db().query('UPDATE business_dates SET is_open=false WHERE date=$1', [input.date]);
  await applyVerifiedPayment(await event(order.id));
  assert.equal((await orderDetail(customer, order.id)).state, 'confirmed');
  assert.equal((await balances(input)).confirmed, 1);
});
