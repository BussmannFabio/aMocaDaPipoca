# Pauta para discutir com o cliente

Registrada por orientação explícita do usuário em 03/11/2026: a empresa ainda não tem gateway; o MVP deve operar com pagamentos mockados por enquanto.

## 1. Gateway e recebimento

- Qual provedor usar para Pix e cartão? Comparar taxas, prazo de recebimento e suporte.
- A conta ficará no nome/CNPJ da empresa? Quem terá acesso administrativo?
- O provedor oferece sandbox, notificações assinadas, consulta de transações, idempotência e reembolso?
- Cartão será somente à vista? Há interesse futuro em parcelamento e quem assume custos?
- Quem vai conciliar pagamentos pendentes e tratar cobranças recebidas após expiração da reserva?

**Depois da decisão:** configurar credenciais em armazenamento seguro, implementar adaptador e autenticação de notificações, homologar Pix/cartão/reembolsos e só então liberar vendas reais. Nenhum provedor foi escolhido nesta entrega.

## 2. Operação do ateliê

- Catálogo, fotos autorizadas, preços, unidades vendáveis e sabores reais.
- Capacidades por produto/data, horários e limite de pedidos por retirada.
- Endereço de retirada, WhatsApp oficial e responsáveis por produção/atendimento.
- Regras para liberação de exceções de antecedência.
- Política de cancelamento, prazo de análise e processo de reembolso.

## 3. Publicação comercial

- Contas de hospedagem/banco, domínio e custos recorrentes sob controle da empresa.
- Provedor de e-mail para cadastro/recuperação; a caixa atual é local, sem envio real.
- Aviso de privacidade, retenção de dados e canal de atendimento validados pela empresa.
- Backup/restauração, alertas e responsáveis por incidentes.
- Aprovação do piloto e eventual inclusão futura de entregas/serviços.

## Regra já definida pelo usuário

Catálogo e disponibilidade podem ser consultados sem login. Pedir conta somente quando o cliente começar a montar/personalizar o pedido, preservando sua escolha de data e produto.
