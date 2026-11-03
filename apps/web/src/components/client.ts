'use client';
import { useCallback, useEffect, useState } from 'react';
import { isStaticDemo } from '@/modules/assets';
export async function api<T = any>(path: string, data?: unknown): Promise<T> {
  if (isStaticDemo) return (await import('@/modules/demo/browser-store')).browserApi(path, data) as Promise<T>;
  const response = await fetch(`/api/${path}`, { method: data === undefined ? 'GET' : 'POST', headers: data === undefined ? undefined : { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data), cache: 'no-store' });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Não foi possível concluir a solicitação.');
  return body as T;
}
export function useRemote<T = any>(url: string | null, invalidateOnReload = false) {
  const [state, setState] = useState<{ url: string; version?: number; data?: T; error?: string }>({ url: '' });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(v => v + 1), []);
  useEffect(() => {
    if (!url) return;
    let active = true;
    api<T>(url).then(data => { if (active) setState({ url, version, data }); }).catch(error => { if (active) setState({ url, version, error: error.message }); });
    return () => { active = false; };
  }, [url, version]);
  return { data: state.url === url && (!invalidateOnReload || state.version === version) ? state.data : undefined, error: state.url === url && (!invalidateOnReload || state.version === version) ? state.error : undefined, reload };
}
export function dateLabel(date: string, options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long' }) { return new Intl.DateTimeFormat('pt-BR', options).format(new Date(`${date}T12:00:00`)); }
