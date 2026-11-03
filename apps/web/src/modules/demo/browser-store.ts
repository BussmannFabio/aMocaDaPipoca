// Adaptador exclusivo da demonstração estática no Pages. Sem autenticação ou banco de produção.
// O estado pertence somente a este navegador. Não usar dados ou senhas reais.
import { addDays, dayDifference, priceSelection, todaySP } from '../domain';
import { asset } from '../assets';

const STORE_KEY = 'pipoca-public-demo-v1';
const SESSION_KEY = 'pipoca-public-demo-user';
type Data = { users: any[]; settings: any; products: any[]; dates: any[]; offers: any[]; slots: any[]; orders: any[]; exceptions: any[]; financialExceptions: any[]; resets: any[]; nextNumber: number };
const id = () => crypto.randomUUID();
const time = () => new Date().toISOString();
function initial(): Data {
  const users = [
    { id: '10000000-0000-4000-8000-000000000001', name: 'Admin da Loja', email: 'admin@pipoca.local', phone: '11999990000', role: 'admin' },
    { id: '10000000-0000-4000-8000-000000000002', name: 'Ana de Oliveira', email: 'cliente@pipoca.local', phone: '11999990000', role: 'customer' },
    { id: '10000000-0000-4000-8000-000000000003', name: 'Bruno Santos', email: 'outro@pipoca.local', phone: '11999990001', role: 'customer' }
  ];
  const products = [
    { id: '20000000-0000-4000-8000-000000000001', name: 'Pipoca gourmet', description: 'Crocante, delicada e feita com muito carinho. Escolha seus sabores favoritos.', category: 'Pipocas gourmet', image: asset('/products/pipoca-caramelo.svg'), unit: 'pacote de 100 g', price_cents: 1800, min_qty: 1, max_qty: 30, lead_days: 15, active: true, version: 1, options: { flavors: ['Caramelo flor de sal', 'Leite em pó', 'Chocolate belga'], addons: [{ id: 'laco', name: 'Laço de cetim', priceCents: 200 }, { id: 'tag', name: 'Tag personalizada', priceCents: 150 }], fields: [{ id: 'mensagem', label: 'Mensagem para a tag', type: 'text', required: false }] } },
    { id: '20000000-0000-4000-8000-000000000002', name: 'Cookies artesanais', description: 'Casquinha delicada, miolo macio e generosos pedacinhos de chocolate.', category: 'Doces artesanais', image: asset('/products/cookies.svg'), unit: 'caixa com 6 unidades', price_cents: 4200, min_qty: 1, max_qty: 12, lead_days: 15, active: true, version: 1, options: { flavors: ['Chocolate ao leite', 'Chocolate branco'], addons: [{ id: 'presente', name: 'Embalagem presenteável', priceCents: 500 }], fields: [] } },
    { id: '20000000-0000-4000-8000-000000000003', name: 'Caixa de carinho', description: 'Um presente doce: uma seleção especial de pipocas gourmet para encantar.', category: 'Presentes', image: asset('/products/kit-presente.svg'), unit: 'kit com 3 potes', price_cents: 6800, min_qty: 1, max_qty: 10, lead_days: 15, active: true, version: 1, options: { flavors: ['Seleção da Moça', 'Só chocolate'], addons: [{ id: 'cartao', name: 'Cartão escrito à mão', priceCents: 400 }], fields: [{ id: 'para', label: 'Para quem é o presente?', type: 'text', required: false }] } }
  ];
  const dates = Array.from({ length: 60 }, (_, i) => ({ date: addDays(todaySP(), i + 15), is_open: (i + 15) % 7 !== 0, note: '' }));
  const db: Data = { users, settings: { name: 'A Moça da Pipoca', whatsapp: '', pickup_address: 'Ateliê demonstrativo · configure o endereço de retirada', lead_days: 15, reservation_minutes: 15 }, products, dates, offers: dates.flatMap(d => products.map(p => ({ date: d.date, product_id: p.id, enabled: true, capacity: p.category === 'Presentes' ? 10 : 30, reserved: 0, confirmed: 0 }))), slots: dates.flatMap(d => ['10:00 às 12:00', '14:00 às 17:00'].map(label => ({ id: id(), date: d.date, label, enabled: true, capacity: 12, reserved: 0, confirmed: 0 }))), orders: [], exceptions: [], financialExceptions: [], resets: [], nextNumber: 1001 };
  for (const [index, state] of ['confirmed', 'in_production', 'ready'].entries()) {
    const date = dates.filter(d => d.is_open)[index + 3].date;
    const slot = db.slots.find(s => s.date === date)!;
    const product = products[index];
    const selection = { productId: product.id, version: 1, quantity: 2, flavors: { [product.options.flavors[0]]: 2 }, addons: [], fields: {}, notes: 'Pedido fictício para demonstração do protótipo.' };
    const item = priceSelection(product, selection);
    const orderId = id();
    db.orders.push({ id: orderId, number: db.nextNumber++, user_id: users[1].id, date, slot_id: slot.id, state, total_cents: item.totalCents, created_at: time(), snapshot: { items: [item], customer: { name: users[1].name, email: users[1].email, phone: users[1].phone }, date, slot: slot.label, pickupAddress: db.settings.pickup_address, mode: 'pickup', totalCents: item.totalCents, subtotalCents: item.totalCents, deliveryCents: 0, paymentMethod: 'pix', paymentMode: 'fake' }, payment: { id: id(), method: 'pix', provider: 'fake', status: 'approved', amount_cents: item.totalCents, checkout_url: `/simulador/${orderId}` }, reservation: { state: 'consumed', expires_at: time() }, cancellations: [], refunds: [], history: [{ action: 'Encomenda fictícia de demonstração', created_at: time() }] });
    db.offers.find(o => o.date === date && o.product_id === product.id).confirmed += 2;
    slot.confirmed++;
  }
  return db;
}
function load(): Data {
  const saved = localStorage.getItem(STORE_KEY);
  if (saved) return JSON.parse(saved);
  const db = initial(); save(db); return db;
}
function save(db: Data) { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
function current(db: Data) { return db.users.find(u => u.id === sessionStorage.getItem(SESSION_KEY)) || null; }
function safeUser(user: any) { if (!user) return null; const profile = { ...user }; delete profile.passwordDigest; return profile; }
function requireUser(db: Data, admin = false) { const user = current(db); if (!user) throw new Error('Entre na sua conta para continuar.'); if (admin && user.role !== 'admin') throw new Error('Acesso restrito à administração.'); return user; }
async function hash(value: string) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('demo-only:' + value)))].map(n => n.toString(16).padStart(2, '0')).join(''); }
function readOrder(db: Data, orderId: string, user: any) { const order = db.orders.find(o => o.id === orderId); if (!order || (user.role !== 'admin' && order.user_id !== user.id)) throw new Error('Pedido não encontrado.'); return order; }
function log(order: any, action: string) { order.history.push({ action, created_at: time() }); }
function release(db: Data, order: any, from: 'active' | 'consumed', to: string) { if (order.reservation.state !== from) return; const column = from === 'active' ? 'reserved' : 'confirmed'; for (const item of order.snapshot.items) { const offer = db.offers.find(o => o.date === order.date && o.product_id === item.productId); offer[column] -= item.quantity; } db.slots.find(s => s.id === order.slot_id)[column]--; order.reservation.state = to; }
function expire(db: Data) { for (const order of db.orders) if (order.reservation.state === 'active' && Date.parse(order.reservation.expires_at) <= Date.now()) { release(db, order, 'active', 'expired'); order.state = 'expired'; if (order.payment.status === 'pending') order.payment.status = 'expired'; log(order, 'Reserva expirada; capacidade simulada liberada'); } }
function listed(order: any) { return { ...order, cancellation: order.cancellations.at(-1) }; }
function exception(db: Data, user: any, date: string) { return !!user && db.exceptions.some(e => e.user_id === user.id && e.date === date && !e.revoked); }

