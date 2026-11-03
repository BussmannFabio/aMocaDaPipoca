'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="boot"><h1>Precisamos de mais um instante.</h1><p>Não foi possível carregar esta página.</p><button onClick={reset}>Tentar novamente</button></main>; }
