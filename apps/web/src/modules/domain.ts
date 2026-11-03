export class BusinessError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function todaySP(now = new Date()): string { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(now); }
export function addDays(date: string, days: number): string { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
export function dayDifference(date: string, now = new Date()): number { return Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${todaySP(now)}T12:00:00Z`)) / 86400000); }
export function money(cents: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100); }
export const stateLabels: Record<string, string> = { pending_payment: 'Aguardando pagamento', confirmed: 'Confirmado', in_production: 'Em produção', ready: 'Pronto para retirada', fulfilled: 'Retirado', expired: 'Expirado', cancelled: 'Cancelado', approved: 'Aprovado', pending: 'Pendente', rejected: 'Recusado', failed: 'Falhou', refund_pending: 'Reembolso pendente', refunded: 'Reembolsado', refund_failed: 'Falha no reembolso', requested: 'Em análise', denied: 'Não aprovado' };
export type ProductOptions = { flavors: string[]; addons: { id: string; name: string; priceCents: number }[]; fields: { id: string; label: string; type: 'text' | 'select' | 'multiselect'; required: boolean; choices?: string[] }[] };
export type Selection = { productId: string; quantity: number; version: number; flavors: Record<string, number>; addons: string[]; fields: Record<string, string | string[]>; notes: string };
export function priceSelection(product: any, selection: Selection) {
  if (!Number.isInteger(selection.quantity) || selection.quantity < product.min_qty || selection.quantity > product.max_qty) throw new BusinessError(`Quantidade inválida para ${product.name}.`);
  if (selection.version !== product.version) throw new BusinessError('O produto foi atualizado. Revise seu carrinho.', 409);
  const options = product.options as ProductOptions;
  const flavors = selection.flavors || {};
  if (Object.keys(flavors).some(f => !options.flavors.includes(f)) || (options.flavors.length && (Object.values(flavors).some(n => !Number.isInteger(n) || n < 0) || Object.values(flavors).reduce((a, b) => a + b, 0) !== selection.quantity))) throw new BusinessError('Distribua a quantidade entre os sabores escolhidos.');
  const addons = selection.addons || [];
  if (new Set(addons).size !== addons.length || addons.some(id => !options.addons.some(a => a.id === id))) throw new BusinessError('Complemento inválido.');
  if (Object.keys(selection.fields || {}).some(key => !options.fields.some(f => f.id === key))) throw new BusinessError('Campo de personalização não permitido.');
  for (const field of options.fields) {
    const value = selection.fields?.[field.id];
    if (field.required && (!value || !value.length)) throw new BusinessError(`Preencha ${field.label}.`);
    if (value && ((field.type === 'text' || field.type === 'select') ? typeof value !== 'string' : !Array.isArray(value))) throw new BusinessError('Tipo de personalização inválido.');
    if (value && (typeof value === 'string' ? value.length > 240 : value.some(v => typeof v !== 'string'))) throw new BusinessError('Personalização inválida.');
    if (value && field.type !== 'text') { const values = Array.isArray(value) ? value : [value]; if (values.some(v => !field.choices?.includes(v))) throw new BusinessError('Opção de personalização inválida.'); }
  }
  if ((selection.notes || '').length > 500) throw new BusinessError('Observações devem ter até 500 caracteres.');
  const unitCents = product.price_cents + options.addons.filter(a => addons.includes(a.id)).reduce((sum, a) => sum + a.priceCents, 0);
  return { productId: product.id, name: product.name, unit: product.unit, image: product.image, quantity: selection.quantity, unitCents, totalCents: unitCents * selection.quantity, flavors, addons: options.addons.filter(a => addons.includes(a.id)), fields: selection.fields || {}, notes: selection.notes || '', productVersion: product.version, optionsSnapshot: options };
}
