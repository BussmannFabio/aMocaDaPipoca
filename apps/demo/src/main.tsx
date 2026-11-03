import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import Central from '../../web/src/components/central';
import '../../web/src/app/globals.css';
createRoot(document.getElementById('root')!).render(<StrictMode><Suspense fallback={<p>Preparando seu momento doce…</p>}><Central /></Suspense></StrictMode>);
