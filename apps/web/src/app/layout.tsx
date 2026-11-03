import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'A Moça da Pipoca · Encomendas com carinho', description: 'Escolha sua data, descubra nossos sabores e encomende seus momentos doces.', robots: { index: false, follow: false } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR" data-scroll-behavior="smooth"><body>{children}</body></html>; }
