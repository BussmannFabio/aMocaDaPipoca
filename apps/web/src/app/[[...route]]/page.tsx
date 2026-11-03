import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Central from '@/components/central';
export default async function Page({ params }: { params: Promise<{ route?: string[] }> }) {
  const path = '/' + ((await params).route || []).join('/');
  const fixed = ['/', '/entrar', '/cadastro', '/recuperar', '/redefinir', '/privacidade', '/encomendar', '/pedidos', '/conta', '/admin', '/admin/pedidos', '/admin/agenda', '/admin/produtos', '/admin/producao', '/admin/clientes', '/admin/configuracoes'];
  if (!fixed.includes(path) && !/^\/(pedidos|simulador)\/[a-f0-9-]{36}$/.test(path)) notFound();
  return <Suspense fallback={<main className="boot"><span className="eyebrow">A MOÇA DA PIPOCA</span><h1>Preparando um momento doce…</h1></main>}><Central /></Suspense>;
}
