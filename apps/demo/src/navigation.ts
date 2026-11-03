import { useMemo, useSyncExternalStore } from 'react';
function subscribe(listener: () => void) { window.addEventListener('hashchange', listener); return () => window.removeEventListener('hashchange', listener); }
function snapshot() { return location.hash.slice(1) || '/'; }
const router = {
  push(href: string) { location.hash = href; window.scrollTo(0, 0); },
  replace(href: string) { location.replace('#' + href); },
  back() { history.back(); }
};
export function usePathname() { return useSyncExternalStore(subscribe, snapshot, () => '/').split('?')[0]; }
export function useSearchParams() { const current = useSyncExternalStore(subscribe, snapshot, () => '/'); return useMemo(() => new URLSearchParams(current.split('?')[1] || ''), [current]); }
export function useRouter() { return router; }
