import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConfig } from '../../apps/web/src/modules/config.ts';
const base = { DATABASE_URL: 'postgres://local/test', APP_URL: 'http://127.0.0.1:3000' };
test('ambiente comercial rejeita simulador e sandbox', () => {
  for (const PAYMENTS_MODE of ['fake', 'sandbox']) assert.throws(() => validateConfig({ ...base, APP_ENV: 'production', PAYMENTS_MODE }), /exige gateway live/);
});
test('live nunca opera no ambiente de demonstração', () => assert.throws(() => validateConfig({ ...base, PAYMENTS_MODE: 'live' }), /só pode operar/));
test('gateway real não homologado é bloqueado e banco precisa estar configurado', () => {
  assert.throws(() => validateConfig({ ...base, PAYMENTS_MODE: 'sandbox' }), /não homologada/);
  assert.throws(() => validateConfig({}), /Banco não configurado/);
});
