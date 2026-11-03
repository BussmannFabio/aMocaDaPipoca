import { db, transaction, dateLock } from '../db';
import { BusinessError } from '../domain';
import { expireDate, history } from '../checkout/checkout';

export type VerifiedPayment = { eventId: string; paymentId: string; orderId: string; amountCents: number; currency: string; status: 'approved' | 'rejected' | 'expired' | 'pending'; provider: 'fake' };
export async function applyVerifiedPayment(event: VerifiedPayment) {
  const dateRow = (await db().query('SELECT date::text FROM orders WHERE id=$1', [event.orderId])).rows[0];
  if (!dateRow) throw new BusinessError('Pedido não encontrado.', 404);
  return transaction(async client => {
    await dateLock(client, dateRow.date);
    await expireDate(client, dateRow.date);
    const order = (await client.query('SELECT *,date::text FROM orders WHERE id=$1 FOR UPDATE', [event.orderId])).rows[0];
    const payment = (await client.query('SELECT * FROM payment_attempts WHERE id=$1 AND order_id=$2 FOR UPDATE', [event.paymentId, order.id])).rows[0];
    if (!payment || payment.provider !== event.provider || payment.amount_cents !== event.amountCents || event.currency !== 'BRL' || order.total_cents !== event.amountCents) throw new BusinessError('Pagamento divergente. O pedido não foi confirmado.', 409);
    const inserted = await client.query('INSERT INTO payment_events(id,payment_id,status) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id', [event.eventId, payment.id, event.status]);
    if (!inserted.rowCount) return { state: order.state, duplicate: true };
    if (['approved', 'refund_pending', 'refunded', 'refund_failed'].includes(payment.status)) return { state: order.state, duplicate: true };
    if (event.status !== 'approved') {
      if (payment.status === 'expired' && event.status === 'pending') return { state: order.state };
      await client.query('UPDATE payment_attempts SET status=$1 WHERE id=$2', [event.status, payment.id]);
      if (event.status === 'rejected' || event.status === 'expired') {
        await client.query("UPDATE reservations SET expires_at=now() WHERE order_id=$1 AND state='active'", [order.id]);
        await expireDate(client, order.date);
      }
      await history(client, order.id, null, `Pagamento simulado: ${event.status}`);
      return { state: event.status === 'pending' ? order.state : 'expired' };
    }
    const alreadyPaid = (await client.query("SELECT 1 FROM payment_attempts WHERE order_id=$1 AND id<>$2 AND status IN ('approved','refund_pending','refunded','refund_failed')", [order.id, payment.id])).rowCount;
    await client.query("UPDATE payment_attempts SET status='approved' WHERE id=$1", [payment.id]);
    const reservation = (await client.query('SELECT * FROM reservations WHERE order_id=$1 FOR UPDATE', [order.id])).rows[0];
    const day = (await client.query('SELECT is_open FROM business_dates WHERE date=$1', [order.date])).rows[0];
    const items = (await client.query('SELECT * FROM order_items WHERE order_id=$1 ORDER BY product_id', [order.id])).rows;
    let reason = alreadyPaid ? 'Pagamento duplicado para o mesmo pedido' : order.state === 'cancelled' ? 'Aprovação após cancelamento' : null;
    if (!reason && reservation.state !== 'active') {
      if (!day.is_open) reason = 'Data fechada após expiração';
      for (const item of items) { const offer = (await client.query('SELECT * FROM date_offers WHERE date=$1 AND product_id=$2 FOR UPDATE', [order.date, item.product_id])).rows[0]; if (!offer.enabled || offer.capacity - offer.reserved - offer.confirmed < item.quantity) reason = 'Pagamento tardio sem capacidade disponível'; }
      const slot = (await client.query('SELECT * FROM pickup_slots WHERE id=$1 FOR UPDATE', [order.slot_id])).rows[0];
      if (!slot.enabled || slot.capacity <= slot.reserved + slot.confirmed) reason = 'Pagamento tardio sem horário disponível';
    }
    if (reason) {
      await client.query('INSERT INTO financial_exceptions(order_id,payment_id,reason) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [order.id, payment.id, reason]);
      await client.query('INSERT INTO refund_operations(payment_id) VALUES($1) ON CONFLICT DO NOTHING', [payment.id]);
      await client.query("UPDATE payment_attempts SET status='refund_pending' WHERE id=$1", [payment.id]);
      await history(client, order.id, null, `${reason}; reembolso pendente de análise`);
      return { state: order.state, financialException: true };
    }
    const active = reservation.state === 'active';
    for (const item of items) await client.query(`UPDATE date_offers SET reserved=reserved-$1,confirmed=confirmed+$2 WHERE date=$3 AND product_id=$4`, [active ? item.quantity : 0, item.quantity, order.date, item.product_id]);
    await client.query('UPDATE pickup_slots SET reserved=reserved-$1,confirmed=confirmed+1 WHERE id=$2', [active ? 1 : 0, order.slot_id]);
    await client.query("UPDATE reservations SET state='consumed' WHERE order_id=$1", [order.id]);
    await client.query("UPDATE orders SET state='confirmed' WHERE id=$1", [order.id]);
    await history(client, order.id, null, 'Pagamento simulado aprovado; pedido confirmado');
    return { state: 'confirmed' };
  });
}

export async function reconcilePayments() {
  // Não há gateway externo nesta versão: eventos fake são persistidos pela transação do simulador.
  // O comando existe para tornar explícita a fronteira antes de integrar um provedor real.
  return { mode: 'fake', pending: Number((await db().query("SELECT count(*) FROM payment_attempts WHERE status='pending'")).rows[0].count), externalReconciliation: false };
}