export async function browserApi(path: string, input?: any): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 90));
  const db = load(); expire(db);
  const parts = path.split('?')[0].split('/');
  const route = parts.join('/');
  const query = new URLSearchParams(path.split('?')[1] || '');
  let result: any = { ok: true };
  if (input === undefined) {
    if (route === 'bootstrap') result = { user: safeUser(current(db)), settings: db.settings, mode: 'fake', environment: 'public-demo' };
    else if (route === 'calendar') result = { settings: db.settings, today: todaySP(), dates: db.dates.filter(d => d.date >= todaySP()).map(d => { const offers = db.offers.filter(o => o.date === d.date && o.enabled && db.products.some(p => p.id === o.product_id && p.active)); const available = offers.filter(o => o.capacity > o.reserved + o.confirmed).length; const slots = db.slots.filter(s => s.date === d.date && s.enabled && s.capacity > s.reserved + s.confirmed).length; const authorized = exception(db, current(db), d.date); return { date: d.date, is_open: d.is_open, offers: offers.length, available, slots, exception: authorized, status: !d.is_open ? 'closed' : dayDifference(d.date) < db.settings.lead_days && !authorized ? 'consultation' : !available || !slots ? 'sold_out' : available < offers.length ? 'partial' : 'open' }; }) };
    else if (route === 'catalog') {
      const date = query.get('date') || '';
      if (!db.dates.find(d => d.date === date)?.is_open || date < todaySP()) throw new Error('Esta data está fechada para novas encomendas.');
      const authorized = exception(db, current(db), date);
      if (dayDifference(date) < db.settings.lead_days && !authorized) throw new Error('Para esta data, consulte a administração.');
      result = { settings: db.settings, products: db.products.filter(p => p.active && (authorized || dayDifference(date) >= Math.max(db.settings.lead_days, p.lead_days))).flatMap(p => { const offer = db.offers.find(o => o.date === date && o.product_id === p.id && o.enabled); return offer && offer.capacity > offer.reserved + offer.confirmed ? [{ ...p, available: offer.capacity - offer.reserved - offer.confirmed }] : []; }), slots: db.slots.filter(s => s.date === date && s.enabled && s.capacity > s.reserved + s.confirmed).map(s => ({ ...s, available: s.capacity - s.reserved - s.confirmed })) };
    } else {
      const user = requireUser(db, parts[0] === 'admin');
      if (route === 'orders') result = { orders: db.orders.filter(o => user.role === 'admin' || o.user_id === user.id).map(listed).reverse() };
      else if (parts[0] === 'orders' && parts.length === 2) result = readOrder(db, parts[1], user);
      else if (route === 'admin') result = { ...db, users: undefined, resets: undefined, customers: db.users.filter(u => u.role === 'customer').map(safeUser), orders: db.orders.map(listed).reverse() };
      else throw new Error('Página não encontrada.');
    }
  } else if (route === 'auth/login') {
    const user = db.users.find(u => u.email === String(input.email).toLowerCase().trim());
    if (!user || (user.passwordDigest ? user.passwordDigest !== await hash(input.password) : input.password !== 'Pipoca@123')) throw new Error('E-mail ou senha incorretos. Use os acessos de demonstração.');
    sessionStorage.setItem(SESSION_KEY, user.id);
  } else if (route === 'auth/register') {
    const email = String(input.email).toLowerCase().trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || String(input.name).length < 3 || String(input.password).length < 10) throw new Error('Confira nome, e-mail e senha de teste.');
    if (db.users.some(u => u.email === email)) throw new Error('Este e-mail já está cadastrado.');
    const user = { id: id(), name: input.name, email, phone: input.phone, role: 'customer', passwordDigest: await hash(input.password) }; db.users.push(user); sessionStorage.setItem(SESSION_KEY, user.id);
  } else if (route === 'auth/logout') sessionStorage.removeItem(SESSION_KEY);
  else if (route === 'auth/forgot') {
    const user = db.users.find(u => u.email === String(input.email).toLowerCase().trim());
    if (user) { const token = id(); db.resets = db.resets.filter(r => r.user_id !== user.id); db.resets.push({ token, user_id: user.id, expires_at: Date.now() + 1800000 }); result = { message: 'Link de recuperação simulado criado. Use apenas dados fictícios.', demoResetPath: `/redefinir?token=${token}` }; }
    else result = { message: 'Se o e-mail estiver cadastrado, um link de teste será disponibilizado.' };
  } else if (route === 'auth/reset') {
    const reset = db.resets.find(r => r.token === input.token && r.expires_at > Date.now());
    if (!reset || String(input.password).length < 10) throw new Error('Link inválido ou expirado.');
    db.users.find(u => u.id === reset.user_id).passwordDigest = await hash(input.password); db.resets = db.resets.filter(r => r !== reset); sessionStorage.removeItem(SESSION_KEY);
  } else {
    const user = requireUser(db, parts[0] === 'admin');
    if (route === 'profile') { if (String(input.name).length < 3) throw new Error('Informe seu nome.'); user.name = input.name; user.phone = input.phone; }
    else if (route === 'checkout') {
      const previous = db.orders.find(o => o.user_id === user.id && o.checkout_key === input.checkoutKey);
      if (previous) result = { id: previous.id };
      else {
        if (!db.dates.find(d => d.date === input.date)?.is_open || input.date < todaySP()) throw new Error('Data indisponível.');
        const authorized = exception(db, user, input.date);
        if (!authorized && dayDifference(input.date) < db.settings.lead_days) throw new Error('A data exige consulta prévia.');
        const slot = db.slots.find(s => s.id === input.slotId && s.date === input.date && s.enabled);
        if (!slot || slot.reserved + slot.confirmed >= slot.capacity) throw new Error('Horário esgotado.');
        if (!input.items?.length || new Set(input.items.map((i: any) => i.productId)).size !== input.items.length) throw new Error('Confira os itens da sacola.');
        const snapshots = input.items.map((selection: any) => { const product = db.products.find(p => p.id === selection.productId && p.active); const offer = db.offers.find(o => o.product_id === selection.productId && o.date === input.date && o.enabled); if (!product || !offer || offer.capacity - offer.confirmed - offer.reserved < selection.quantity) throw new Error('Quantidade indisponível.'); if (!authorized && dayDifference(input.date) < product.lead_days) throw new Error('Produto exige mais antecedência.'); return priceSelection(product, selection); });
        const total = snapshots.reduce((sum: number, item: any) => sum + item.totalCents, 0);
        const orderId = id(); const number = db.nextNumber++;
        const order = { id: orderId, number, user_id: user.id, date: input.date, slot_id: slot.id, state: 'pending_payment', total_cents: total, checkout_key: input.checkoutKey, created_at: time(), snapshot: { items: snapshots, customer: { name: user.name, email: user.email, phone: user.phone }, date: input.date, slot: slot.label, pickupAddress: db.settings.pickup_address, mode: 'pickup', subtotalCents: total, deliveryCents: 0, totalCents: total, paymentMethod: input.method, paymentMode: 'fake' }, payment: { id: id(), method: input.method, status: 'pending', provider: 'fake', amount_cents: total, checkout_url: `/simulador/${orderId}`, copy_paste: input.method === 'pix' ? `SIMULACAO-SEM-VALOR-${number}` : null }, reservation: { state: 'active', expires_at: new Date(Date.now() + 900000).toISOString() }, cancellations: [], refunds: [], history: [{ action: 'Pedido criado e capacidade simulada reservada', created_at: time() }] };
        for (const item of snapshots) db.offers.find(o => o.date === input.date && o.product_id === item.productId).reserved += item.quantity;
        slot.reserved++; db.orders.push(order); result = { id: orderId, number };
      }
    } else if (parts[0] === 'simulator') {
      const order = readOrder(db, parts[1], user);
      if (!['approved', 'refund_pending', 'refunded', 'refund_failed'].includes(order.payment.status)) {
        if (input.status === 'approved') {
          const wasActive = order.reservation.state === 'active';
          const slot = db.slots.find(s => s.id === order.slot_id);
          const noCapacity = !wasActive && (!db.dates.find(d => d.date === order.date)?.is_open || slot.capacity <= slot.reserved + slot.confirmed || order.snapshot.items.some((i: any) => { const o = db.offers.find(o => o.date === order.date && o.product_id === i.productId); return o.capacity - o.reserved - o.confirmed < i.quantity; }));
          if (order.state === 'cancelled' || noCapacity) { order.payment.status = 'refund_pending'; order.refunds.push({ status: 'pending' }); db.financialExceptions.push({ id: id(), order_id: order.id, number: order.number, reason: 'Pagamento tardio sem confirmação comercial', status: 'open', payment_status: 'refund_pending' }); }
          else { for (const item of order.snapshot.items) { const offer = db.offers.find(o => o.date === order.date && o.product_id === item.productId); if (wasActive) offer.reserved -= item.quantity; offer.confirmed += item.quantity; } if (wasActive) slot.reserved--; slot.confirmed++; order.reservation.state = 'consumed'; order.payment.status = 'approved'; order.state = 'confirmed'; }
          log(order, 'Resposta mockada do gateway: aprovado');
        } else if (input.status === 'rejected') { release(db, order, 'active', 'expired'); order.state = 'expired'; order.payment.status = 'rejected'; log(order, 'Pagamento simulado recusado'); }
      }
      result = { state: order.state };
    } else if (parts[0] === 'orders' && parts[2] === 'cancel') {
      const order = readOrder(db, parts[1], user);
      if (['cancelled', 'expired', 'fulfilled'].includes(order.state) || String(input.reason).length < 5) throw new Error('Pedido ou motivo inválido para cancelamento.');
      if (!order.cancellations.some((c: any) => c.status === 'requested')) { order.cancellations.push({ id: id(), status: 'requested', reason: input.reason, created_at: time() }); log(order, 'Cancelamento solicitado; aguardando análise'); }
    } else if (route === 'admin/products') {
      const existing = db.products.find(p => p.id === input.id);
      if (String(input.image).startsWith('/products/')) input.image = asset(input.image);
      if (!input.name || !Number.isInteger(input.price_cents) || input.price_cents <= 0 || input.min_qty < 1 || input.max_qty < input.min_qty) throw new Error('Confira nome, preço e quantidades.');
      if (existing) { Object.assign(existing, input, { version: existing.version + 1 }); result = existing; }
      else { const product = { ...input, id: id(), version: 1 }; db.products.push(product); result = product; }
    } else if (route === 'admin/schedule') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || input.date < todaySP()) throw new Error('Escolha uma data atual ou futura.');
      for (const offer of input.offers) { const existing = db.offers.find(o => o.date === input.date && o.product_id === offer.product_id); if (existing && offer.capacity < existing.reserved + existing.confirmed) throw new Error('A capacidade não pode ser menor que pedidos e reservas.'); }
      for (const slot of input.slots) { const existing = db.slots.find(s => s.date === input.date && s.label === slot.label); if (existing && slot.capacity < existing.reserved + existing.confirmed) throw new Error('Horário já comprometido.'); }
      const day = db.dates.find(d => d.date === input.date); if (day) Object.assign(day, { is_open: input.is_open, note: input.note }); else db.dates.push({ date: input.date, is_open: input.is_open, note: input.note }); db.dates.sort((a, b) => a.date.localeCompare(b.date));
      for (const offer of input.offers) { const existing = db.offers.find(o => o.date === input.date && o.product_id === offer.product_id); if (existing) Object.assign(existing, offer); else db.offers.push({ ...offer, date: input.date, reserved: 0, confirmed: 0 }); }
      for (const slot of input.slots) { const existing = db.slots.find(s => s.date === input.date && s.label === slot.label); if (existing) Object.assign(existing, slot); else db.slots.push({ ...slot, id: id(), date: input.date, reserved: 0, confirmed: 0 }); }
    } else if (route === 'admin/settings') Object.assign(db.settings, input);
    else if (route === 'admin/exception') { const old = db.exceptions.find(e => e.user_id === input.user_id && e.date === input.date); if (!db.dates.some(d => d.date === input.date)) throw new Error('Salve a data antes de cadastrar uma exceção.'); if (old) Object.assign(old, input); else db.exceptions.push({ ...input, id: id(), revoked: false }); }
    else if (parts[0] === 'admin' && parts[1] === 'orders') { const order = readOrder(db, parts[2], user); const next: Record<string, string> = { confirmed: 'in_production', in_production: 'ready', ready: 'fulfilled' }; if (next[order.state] !== input.state) throw new Error('Mudança de status não permitida.'); order.state = input.state; log(order, `Produção atualizada: ${input.state}`); }
    else if (parts[0] === 'admin' && parts[1] === 'cancellations') {
      const order = db.orders.find(o => o.cancellations.some((c: any) => c.id === parts[2])); if (!order) throw new Error('Solicitação não encontrada.'); const request = order.cancellations.find((c: any) => c.id === parts[2]);
      if (request.status === 'requested') { if (input.approve && order.state === 'fulfilled') throw new Error('Pedido já retirado.'); request.status = input.approve ? 'approved' : 'denied'; request.decision_note = input.note; if (input.approve) { release(db, order, 'active', 'released'); release(db, order, 'consumed', 'released'); order.state = 'cancelled'; if (order.payment.status === 'approved') { order.payment.status = 'refund_pending'; order.refunds.push({ status: 'pending' }); } else if (order.payment.status === 'pending') order.payment.status = 'expired'; } log(order, `Cancelamento ${input.approve ? 'aprovado' : 'não aprovado'}`); }
    } else if (parts[0] === 'admin' && parts[1] === 'refunds') {
      const order = db.orders.find(o => o.payment.id === parts[2]); if (!order || !['refund_pending', 'refund_failed'].includes(order.payment.status)) throw new Error('Sem reembolso pendente.'); order.payment.status = input.success ? 'refunded' : 'refund_failed'; order.refunds = [{ status: input.success ? 'refunded' : 'failed', provider_ref: 'demo-refund' }]; if (input.success) db.financialExceptions.filter(e => e.order_id === order.id).forEach(e => { e.status = 'resolved'; }); log(order, input.success ? 'Reembolso simulado concluído' : 'Falha simulada no reembolso');
    } else throw new Error('Operação indisponível nesta demonstração.');
  }
  save(db);
  return structuredClone(result);
}
