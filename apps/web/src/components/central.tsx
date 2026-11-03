'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, CalendarDays, Heart, Package, LogOut, UserRound, ChevronRight, ShieldCheck, Sparkles, Menu, X, Check, Mail, ArrowLeft } from 'lucide-react';
import { api, useRemote } from './client';
import { asset, isStaticDemo } from '@/modules/assets';
import { Field, Loading, Logo, Notice } from './ui';
import Shop from './shop';
import { OrderDetail, Orders, Simulator } from './orders';
import Admin from './admin';
import PrototypeHelp from './prototype-help';

export default function Central() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: bootstrap, error, reload } = useRemote('bootstrap', true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const user = bootstrap?.user;
  const admin = pathname.startsWith('/admin');
  const publicPath = ['/', '/encomendar', '/entrar', '/cadastro', '/recuperar', '/redefinir', '/privacidade'].includes(pathname);
  useEffect(() => { if (bootstrap && !user && !publicPath) router.replace('/entrar'); }, [bootstrap, user, publicPath, router]);
  const refreshed = useCallback(() => { reload(); }, [reload]);
  async function signOut() { await api('auth/logout', {}); reload(); router.push('/'); }
  let content;
  if (error) content = <main className="container"><Notice>{error}</Notice><button className="button" onClick={reload}>Tentar novamente</button></main>;
  else if (!bootstrap) content = <Loading />;
  else if (!publicPath && !user) content = <Loading text="Abrindo sua conta…" />;
  else if (admin && user?.role !== 'admin') content = <main className="container page-head"><h1>Acesso restrito</h1><p>Esta área é exclusiva para a administração.</p><Link className="button" href="/encomendar">Fazer encomenda</Link></main>;
  else if (admin) content = <Admin user={user} section={pathname.split('/')[2] || 'overview'} onSettingsChange={refreshed} />;
  else if (['/entrar', '/cadastro', '/recuperar', '/redefinir'].includes(pathname)) content = <AuthPage key={pathname} mode={pathname.slice(1)} onDone={refreshed} />;
  else if (pathname === '/encomendar') content = <Shop user={user} />;
  else if (pathname === '/pedidos') content = <Orders />;
  else if (pathname.startsWith('/pedidos/')) content = <OrderDetail id={pathname.split('/')[2]} user={user} settings={bootstrap.settings} />;
  else if (pathname.startsWith('/simulador/')) content = <Simulator id={pathname.split('/')[2]} />;
  else if (pathname === '/conta') content = <Profile user={user} onDone={refreshed} />;
  else if (pathname === '/privacidade') content = <Privacy />;
  else if (pathname === '/') content = <Landing />;
  else content = <main className="container page-head"><h1>Este caminho não está no nosso cardápio.</h1><Link href="/">Voltar ao início</Link></main>;
  return <>
    <div className="announcement"><Sparkles size={13} /><span>Feita com carinho. Encomendada para o seu momento.</span><span className="local-label">{isStaticDemo ? 'DEMONSTRAÇÃO PÚBLICA · DADOS FICTÍCIOS' : 'AMBIENTE LOCAL · SEM COBRANÇAS REAIS'}</span></div>
    <header className="site-header"><div className="header-inner"><Link href="/" aria-label="A Moça da Pipoca, início"><Logo /></Link><div className="header-actions"><nav className={mobileMenu ? 'nav-links nav-open' : 'nav-links'} aria-label="Navegação principal" onClick={() => setMobileMenu(false)}>
      <Link className={pathname === '/encomendar' ? 'active' : ''} href="/encomendar">Fazer encomenda</Link>
      {user && <Link className={pathname.startsWith('/pedidos') ? 'active' : ''} href="/pedidos">Meus pedidos</Link>}
      {user?.role === 'admin' && <Link className={admin ? 'active' : ''} href="/admin">Administração</Link>}
      {user ? <><Link className="account-link" href="/conta"><UserRound size={17} /><span>{user.name.split(' ')[0]}</span></Link><button className="icon-button" onClick={signOut} aria-label="Sair da conta"><LogOut size={17} /></button></> : <Link className="button button-small" href="/entrar">Minha conta <ArrowRight size={16} /></Link>}
    </nav><PrototypeHelp /><button className="icon-button mobile-toggle" aria-label="Abrir menu" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X /> : <Menu />}</button></div></div></header>
    {isStaticDemo && <div className="public-demo-banner">Protótipo de demonstração: use apenas dados e senhas fictícios. Pagamentos simulados; alterações ficam neste navegador.</div>}
    {content}
    <footer className="site-footer"><div className="container footer-inner"><Logo /><p>Pequenos sabores.<br /><span>Grandes momentos.</span></p><div><Link href="/privacidade">Privacidade e uso de dados</Link><small>© {new Date().getFullYear()} A Moça da Pipoca · Protótipo</small></div><Heart size={21} strokeWidth={1.2} /></div></footer>
  </>;
}

