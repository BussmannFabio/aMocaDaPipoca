import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { PoolClient } from 'pg';
import { db, transaction, dateLock } from '../db';
import { BusinessError, dayDifference, priceSelection, todaySP } from '../domain';
import type { Actor } from '../identity/auth';
import { dateSchema } from '../catalog/catalog';

const selectionSchema = z.object({ productId: z.uuid(), quantity: z.number().int().min(1).max(10000), version: z.number().int().min(1), flavors: z.record(z.string(), z.number().int().min(0)).default({}), addons: z.array(z.string()).max(20).default([]), fields: z.record(z.string(), z.union([z.string().max(240), z.array(z.string().max(80)).max(30)])).default({}), notes: z.string().max(500).default('') });
export const checkoutSchema = z.object({ date: dateSchema, slotId: z.uuid(), checkoutKey: z.string().min(16).max(100), method: z.enum(['pix', 'card']), items: z.array(selectionSchema).min(1).max(30) });
export async function history(client: PoolClient, orderId: string, actorId: string | null, action: string) { await client.query('INSERT INTO order_history(order_id,actor_id,action) VALUES($1,$2,$3)', [orderId, actorId, action]); }

export async function releaseResources(client: PoolClient, order: any, from: 'active' | 'consumed', to: 'expired' | 'released') {
  const result = await client.query('UPDATE reservations SET state=$1 WHERE order_id=$2 AND state=$3 RETURNING order_id', [to, order.id, from]);
  if (!result.rowCount) return false;
  const column = from === 'active' ? 'reserved' : 'confirmed';
  const items = (await client.query('SELECT product_id,quantity FROM order_items WHERE order_id=$1 ORDER BY product_id', [order.id])).rows;
  for (const item of items) await client.query(`UPDATE date_offers SET ${column}=${column}-$1 WHERE date=$2 AND product_id=$3`, [item.quantity, order.date, item.product_id]);
  await client.query(`UPDATE pickup_slots SET ${column}=${column}-1 WHERE id=$1`, [order.slot_id]);
  return true;
}

export async function expireDate(client: PoolClient, date: string) {
  const orders = (await client.query("SELECT o.*,o.date::text FROM orders o JOIN reservations r ON r.order_id=o.id WHERE o.date=$1 AND r.state='active' AND r.expires_at<=now() ORDER BY o.id FOR UPDATE OF o,r", [date])).rows;
  for (const order of orders) {
    if (await releaseResources(client, order, 'active', 'expired')) {
      await client.query("UPDATE orders SET state='expired' WHERE id=$1 AND state='pending_payment'", [order.id]);
      await client.query("UPDATE payment_attempts SET status='expired' WHERE order_id=$1 AND status IN ('pending','created')", [order.id]);
      await history(client, order.id, null, 'Reserva expirada; capacidade liberada');
    }
  }
  return orders.length;
}

export async function expireReservations() {
  const dates = (await db().query("SELECT DISTINCT o.date::text FROM orders o JOIN reservations r ON r.order_id=o.id WHERE r.state='active' AND r.expires_at<=now() ORDER BY o.date::text")).rows;
  let count = 0;
  for (const { date } of dates) count += await transaction(async client => { await dateLock(client, date); return expireDate(client, date); });
  return count;
}

