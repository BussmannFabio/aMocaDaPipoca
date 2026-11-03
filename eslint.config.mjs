import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default [
  ...nextVitals, ...nextTs,
  { ignores: ['**/.next/**', '**/node_modules/**', '.cache/**', '.local/**', 'apps/web/next-env.d.ts'] },
  { settings: { next: { rootDir: 'apps/web/' } }, rules: { '@typescript-eslint/no-explicit-any': 'off', '@next/next/no-img-element': 'off' } }
];
