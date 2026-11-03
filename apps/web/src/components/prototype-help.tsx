'use client';

import { useCallback, useState } from 'react';
import { Check, CircleHelp, Copy, ExternalLink } from 'lucide-react';
import { isStaticDemo } from '@/modules/assets';
import { Modal } from './ui';

const sections = [
  { id: 'guide', label: 'Como usar' },
  { id: 'technology', label: 'Tecnologias' },
  { id: 'payments', label: 'Pagamentos' }
] as const;
type Section = typeof sections[number]['id'];

export default function PrototypeHelp() {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<Section>('guide');
  const [copied, setCopied] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const close = useCallback(() => setOpen(false), []);

  async function copyAccess(profile: 'Cliente' | 'Admin', email: string) {
    try {
      await navigator.clipboard.writeText(`E-mail: ${email}\nSenha: Pipoca@123`);
      setCopied(profile);
      setCopyMessage(`Acesso de ${profile.toLowerCase()} copiado.`);
    } catch {
      setCopied('');
      setCopyMessage('Selecione o e-mail e a senha abaixo para copiar manualmente.');
    }
  }

  return <>
    <button
      type="button"
      className="icon-button prototype-help-trigger"
      aria-label="Como usar este protótipo"
      title="Como usar este protótipo"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => { setSection('guide'); setCopyMessage(''); setCopied(''); setOpen(true); }}
    >
      <CircleHelp size={20} strokeWidth={1.5} />
    </button>

    {open && <Modal title="Como usar este protótipo" onClose={close}>
      <div className="prototype-help">
        <p className="help-intro"><span className="help-stage">MVP 1 · DEMONSTRAÇÃO</span>Explore a experiência de compra e a operação do ateliê. Use somente dados e senhas fictícios.</p>

        <section className="help-access" aria-label="Acessos de demonstração">
          <h3>Contas prontas para explorar</h3>
          <div className="help-accounts">
            {([
              ['Cliente', 'cliente@pipoca.local'],
              ['Admin', 'admin@pipoca.local']
            ] as const).map(([profile, email]) => <div className="help-account" key={profile}>
              <div><strong>{profile}</strong><code>{email}</code></div>
              <button className="icon-button" type="button" aria-label={`Copiar acesso de ${profile.toLowerCase()}`} title="Copiar e-mail e senha fictícios" onClick={() => copyAccess(profile, email)}>
                {copied === profile ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>)}
          </div>
          <p className="help-password">Senha dos dois acessos: <code>Pipoca@123</code></p>
          <p className="help-small">Para trocar de perfil, use <strong>Sair da conta</strong> no header e entre com o outro acesso.</p>
          <span className="help-copy-status" role="status">{copyMessage}</span>
        </section>

        <div className="help-sections" role="group" aria-label="Assuntos da ajuda">
          {sections.map(item => <button key={item.id} type="button" aria-pressed={section === item.id} onClick={() => setSection(item.id)}>{item.label}</button>)}
        </div>

        {section === 'guide' && <section className="help-content" aria-label="Roteiro do protótipo">
          <h3>Para fazer uma encomenda</h3>
          <ol className="help-steps">
            <li>Consulte o <strong>catálogo público</strong> e escolha uma data disponível, normalmente com 15 dias de antecedência.</li>
            <li>Clique em <strong>personalizar (+)</strong>. Só aqui pedimos login ou cadastro; sua data e seu produto são retomados depois.</li>
            <li>Escolha sabores, quantidades e complementos. Adicione à sacola, escolha a retirada e revise.</li>
            <li>Abra o <strong>simulador de pagamento</strong> e escolha “Simular aprovação”. Nenhuma cobrança é feita.</li>
            <li>Acompanhe o status em <strong>Meus pedidos</strong>. Cancelamento depende da análise da administração.</li>
          </ol>
          <h3>Para conhecer a administração</h3>
          <p>Entre como admin e abra <strong>Administração → Agenda → Produtos → Encomendas → Produção → Configurações</strong>. Em uma encomenda, avance a produção ou analise um cancelamento e seu reembolso simulado.</p>
          <div className="help-mode-note"><strong>O que acontece nesta versão?</strong><p>{isStaticDemo ? 'No GitHub Pages, os dados ficam apenas neste navegador. Pedidos e alterações não são compartilhados com outras pessoas. Não existe autenticação comercial nesta demonstração.' : 'Na versão local, o servidor mantém as contas e os pedidos no PostgreSQL, com reserva transacional e controle de acesso.'} Pix, cartão e reembolsos são mockados; nenhum e-mail real é enviado.</p></div>
        </section>}

        {section === 'technology' && <section className="help-content" aria-label="Tecnologias utilizadas">
          <h3>A mesma experiência, dois ambientes</h3>
          <div className="help-technology"><div><span className="eyebrow">INTERFACE COMPARTILHADA</span><div className="help-tech-tags"><span>React</span><span>TypeScript</span><span>CSS responsivo</span><span>Lucide</span></div><p>Telas de compra e administração adaptadas para celular e computador.</p></div><div><span className="eyebrow">PROTÓTIPO PUBLICADO</span><div className="help-tech-tags"><span>Vite</span><span>GitHub Pages</span><span>Armazenamento no navegador</span></div><p>Demonstração estática com dados fictícios, sem servidor ou banco compartilhado.</p></div><div><span className="eyebrow">MVP LOCAL COM SERVIDOR</span><div className="help-tech-tags"><span>Next.js</span><span>Node.js</span><span>PostgreSQL</span><span>RLS</span></div><p>Sessões no servidor, senhas com hash e transações para reservas e capacidade. Os testes de concorrência se referem a esta versão.</p></div></div>
          <p className="help-small">Para operar comercialmente: publicar backend e banco compartilhado, configurar e-mail, backups e monitoramento e homologar o gateway.</p>
        </section>}

        {section === 'payments' && <section className="help-content" aria-label="Possíveis canais de pagamento">
          <h3>Hoje: pagamento totalmente simulado</h3>
          <p>Pix, cartão e reembolsos servem apenas para percorrer as telas. Nenhum gateway foi contratado ou integrado.</p>
          <h3 className="help-subheading">Opções para avaliar com o cliente</h3>
          <div className="help-providers">
            <a href="https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/overview" target="_blank" rel="noreferrer"><strong>Mercado Pago</strong><span>Checkout para Pix e cartão.</span><ExternalLink size={14} /></a>
            <a href="https://docs.asaas.com/docs/checkout-asaas" target="_blank" rel="noreferrer"><strong>Asaas</strong><span>Checkout hospedado para Pix e cartão.</span><ExternalLink size={14} /></a>
            <a href="https://docs.stripe.com/payments/pix" target="_blank" rel="noreferrer"><strong>Stripe</strong><span>Alternativa a avaliar conforme a conta e os meios habilitados.</span><ExternalLink size={14} /></a>
          </div>
          <div className="help-mode-note"><strong>A escolha ainda será discutida.</strong><p>Comparar taxas, prazos de recebimento, requisitos da conta e suporte a notificações e reembolsos. Depois, integrar no backend e homologar no ambiente de testes antes de receber dinheiro real.</p></div>
        </section>}
      </div>
    </Modal>}
  </>;
}
