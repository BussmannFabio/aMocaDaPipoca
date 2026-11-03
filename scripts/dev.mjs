import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { ensureDatabase, migrate, root } from './database.mjs';
const server = await ensureDatabase();
await migrate(process.env.DATABASE_URL);
const requireWeb = createRequire(path.join(root, 'apps/web/package.json'));
const production = process.argv.includes('--production');
const child = spawn(process.execPath, [requireWeb.resolve('next/dist/bin/next'), production ? 'start' : 'dev', '--hostname', '127.0.0.1', '--port', '3000'], { cwd: path.join(root, 'apps/web'), stdio: 'inherit', env: process.env, windowsHide: true });
const jobs = spawn(process.execPath, ['--import', 'tsx', 'scripts/jobs.ts', 'watch'], { cwd: root, stdio: 'inherit', env: process.env, windowsHide: true });
let stopping = false;
async function stop(code = 0) { if (stopping) return; stopping = true; child.kill(); jobs.kill(); if (server.owned) await server.stop(); process.exit(code); }
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
child.on('exit', code => stop(code || 0));
console.log('Central de Encomendas · http://127.0.0.1:3000 · pagamentos locais simulados');
