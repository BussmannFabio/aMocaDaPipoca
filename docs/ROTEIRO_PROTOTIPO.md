# Roteiro rápido do protótipo

## Acesso

- Pages: `https://bussmannfabio.github.io/aMocaDaPipoca/` (endereço de publicação configurado).
- Local: [abrir catálogo](http://127.0.0.1:3000/encomendar).
- **Cliente:** `cliente@pipoca.local` · **Admin:** `admin@pipoca.local`.
- **Senha dos dois:** `Pipoca@123`. Para trocar de perfil, use **Sair da conta**.

## Caminho do cliente

**Catálogo público → escolher data → personalizar produto → login → sacola → revisão → simulador → aprovar pagamento → Meus pedidos.**

O login só é pedido ao começar a montar o pedido. Data e produto escolhidos são retomados depois do acesso.

## Caminho da administração

**Entrar como admin → Administração → Visão geral → Agenda → Produtos → Encomendas → Produção → Configurações.**

Abra uma encomenda para iniciar produção, marcar como pronta ou registrar retirada. Cancelamentos exigem solicitação e decisão manual; o reembolso simulado tem acompanhamento separado.

## O que foi entregue

Catálogo por data, personalização, horários de retirada, cadastro/acesso, pedidos e histórico, reserva temporária, painel administrativo, produção/impressão e fluxo de cancelamento. Pix/cartão e reembolsos são mockados.

## Evolução possível

1. Escolher gateway com o cliente e homologar pagamentos reais.
2. Publicar o backend e banco compartilhado, com e-mail, backups e monitoramento.
3. Acrescentar entregas/frete por rota, eventos, financeiro e relatórios.
4. Ampliar capacidade com índices, filas de processamento e infraestrutura conforme demanda medida.

**Limite do Pages:** demonstração com dados fictícios salvos neste navegador. O PostgreSQL, as transações e o controle real de concorrência estão na versão local. O Pages não é uma loja comercial pronta para receber dinheiro.