function Landing() {
  return <main>
    <section className="container landing-hero"><div className="hero-copy"><span className="eyebrow"><span className="tiny-line" />MOMENTOS QUE MERECEM UM DOCE</span><h1>Um pouquinho<br />de pipoca.<br /><em>Um montão<br className="mobile-break" /> de carinho.</em></h1><p>Pipocas gourmet, doces artesanais e presentes que fazem sorrir. Escolha a sua data e deixe o resto com a gente.</p><Link className="button" href="/encomendar">Encomendar meu momento <ArrowRight size={18} /></Link><div className="hero-note"><CalendarDays size={17} />Encomendas com 15 dias de antecedência</div></div><div className="hero-art"><span className="hero-ring" /><img src={asset('/products/hero.svg')} alt="Ilustração de pipocas artesanais e um presente com laço rosa" /><div className="art-caption"><Heart size={18} /><span>Artesanal do primeiro<br /><strong>ao último detalhe.</strong></span></div><span className="vertical-note">DO NOSSO ATELIÊ PARA O SEU MOMENTO</span></div></section>
    <section className="benefit-strip"><div className="container benefits"><span><Heart size={19} />Feito à mão, com carinho</span><span><CalendarDays size={19} />Sua data, nossos sabores</span><span><ShieldCheck size={19} />Pagamento seguro</span><span><Package size={19} />Retirada no ateliê</span></div></section>
    <section className="container how-section"><div><span className="eyebrow">DO SEU JEITINHO</span><h2>Seu próximo momento doce<br /><em>começa por aqui.</em></h2></div><div className="how-steps">{[['01', 'Escolha sua data', 'Consulte os dias disponíveis no nosso calendário.'], ['02', 'Monte seu pedido', 'Escolha sabores e os detalhes que são a sua cara.'], ['03', 'Pronto para encantar', 'Confirme, acompanhe e retire no horário escolhido.']].map(([n, title, text]) => <div key={n}><span>{n}</span><h3>{title}</h3><p>{text}</p></div>)}</div></section>
    <section className="container favorites"><div className="section-title"><div><span className="eyebrow">UM GOSTINHO DO NOSSO ATELIÊ</span><h2>Pequenas delícias, <em>grandes sorrisos.</em></h2></div><Link href="/encomendar">Ver disponibilidade <ArrowRight size={17} /></Link></div><div className="product-grid">{[['pipoca-caramelo', 'Pipocas gourmet', 'Crocância que abraça.'], ['cookies', 'Cookies artesanais', 'Um carinho recém-saído do forno.'], ['kit-presente', 'Presentes especiais', 'Para dizer muito com um doce.']].map(([image, title, text]) => <Link className="feature-product" href="/encomendar" key={image}><div className="product-art"><img src={asset(`/products/${image}.svg`)} alt={`Ilustração de ${title.toLowerCase()}`} /></div><div><h3>{title}</h3><p>{text}</p></div><ChevronRight size={20} /></Link>)}</div><p className="fine-print">Seleção ilustrativa. Consulte produtos, valores e horários sem login. Entre apenas ao montar seu pedido.</p></section>
  </main>;
}