export async function reserve(user: Actor, input: unknown) {
  const data = checkoutSchema.parse(input);
  if (data.date < todaySP()) throw new BusinessError('Escolha uma data atual ou futura.', 409);
  if (process.env.PAYMENTS_MODE && process.env.PAYMENTS_MODE !== 'fake') throw new BusinessError('Gateway real ainda não configurado. Converse com a administração.', 503);
  if (new Set(data.items.map(i => i.productId)).size !== data.items.length) throw new BusinessError('Cada produto deve aparecer uma única vez no carrinho.');
  const payloadHash = createHash('sha256').update(JSON.stringify({ date: data.date, slotId: data.slotId, method: data.method, items: [...data.items].sort((a, b) => a.productId.localeCompare(b.productId)) })).digest('hex');
  return transaction(async client => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`checkout:${user.id}:${data.checkoutKey}`]);
    const previous = (await client.query('SELECT id,payload_hash FROM orders WHERE user_id=$1 AND checkout_key=$2', [user.id, data.checkoutKey])).rows[0];
    if (previous) { if (previous.payload_hash !== payloadHash) throw new BusinessError('Esta tentativa já contém outro carrinho. Revise e tente novamente.', 409); return { id: previous.id }; }
    await dateLock(client, data.date);
    await expireDate(client, data.date);
    const config = (await client.query('SELECT * FROM store_settings WHERE id=true')).rows[0];
    const day = (await client.query('SELECT * FROM business_dates WHERE date=$1 FOR UPDATE', [data.date])).rows[0];
    if (!day?.is_open) throw new BusinessError('A data escolhida está fechada.', 409);
    const exception = (await client.query('SELECT 1 FROM lead_time_exceptions WHERE date=$1 AND user_id=$2 AND NOT revoked', [data.date, user.id])).rowCount;
    if (dayDifference(data.date) < config.lead_days && !exception) throw new BusinessError('Esta data exige consulta prévia à administração.', 409);
    const slot = (await client.query('SELECT * FROM pickup_slots WHERE id=$1 AND date=$2 FOR UPDATE', [data.slotId, data.date])).rows[0];
    if (!slot?.enabled || slot.reserved + slot.confirmed >= slot.capacity) throw new BusinessError('Este horário de retirada esgotou. Escolha outro.', 409);
    const snapshots = [];
    for (const selection of [...data.items].sort((a, b) => a.productId.localeCompare(b.productId))) {
      const product = (await client.query('SELECT p.*,f.capacity,f.reserved,f.confirmed,f.enabled FROM products p JOIN date_offers f ON f.product_id=p.id WHERE p.id=$1 AND f.date=$2 FOR UPDATE OF p,f', [selection.productId, data.date])).rows[0];
      if (!product?.active || !product.enabled) throw new BusinessError('Um produto não está disponível nesta data.', 409);
      if (dayDifference(data.date) < Math.max(config.lead_days, product.lead_days) && !exception) throw new BusinessError(`${product.name} exige mais antecedência.`, 409);
      if (product.capacity - product.reserved - product.confirmed < selection.quantity) throw new BusinessError(`Quantidade indisponível para ${product.name}. Revise o carrinho.`, 409);
      snapshots.push(priceSelection(product, selection));
    }
    const total = snapshots.reduce((sum, item) => sum + item.totalCents, 0);
    const snapshot = { items: snapshots, customer: { name: user.name, email: user.email, phone: user.phone }, date: data.date, slot: slot.label, pickupAddress: config.pickup_address, mode: 'pickup', subtotalCents: total, deliveryCents: 0, totalCents: total, paymentMethod: data.method, paymentMode: 'fake' };
    const order = (await client.query('INSERT INTO orders(user_id,date,slot_id,total_cents,snapshot,checkout_key,payload_hash) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,number', [user.id, data.date, data.slotId, total, JSON.stringify(snapshot), data.checkoutKey, payloadHash])).rows[0];
    for (const item of snapshots) {
      await client.query('INSERT INTO order_items(order_id,product_id,quantity,snapshot) VALUES($1,$2,$3,$4)', [order.id, item.productId, item.quantity, JSON.stringify(item)]);
      await client.query('UPDATE date_offers SET reserved=reserved+$1 WHERE date=$2 AND product_id=$3', [item.quantity, data.date, item.productId]);
    }
    await client.query('UPDATE pickup_slots SET reserved=reserved+1 WHERE id=$1', [data.slotId]);
    await client.query("INSERT INTO reservations(order_id,expires_at) VALUES($1,now()+($2::int * interval '1 minute'))", [order.id, config.reservation_minutes]);
    await client.query("INSERT INTO payment_attempts(order_id,method,provider,amount_cents,idempotency_key,provider_id,checkout_url,copy_paste) VALUES($1,$2,'fake',$3,$4,$5,$6,$7)", [order.id, data.method, total, `payment:${order.id}:1`, `fake_${order.id}`, `/simulador/${order.id}`, data.method === 'pix' ? `SIMULACAO-SEM-VALOR-${order.number}` : null]);
    await history(client, order.id, user.id, 'Pedido criado e capacidade reservada por 15 minutos');
    return { id: order.id, number: order.number };
  });
}
