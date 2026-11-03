import dotenv from 'dotenv';
import { expireReservations } from '../apps/web/src/modules/checkout/checkout';
import { reconcilePayments } from '../apps/web/src/modules/payments/payments';
import { db } from '../apps/web/src/modules/db';
dotenv.config({ path: '.env.local', quiet: true });
const command = process.argv[2];
async function run() { const expired = await expireReservations(); if (command !== 'watch' || expired) console.log(`Reservas expiradas: ${expired}`); if (command === 'reconcile') console.log(await reconcilePayments()); }
await run().catch(() => console.error('Falha na rotina de reservas. Verifique a conexão local.'));
if (command === 'watch') { setInterval(() => run().catch(() => console.error('Falha no job de reservas.')), 30000); }
else await db().end();
