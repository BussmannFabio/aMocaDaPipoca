import { z } from 'zod';
import { asPublic, asUser, db, transaction, dateLock } from '../db';
import { addDays, BusinessError, dayDifference, todaySP } from '../domain';
import type { Actor } from '../identity/auth';

export const dateSchema = z.iso.date();
const optionsSchema = z.object({
  flavors: z.array(z.string().trim().min(1).max(80)).max(20),
  addons: z.array(z.object({ id: z.string().regex(/^[a-z0-9_-]{1,40}$/), name: z.string().min(1).max(80), priceCents: z.number().int().min(0).max(100000) })).max(20),
  fields: z.array(z.object({ id: z.string().regex(/^[a-z0-9_-]{1,40}$/), label: z.string().min(1).max(100), type: z.enum(['text', 'select', 'multiselect']), required: z.boolean(), choices: z.array(z.string().max(80)).max(30).optional() })).max(10)
}).superRefine((o, ctx) => { for (const list of [o.flavors, o.addons.map(a => a.id), o.fields.map(f => f.id)]) if (new Set(list).size !== list.length) ctx.addIssue({ code: 'custom', message: 'Opções duplicadas.' }); for (const f of o.fields) if (f.type !== 'text' && !f.choices?.length) ctx.addIssue({ code: 'custom', message: 'Defina escolhas para o campo.' }); });
export const productSchema = z.object({
  id: z.uuid().optional(), name: z.string().trim().min(2).max(100), description: z.string().max(600), category: z.string().min(2).max(60),
  image: z.string().max(500).refine(v => v.startsWith('/products/') || /^https:\/\/[^\s]+$/.test(v), 'Use uma imagem local ou URL HTTPS.'), unit: z.string().min(2).max(80),
  price_cents: z.number().int().min(1).max(10000000), min_qty: z.number().int().min(1).max(10000), max_qty: z.number().int().min(1).max(10000), lead_days: z.number().int().min(0).max(365), active: z.boolean(), options: optionsSchema
}).refine(p => p.max_qty >= p.min_qty, 'Máximo deve ser maior ou igual ao mínimo.');
export async function settings() { return (await db().query('SELECT * FROM store_settings WHERE id=true')).rows[0]; }
export async function calendar(user: Actor | null) {
  const read = <T,>(fn: (client: import('pg').PoolClient) => Promise<T>) => user ? asUser(user.id, fn) : asPublic(fn);
  return read(async client => {
    const config = (await client.query('SELECT * FROM store_settings')).rows[0];
    const dates = (await client.query("SELECT d.date::text,d.is_open,(SELECT count(*) FROM date_offers f JOIN products p ON p.id=f.product_id WHERE f.date=d.date AND f.enabled AND p.active) AS offers,(SELECT count(*) FROM date_offers f JOIN products p ON p.id=f.product_id WHERE f.date=d.date AND f.enabled AND p.active AND f.capacity>f.reserved+f.confirmed) AS available,(SELECT count(*) FROM pickup_slots s WHERE s.date=d.date AND s.enabled AND s.capacity>s.reserved+s.confirmed) AS slots FROM business_dates d WHERE d.date >= $1 AND d.date <= $2 ORDER BY d.date", [todaySP(), addDays(todaySP(), 120)])).rows;
    const exceptions = user ? (await client.query('SELECT date::text FROM lead_time_exceptions WHERE user_id=$1 AND NOT revoked', [user.id])).rows.map(r => r.date) : [];
    return { settings: config, today: todaySP(), dates: dates.map(d => ({ ...d, exception: exceptions.includes(d.date), status: !d.is_open ? 'closed' : dayDifference(d.date) < config.lead_days && !exceptions.includes(d.date) ? 'consultation' : !Number(d.available) || !Number(d.slots) ? 'sold_out' : Number(d.available) < Number(d.offers) ? 'partial' : 'open' })) };
  });
}
export async function catalog(user: Actor | null, dateInput: string) {
  const date = dateSchema.parse(dateInput);
  if (date < todaySP()) throw new BusinessError('Escolha uma data atual ou futura.', 409);
  const read = <T,>(fn: (client: import('pg').PoolClient) => Promise<T>) => user ? asUser(user.id, fn) : asPublic(fn);
  return read(async client => {
    const config = (await client.query('SELECT * FROM store_settings')).rows[0];
    const day = (await client.query('SELECT * FROM business_dates WHERE date=$1', [date])).rows[0];
    if (!day?.is_open) throw new BusinessError('Esta data está fechada para novas encomendas.', 409);
    const exception = user ? (await client.query('SELECT 1 FROM lead_time_exceptions WHERE date=$1 AND user_id=$2 AND NOT revoked', [date, user.id])).rowCount : 0;
    if (dayDifference(date) < config.lead_days && !exception) throw new BusinessError('Para esta data, consulte nossa equipe pelo WhatsApp.', 409);
    const products = (await client.query('SELECT p.*,f.capacity-f.reserved-f.confirmed AS available FROM products p JOIN date_offers f ON f.product_id=p.id WHERE f.date=$1 AND f.enabled AND p.active AND f.capacity>f.reserved+f.confirmed ORDER BY p.created_at,p.name', [date])).rows.filter(p => exception || dayDifference(date) >= Math.max(config.lead_days, p.lead_days));
    const slots = (await client.query('SELECT id,label,capacity-reserved-confirmed AS available FROM pickup_slots WHERE date=$1 AND enabled AND capacity>reserved+confirmed ORDER BY label', [date])).rows;
    return { products, slots, settings: config };
  });
}
export async function saveProduct(admin: Actor, input: unknown) {
  if (admin.role !== 'admin') throw new BusinessError('Acesso restrito.', 403);
  const p = productSchema.parse(input);
  return asUser(admin.id, async client => {
    const args = [p.name, p.description, p.category, p.image, p.unit, p.price_cents, p.min_qty, p.max_qty, p.lead_days, p.active, JSON.stringify(p.options)];
    if (p.id) { const result = await client.query('UPDATE products SET name=$1,description=$2,category=$3,image=$4,unit=$5,price_cents=$6,min_qty=$7,max_qty=$8,lead_days=$9,active=$10,options=$11,version=version+1 WHERE id=$12 RETURNING *', [...args, p.id]); if (!result.rowCount) throw new BusinessError('Produto não encontrado.', 404); return result.rows[0]; }
    return (await client.query('INSERT INTO products(name,description,category,image,unit,price_cents,min_qty,max_qty,lead_days,active,options) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *', args)).rows[0];
  });
}
const scheduleSchema = z.object({ date: dateSchema, is_open: z.boolean(), note: z.string().max(200).default(''), offers: z.array(z.object({ product_id: z.uuid(), capacity: z.number().int().min(0).max(100000), enabled: z.boolean() })).max(100), slots: z.array(z.object({ label: z.string().regex(/^\d{2}:\d{2} às \d{2}:\d{2}$/), capacity: z.number().int().min(0).max(10000), enabled: z.boolean() })).max(20) });
export async function saveSchedule(admin: Actor, input: unknown) {
  if (admin.role !== 'admin') throw new BusinessError('Acesso restrito.', 403);
  const data = scheduleSchema.parse(input);
  if (new Set(data.offers.map(o => o.product_id)).size !== data.offers.length || new Set(data.slots.map(s => s.label)).size !== data.slots.length) throw new BusinessError('Remova ofertas/horários duplicados.');
  if (data.date < todaySP()) throw new BusinessError('Não é possível alterar uma data passada.');
  return transaction(async client => {
    await dateLock(client, data.date);
    await client.query('INSERT INTO business_dates(date,is_open,note) VALUES($1,$2,$3) ON CONFLICT(date) DO UPDATE SET is_open=$2,note=$3', [data.date, data.is_open, data.note]);
    for (const offer of data.offers) {
      const old = (await client.query('SELECT * FROM date_offers WHERE date=$1 AND product_id=$2', [data.date, offer.product_id])).rows[0];
      if (old && offer.capacity < old.reserved + old.confirmed) throw new BusinessError('A capacidade não pode ser menor que pedidos e reservas existentes.', 409);
      await client.query('INSERT INTO date_offers(date,product_id,capacity,enabled) VALUES($1,$2,$3,$4) ON CONFLICT(date,product_id) DO UPDATE SET capacity=$3,enabled=$4', [data.date, offer.product_id, offer.capacity, offer.enabled]);
    }
    for (const slot of data.slots) {
      const old = (await client.query('SELECT * FROM pickup_slots WHERE date=$1 AND label=$2', [data.date, slot.label])).rows[0];
      if (old && slot.capacity < old.reserved + old.confirmed) throw new BusinessError('Horário já possui pedidos/reservas acima desse limite.', 409);
      await client.query('INSERT INTO pickup_slots(date,label,capacity,enabled) VALUES($1,$2,$3,$4) ON CONFLICT(date,label) DO UPDATE SET capacity=$3,enabled=$4', [data.date, slot.label, slot.capacity, slot.enabled]);
    }
    await client.query('INSERT INTO audit_log(actor_id,action,details) VALUES($1,$2,$3)', [admin.id, 'Agenda configurada', JSON.stringify({ date: data.date })]);
  });
}