function AuthPage({ mode, onDone }: { mode: string; onDone: () => void }) {
  const router = useRouter(); const search = useSearchParams();
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [demoReset, setDemoReset] = useState(''); const [busy, setBusy] = useState(false);
  const register = mode === 'cadastro', forgot = mode === 'recuperar', reset = mode === 'redefinir';
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true);
    const form = new FormData(event.currentTarget); const value = Object.fromEntries(form);
    try {
      if (forgot) { const result = await api('auth/forgot', value); setMessage(result.message + (isStaticDemo ? '' : ' No ambiente local, consulte o comando pnpm mailbox no terminal.')); setDemoReset(result.demoResetPath || ''); }
      else if (reset) { await api('auth/reset', { password: value.password, token: search.get('token') }); setMessage('Senha atualizada. Entre com a nova senha.'); }
      else { await api(register ? 'auth/register' : 'auth/login', { ...value, phone: String(value.phone || '').replace(/\D/g, '') }); onDone(); const destination = search.get('returnTo'); router.push(destination && /^\/encomendar(?:\?|$)/.test(destination) ? destination : '/encomendar'); }
    } catch (error: any) { setError(error.message); } finally { setBusy(false); }
  }
  return <main className="container auth-layout"><aside className="auth-story"><span className="eyebrow">BEM-VINDA AO NOSSO ATELIÊ</span><h1>Coisas boas<br />ficam ainda melhores<br /><em>quando são divididas.</em></h1><img src={asset('/products/hero.svg')} alt="Pipocas gourmet em embalagens presenteáveis" /><p>Um espaço para escolher, encomendar e acompanhar<br />os seus momentos mais doces.</p></aside><section className="auth-card"><Link className="text-link" href="/"><ArrowLeft size={15} /> Voltar ao início</Link><span className="eyebrow">SUA CONTA, SEUS MOMENTOS</span><h2>{register ? 'Que bom ter você aqui.' : forgot ? 'Vamos recuperar seu acesso.' : reset ? 'Um novo começo.' : 'Bom te ver de novo.'}</h2><p>{register ? 'Crie sua conta para personalizar e confirmar sua encomenda.' : forgot ? 'Informe o e-mail usado no seu cadastro.' : reset ? 'Escolha uma senha com pelo menos 10 caracteres.' : 'Entre para montar e acompanhar sua encomenda.'}</p><Notice>{error}</Notice><Notice success>{message}</Notice>{demoReset && <Link className="text-link" href={demoReset}>Abrir link de recuperação de teste</Link>}<form onSubmit={submit}>
    {register && <Field label="Nome completo"><input name="name" autoComplete="name" minLength={3} maxLength={100} required placeholder="Como podemos chamar você?" /></Field>}
    {!reset && <Field label="E-mail"><input name="email" type="email" autoComplete="email" required placeholder="seu@email.com" /></Field>}
    {register && <Field label="WhatsApp com DDD"><input name="phone" type="tel" autoComplete="tel" required minLength={10} maxLength={18} placeholder="(11) 99999-9999" /></Field>}
    {!forgot && <Field label={reset ? 'Nova senha' : 'Senha'} hint={register || reset ? 'Pelo menos 10 caracteres.' : undefined}><input name="password" type="password" autoComplete={register || reset ? 'new-password' : 'current-password'} minLength={register || reset ? 10 : 1} maxLength={128} required placeholder="Sua senha" /></Field>}
    {!register && !forgot && !reset && <Link className="forgot-link" href="/recuperar">Esqueci minha senha</Link>}
    {register && <p className="fine-print">Usamos seus dados para cuidar da sua encomenda. <Link href="/privacidade">Saiba mais</Link>.</p>}
    <button className="button button-full" disabled={busy}>{busy ? 'Só um instante…' : register ? 'Criar minha conta' : forgot ? 'Enviar link de recuperação' : reset ? 'Salvar nova senha' : 'Entrar na minha conta'}<ArrowRight size={17} /></button>
    </form>{reset ? <Link className="text-link" href="/entrar">Voltar para entrar</Link> : !forgot && <p className="auth-switch">{register ? 'Já tem uma conta?' : 'Seu primeiro momento por aqui?'} <Link href={(register ? '/entrar' : '/cadastro') + (search.get('returnTo') ? '?returnTo=' + encodeURIComponent(search.get('returnTo')!) : '')}>{register ? 'Entrar' : 'Criar conta'}</Link></p>}
    {!register && !forgot && !reset && <div className="demo-credentials"><span className="eyebrow">ACESSOS PARA EXPLORAR O PROTÓTIPO</span><p>Cliente: <strong>cliente@pipoca.local</strong><br />Admin: <strong>admin@pipoca.local</strong><br />Senha de demonstração: <strong>Pipoca@123</strong></p></div>}
    </section></main>;
}
function Profile({ user, onDone }: { user: any; onDone: () => void }) {
  const [error, setError] = useState(''), [saved, setSaved] = useState(false), [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); setError(''); setSaved(false); setBusy(true); const fields = Object.fromEntries(new FormData(e.currentTarget)); try { await api('profile', { ...fields, phone: String(fields.phone).replace(/\D/g, '') }); setSaved(true); onDone(); } catch (error: any) { setError(error.message); } finally { setBusy(false); } }
  return <main className="container narrow page-head"><span className="eyebrow">SEU ESPAÇO</span><h1>Minha conta<span className="rose">.</span></h1><p>Os detalhes para cuidar da sua encomenda.</p><section className="panel"><Notice>{error}</Notice><Notice success>{saved && 'Seus dados foram atualizados.'}</Notice><form onSubmit={submit}><Field label="Nome completo"><input name="name" defaultValue={user.name} required minLength={3} maxLength={100} /></Field><Field label="WhatsApp com DDD"><input name="phone" defaultValue={user.phone} required type="tel" /></Field><Field label="E-mail"><input value={user.email} readOnly /></Field><button className="button" disabled={busy}>Salvar meus dados <Check size={16} /></button></form><p className="fine-print">Para alterar sua senha, use a recuperação de acesso.</p></section></main>;
}
function Privacy() { return <main className="container narrow page-head"><span className="eyebrow">CLAREZA E CUIDADO</span><h1>Seus dados, com cuidado.</h1><section className="panel prose"><p>Esta é uma versão de demonstração da Central de Encomendas. Os produtos e acessos iniciais são fictícios e os pagamentos não movimentam dinheiro.</p><h2>Dados usados nesta versão</h2><p>Nome, e-mail e telefone identificam sua conta e encomenda. {isStaticDemo ? 'Nesta demonstração pública, suas escolhas ficam no armazenamento deste navegador; não existe servidor de contas ou pedidos compartilhado.' : 'Suas escolhas, horários e pedidos ficam no banco local desta instalação.'} Use apenas senhas fictícias. Nenhum dado completo de cartão é solicitado.</p><h2>Recuperação de acesso</h2><p>{isStaticDemo ? 'Os links de recuperação são simulados na própria tela. Nenhum e-mail real é enviado.' : 'Os links de recuperação ficam em uma caixa de e-mail local de teste, acessível ao operador pelo terminal. Nenhum e-mail real é enviado.'}</p><h2>Antes da operação comercial</h2><p>A empresa precisa definir o canal de atendimento, responsável pelos dados, prazos de retenção e as regras de cancelamento e reembolso. Esse conteúdo será validado antes da publicação comercial.</p><p><Mail size={16} /> Para dúvidas nesta demonstração, fale com o responsável pela instalação local.</p></section></main>; }
