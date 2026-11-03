import { z } from 'zod';
import { asUser, db, transaction, dateLock } from '../db';
import { BusinessError } from '../domain';
import type { Actor } from '../identity/auth';
import { history, releaseResources } from '../checkout/checkout';

export async function listOrders(user: Actor) {
  return asUser(user.id, async client => (await client.query("SELECT o.*,o.date::text,(SELECT jsonb_build_object('status',p.status,'method',p.method,'provider',p.provider) FROM payment_attempts p WHERE p.order_id=o.id ORDER BY p.created_at LIMIT 1) payment,(SELECT jsonb_build_object('id',c.id,'status',c.status,'reason',c.reason) FROM cancellation_requests c WHERE c.order_id=o.id ORDER BY c.created_at DESC LIMIT 1) cancellation FROM orders o ORDER BY o.created_at DESC LIMIT 500")).rows);
}
export async function orderDetail(user: Actor, id: string) {
  z.uuid().parse(id);
  return asUser(user.id, async client => {
    const order = (await client.query('SELECT *,date::text FROM orders WHERE id=$1', [id])).rows[0];
    if (!order) throw new BusinessError('Pedido não encontrado.', 404);
    const payment = (await client.query('SELECT id,method,provider,status,amount_cents,checkout_url,copy_paste FROM payment_attempts WHERE order_id=$1 ORDER BY created_at LIMIT 1', [id])).rows[0];
    const reservation = (await client.query('SELECT state,expires_at FROM reservations WHERE order_id=$1', [id])).rows[0];
    const events = (await client.query('SELECT action,created_at FROM order_history WHERE order_id=$1 ORDER BY created_at', [id])).rows;
    const cancellations = (await client.query('SELECT * FROM cancellation_requests WHERE order_id=$1 ORDER BY created_at DESC', [id])).rows;
    const refunds = (await client.query('SELECT r.status,r.provider_ref FROM refund_operations r JOIN payment_attempts p ON p.id=r.payment_id WHERE p.order_id=$1', [id])).rows;
    return { ...order, payment, reservation, history: events, cancellations, refunds };
  });
}
export async function requestCancellation(user: Actor, id: string, input: unknown) {
  const { reason } = z.object({ reason: z.string().trim().min(5).max(500) }).parse(input);
  const order = await orderDetail(user, id);
  if (order.user_id !== user.id && user.role !== 'admin') throw new BusinessError('Acesso negado.', 403);
  if (['cancelled', 'expired', 'fulfilled'].includes(order.state)) throw new BusinessError('Este pedido não aceita solicitação de cancelamento.', 409);
  return transaction(async client => {
    await dateLock(client, order.date);
    const fresh = (await client.query('SELECT state FROM orders WHERE id=$1 FOR UPDATE', [id])).rows[0];
    if (['cancelled', 'expired', 'fulfilled'].includes(fresh.state)) throw new BusinessError('O pedido mudou de estado. Atualize a página.', 409);
    await client.query("INSERT INTO cancellation_requests(order_id,user_id,reason) VALUES($1,$2,$3) ON CONFLICT(order_id) WHERE status='requested' DO NOTHING", [id, order.user_id, reason]);
    await history(client, id, user.id, 'Cancelamento solicitado; aguardando análise da administração');
  });
}
export async function decideCancellation(admin: Actor, id: string, input: unknown) {
  if (admin.role !== 'admin') throw new BusinessError('Acesso restrito.', 403);
  const { approve, note } = z.object({ approve: z.boolean(), note: z.string().trim().min(3).max(300) }).parse(input);
  const info = (await db().query('SELECT o.date::text,o.id FROM cancellation_requests c JOIN orders o ON o.id=c.order_id WHERE c.id=$1', [z.uuid().parse(id)])).rows[0];
  if (!info) throw new BusinessError('Solicitação não encontrada.', 404);
  return transaction(async client => {
    await dateLock(client, info.date);
    const order = (await client.query('SELECT *,date::text FROM orders WHERE id=$1 FOR UPDATE', [info.id])).rows[0];
    const request = (await client.query('SELECT * FROM cancellation_requests WHERE id=$1 FOR UPDATE', [id])).rows[0];
    if (request.status !== 'requested') return;
    if (approve && order.state === 'fulfilled') throw new BusinessError('Pedido já retirado. Trate a ocorrência pelo atendimento.', 409);
    await client.query('UPDATE cancellation_requests SET status=$1,decision_note=$2,decided_by=$3 WHERE id=$4', [approve ? 'approved' : 'denied', note, admin.id, id]);
    if (approve) {
      await releaseResources(client, order, 'active', 'released');
      await releaseResources(client, order, 'consumed', 'released');
      await client.query("UPDATE orders SET state='cancelled' WHERE id=$1", [order.id]);
      await client.query("INSERT INTO refund_operations(payment_id) SELECT id FROM payment_attempts WHERE order_id=$1 AND status='approved' ON CONFLICT DO NOTHING", [order.id]);
      await client.query("UPDATE payment_attempts SET status=CASE WHEN status='approved' THEN 'refund_pending' ELSE 'expired' END WHERE order_id=$1 AND status IN ('approved','pending','created')", [order.id]);
    }
    await history(client, order.id, admin.id, `Cancelamento ${approve ? 'aprovado' : 'não aprovado'}: ${note}`);
  });
}
export async function advanceOrder(admin: Actor, id: string, input: unknown) {
  if (admin.role !== 'admin') throw new BusinessError('Acesso restrito.', 403);
  const { state } = z.object({ state: z.enum(['in_production', 'ready', 'fulfilled']) }).parse(input);
  const info = await orderDetail(admin, id);
  return transaction(async client => {
    await dateLock(client, info.date);
    const order = (await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE', [id])).rows[0];
    const next: Record<string, string> = { confirmed: 'in_production', in_production: 'ready', ready: 'fulfilled' };
    if (next[order.state] !== state) throw new BusinessError('Esta mudança de status não é permitida.', 409);
    await client.query('UPDATE orders SET state=$1 WHERE id=$2', [state, id]);
    await history(client, id, admin.id, `Produção atualizada: ${state}`);
  });
}
export async function resolveFakeRefund(admin: Actor, paymentId: string, success: boolean) {
  if (admin.role !== 'admin' || process.env.PAYMENTS_MODE !== 'fake' || !['local', 'test'].includes(process.env.APP_ENV || 'local')) throw new BusinessError('Operação indisponível neste ambiente.', 403);
  return transaction(async client => {
    const payment = (await client.query("SELECT * FROM payment_attempts WHERE id=$1 AND provider='fake' FOR UPDATE", [z.uuid().parse(paymentId)])).rows[0];
    if (!payment || !['refund_pending', 'refund_failed'].includes(payment.status)) throw new BusinessError('Não há reembolso pendente.', 409);
    await client.query('UPDATE refund_operations SET status=$1,provider_ref=$2 WHERE payment_id=$3', [success ? 'refunded' : 'failed', `fake_refund_${paymentId}`, paymentId]);
    await client.query('UPDATE payment_attempts SET status=$1 WHERE id=$2', [success ? 'refunded' : 'refund_failed', paymentId]);
    if (success) await client.query("UPDATE financial_exceptions SET status='resolved' WHERE payment_id=$1", [paymentId]);
    await history(client, payment.order_id, admin.id, success ? 'Reembolso simulado concluído' : 'Falha simulada no reembolso; requer atenção');
  });
}
