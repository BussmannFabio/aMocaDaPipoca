import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
for (const project of ['apps/web/tsconfig.json', 'apps/demo/tsconfig.json']) {
  const result = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--noEmit', '-p', project], { stdio: 'inherit', windowsHide: true });
  if (result.status !== 0) process.exit(result.status || 1);
}
