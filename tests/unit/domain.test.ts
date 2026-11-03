import test from 'node:test';
import assert from 'node:assert/strict';
import { todaySP, dayDifference, addDays, priceSelection } from '../../apps/web/src/modules/domain.ts';
const product = { id: 'p', name: 'Pipoca', price_cents: 1800, min_qty: 1, max_qty: 30, version: 1, options: { flavors: ['Caramelo', 'Chocolate'], addons: [{ id: 'tag', name: 'Tag', priceCents: 150 }], fields: [{ id: 'nome', label: 'Nome', type: 'text', required: false }] } };
const selection = { productId: 'p', version: 1, quantity: 3, flavors: { Caramelo: 2, Chocolate: 1 }, addons: ['tag'], fields: {}, notes: '' };
test('CT-03: datas civis e virada de dia em São Paulo', () => {
  const now = new Date('2026-11-04T02:59:00Z');
  assert.equal(todaySP(now), '2026-11-03');
  assert.equal(dayDifference('2026-11-17', now), 14);
  assert.equal(dayDifference('2026-11-18', now), 15);
  assert.equal(dayDifference('2026-11-19', now), 16);
  assert.equal(dayDifference('2026-11-18', new Date('2026-11-04T03:00:00Z')), 14);
  assert.equal(addDays('2026-12-25', 15), '2027-01-09');
});
test('CT-06/07: total usa centavos e complementos por unidade', () => assert.equal(priceSelection(product, selection).totalCents, 5850));
test('CT-06: distribuição e complementos forjados são recusados', () => {
  assert.throws(() => priceSelection(product, { ...selection, flavors: { Caramelo: 2 } }), /Distribua/);
  assert.throws(() => priceSelection(product, { ...selection, addons: ['inexistente'] }), /Complemento/);
  assert.throws(() => priceSelection(product, { ...selection, addons: ['tag', 'tag'] }), /Complemento/);
  assert.throws(() => priceSelection(product, { ...selection, quantity: 1.5 }), /Quantidade/);
  assert.throws(() => priceSelection(product, { ...selection, flavors: { Forjado: 3 } }), /Distribua/);
});
test('CT-07/13: versão comercial alterada e campos desconhecidos exigem revisão', () => {
  assert.throws(() => priceSelection(product, { ...selection, version: 2 }), /atualizado/);
  assert.throws(() => priceSelection(product, { ...selection, fields: { segredo: 'x' } }), /não permitido/);
});
