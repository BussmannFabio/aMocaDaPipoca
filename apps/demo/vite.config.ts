import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  base: '/aMocaDaPipoca/',
  plugins: [react()],
  publicDir: '../web/public',
  resolve: { alias: { 'next/link': path.join(here, 'src/link.tsx'), 'next/navigation': path.join(here, 'src/navigation.ts'), '@': path.join(here, '../web/src') }, dedupe: ['react', 'react-dom'] },
  define: { 'process.env.NEXT_PUBLIC_STATIC_DEMO': JSON.stringify('true'), 'process.env.NEXT_PUBLIC_BASE_PATH': JSON.stringify('/aMocaDaPipoca') },
  server: { fs: { allow: [path.join(here, '../..')] } }
});
