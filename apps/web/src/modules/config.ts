export type RuntimeConfig = {
  appEnv: 'local' | 'test' | 'staging' | 'production';
  paymentsMode: 'fake' | 'sandbox' | 'live';
  appUrl: string; databaseUrl: string;
};
export function validateConfig(env: NodeJS.ProcessEnv): RuntimeConfig {
  const appEnv = env.APP_ENV || 'local';
  const paymentsMode = env.PAYMENTS_MODE || 'fake';
  if (!['local', 'test', 'staging', 'production'].includes(appEnv)) throw new Error('APP_ENV inválido.');
  if (!['fake', 'sandbox', 'live'].includes(paymentsMode)) throw new Error('PAYMENTS_MODE inválido.');
  if (appEnv === 'production' && paymentsMode !== 'live') throw new Error('Produção comercial exige gateway live.');
  if (paymentsMode === 'live' && appEnv !== 'production') throw new Error('Gateway live só pode operar no ambiente comercial.');
  if (paymentsMode !== 'fake') throw new Error('Integração de gateway real ainda não homologada. Esta versão opera somente com pagamentos mockados.');
  if (!env.DATABASE_URL) throw new Error('Banco não configurado. Execute pnpm db:start.');
  const appUrl = env.APP_URL || 'http://127.0.0.1:3000';
  if (appEnv === 'production' && !appUrl.startsWith('https://')) throw new Error('Produção exige HTTPS.');
  return { appEnv, paymentsMode, appUrl, databaseUrl: env.DATABASE_URL } as RuntimeConfig;
}
