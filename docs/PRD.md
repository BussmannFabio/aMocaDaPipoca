# PRD · Central de Encomendas

Versão 1.0 · 03/11/2026 · Status: MVP 1 local implementado; pagamento real e piloto comercial pendentes.
Fonte de requisitos: PDF indicado em [Referências](REFERENCIAS.md), páginas 2 a 8.
O PDF define regras do negócio completo. Decisões técnicas e recorte do MVP abaixo são propostas, identificadas como tais.

## 1. Problema e resultado esperado

A empresa precisa vender encomendas e contratar serviços respeitando a operação real de cada data.
O resultado esperado é uma compra autônoma, com pagamento e registro confiáveis, e uma administração que controla capacidade, produção e atendimento em celular e computador.

Princípio central: o cliente só pode contratar aquilo que a empresa liberou para a data e cuja capacidade ainda comporta o pedido.
Riscos de maior impacto: excesso de vendas, confirmação sem pagamento, duplicidade de cobrança/pedido e perda do registro da contratação.

## 2. Usuários

| Pessoa | Necessidade | Sucesso observável |
| --- | --- | --- |
| Cliente | Encontrar data e itens, personalizar e pagar | Pedido confirmado e consultável sem atendimento humano |
| Administradora | Abrir datas, definir itens e acompanhar vendas | Controlar capacidade e pedidos no celular |
| Operação/produção | Saber o que preparar e quando entregar | Ficha e consolidado coerentes com pedidos confirmados |

MVP: dois papéis de acesso, cliente e administrador. Produção utiliza a visão administrativa; permissões específicas para uma equipe maior ficam para evolução.

## 3. Objetivos e métricas

Metas técnicas de aceite: zero venda acima da capacidade; zero duplicação por reenvio; 100% dos pedidos confirmados ligados a pagamento integral verificado; 100% dos pedidos com snapshot comercial e histórico.

Hipóteses de negócio para o piloto, a validar com a empresa: pelo menos 10 encomendas reais acompanhadas, 80% concluídas sem intervenção no fluxo digital e redução de 30% no tempo de atendimento por pedido em relação a uma amostra anterior.
Coletar eventos `agenda_viewed`, `catalog_viewed`, `checkout_started`, `payment_verified`, `order_confirmed` e falhas por etapa; não enviar nome, telefone, CPF, endereço ou observações a analytics.
Conversão usa usuários que iniciaram checkout como denominador e pedidos confirmados como numerador. Não há baseline atual; coletá-lo antes do piloto.

## 4. Escopo por versão

| Capacidade | MVP 1: encomendas com retirada | V1.1: entregas e operação | V1.2: serviços e eventos |
| --- | --- | --- | --- |
| Cadastro, login, recuperação e histórico | Sim; autenticação ao personalizar | Endereços salvos | Preferências avançadas |
| Agenda por data, antecedência e exceção | Sim | Copiar configuração entre datas | Recursos e limites de eventos |
| Produtos, fotos, sabores e complementos | Sim | Personalização avançada | Serviços por convidados/duração |
| Retirada em horário publicado | Sim | Sim | Sim |
| Entrega e tarifa independente | Não | Sim, por rota | Sim |
| Evento e deslocamento ida/volta | Não | Não | Sim |
| Pix e cartão com aprovação efetiva | Sim | Sim | Sim |
| WhatsApp | Link com resumo após confirmação | Avaliar envio automático oficial | Evoluir notificações oficiais |
| Gestão e ficha de produção | Sim, impressão pelo navegador | Exportações e financeiro detalhado | Consolidado de eventos/logística |
| Clientes e relatórios | Histórico básico e totais pagos | CRM, recorrência e exportação CSV/PDF | Relatórios por serviço |

O recorte precisa ser validado pela empresa antes do piloto. Não representa o atendimento integral ao PDF.
Etapas internas: demonstração local com simulador; homologação com gateway real em sandbox; piloto comercial com credenciais e operação prontas. Só o piloto recebe pagamentos reais.

## 5. Jornada do MVP

1. Visitante acessa o catálogo e o calendário sem login.
2. Consulta calendário e escolhe data. Ao começar a personalizar um produto, entra ou cria conta com nome, WhatsApp, e-mail e senha; a seleção é retomada após o acesso. Datas abaixo da antecedência levam à consulta pelo WhatsApp, salvo exceção administrativa válida.
3. Vê somente produtos liberados e disponíveis na data; escolhe quantidade, sabores, complementos e observações.
4. Seleciona horário de retirada publicado. Um carrinho tem uma única data e um único horário.
5. Confere dados, itens, personalizações e total calculado pelo servidor. CPF só se necessário ao gateway; RG e endereço residencial não são coletados neste recorte.
6. Servidor cria pedido provisório e reserva temporária. Cliente paga integralmente por Pix ou cartão.
7. Aprovação verificada confirma pedido, converte a reserva em consumo e exibe número e resumo. Link para WhatsApp é opcional para o cliente.
8. Administradora acompanha, imprime ficha, move a produção e registra retirada ou analisa solicitação de cancelamento.

## 6. Requisitos funcionais

| ID | Requisito verificável | Versão |
| --- | --- | --- |
| RF-01 | Cadastro, login, recuperação, edição de perfil e histórico; catálogo/agenda públicos; autenticação ao começar a personalizar o pedido | MVP |
| RF-02 | Calendário distingue aberta, parcial, fechada, esgotada e sob consulta, com legenda textual | MVP |
| RF-03 | Antecedência padrão de 15 dias corridos e exceção administrativa auditável por cliente/data | MVP |
| RF-04 | Administração abre/bloqueia datas, configura oferta, limites e horários | MVP |
| RF-05 | Catálogo por data com foto, descrição, preço, unidade, mínimo/máximo e arquivamento | MVP |
| RF-06 | Sabores, distribuição de quantidades, complementos e observações configuráveis por produto | MVP |
| RF-07 | Retirada com horário e limite de pedidos; horário indisponível impede checkout | MVP |
| RF-08 | Carrinho, revisão e totais de origem exclusivamente no servidor | MVP |
| RF-09 | Reserva temporária transacional de todos os itens e do horário, com expiração | MVP |
| RF-10 | Pix com QR/copia e cola e cartão em checkout hospedado; registrar pendência, recusa, expiração e falha | MVP |
| RF-11 | Confirmação somente após verificação do gateway, número único, histórico e snapshot | MVP |
| RF-12 | Confirmação persistente e link WhatsApp com resumo; abrir/enviar não é condição para confirmar | MVP |
| RF-13 | Pedidos no painel com filtros de data, cliente, status e pagamento; detalhe e produção | MVP |
| RF-14 | Solicitação de cancelamento pelo cliente; decisão manual, motivo e acompanhamento de reembolso | MVP |
| RF-15 | Ficha imprimível individual e consolidado por data/sabor de pedidos não cancelados | MVP |
| RF-16 | Configurações básicas: loja, contato, endereço de retirada, antecedência e horários | MVP |
| RF-17 | Entrega por CEP/endereço, área atendida e tarifa própria baseada em rota real | V1.1 |
| RF-18 | Serviços configuráveis por convidados, duração, início, recursos e limite de eventos | V1.2 |
| RF-19 | Frete de evento por rota real de ida e volta, mínimo e adicionais configuráveis | V1.2 |
| RF-20 | CRM, preferências, financeiro por período/item, CSV/PDF e cópia de agenda | V1.1 |
| RF-21 | Envio automático por integração oficial WhatsApp com tratamento de falhas | V1.1, condicionado à decisão comercial |

## 7. Regras de negócio

| ID | Regra |
| --- | --- |
| RN-01 | Diferença entre datas civis em America/Sao_Paulo; exatamente 15 dias permite compra. Antecedência efetiva é o maior valor entre loja e item. |
| RN-02 | Exceção MVP vale para cliente/data e pode dispensar antecedência da loja e do item explicitamente; nunca libera data bloqueada ou capacidade inexistente. |
| RN-03 | Data não publicada começa fechada. Oferta exige item ativo, liberação por data, saldo e modalidade suportada. |
| RN-04 | Disponível = capacidade menos quantidade confirmada menos reservas ativas. Limites de produto e horário são independentes e todos devem caber. |
| RN-05 | Reserva inicial proposta de 15 minutos, definida pelo servidor e compatibilizada com o gateway. Expiração libera capacidade uma única vez. |
| RN-06 | Pedido reúne somente uma data/retirada; mudar data ou horário exige revalidar o carrinho inteiro. Não há estoque reservado ao simplesmente adicionar ao carrinho. |
| RN-07 | Quantidades inteiras, limites configurados, soma da distribuição de sabores igual à quantidade e complementos permitidos. Campos do MVP: escolha simples, múltipla, texto e distribuição por sabor; validar no servidor. |
| RN-08 | Preço em BRL/centavos; pagamento integral, sem desconto ou parcelamento interno. Proposta inicial: cartão à vista; outras condições dependem de decisão registrada. |
| RN-09 | Pedido pendente existe antes do gateway para permitir rastreio. Número interno único existe na criação; aprovação gera a confirmação definitiva sem criar um segundo pedido. |
| RN-10 | Snapshot inclui descrição, unidade, preços, regras/opções, data, horário, cliente, modalidade e taxas aplicadas. Editar catálogo não altera pedidos anteriores. |
| RN-11 | Reenvio, refresh, duplo clique e webhook duplicado não podem duplicar pedido, cobrança ou consumo. Retorno do navegador nunca é prova de pagamento. |
| RN-12 | Aprovação tardia só confirma se conseguir readquirir capacidade em transação. Sem capacidade: abrir exceção financeira, não confirmar e encaminhar reembolso integral. |
| RN-13 | Fechar data impede novas reservas. Reservas anteriores válidas podem ser pagas até expirar; fechar não cancela contratos existentes. Bloqueio urgente exige tratamento explícito dos pedidos afetados. |
| RN-14 | Reduzir capacidade abaixo de confirmados + reservas ativas é proibido. Arquivar produto preserva histórico e pedidos existentes. |
| RN-15 | Cancelamento tem solicitação e decisão manual, separados do andamento operacional. Aprovar cancelamento libera capacidade uma vez; reembolso tem status próprio e exige verificação do provedor. |
| RN-16 | Produção e consolidado incluem confirmados/em produção/prontos/concluídos conforme filtro, excluem pendentes, cancelados e pagamentos em exceção. Consolidado identifica o filtro utilizado. |
| RN-17 | Dados pessoais mínimos; nenhum dado completo de cartão. Permissão administrativa atribuída por procedimento privilegiado auditável, nunca pelo formulário do cliente. |

RN-02, RN-05, RN-06, RN-08, RN-12 e RN-13 detalham lacunas do briefing: são decisões propostas que podem ser refinadas antes de suas tarefas dependentes.

## 8. Requisitos não funcionais

- Acesso: cliente consulta somente seus pedidos; administrador autorizado gerencia a operação; verificar API e banco.
- Consistência: transações PostgreSQL, constraints e idempotência; nenhuma capacidade negativa sob concorrência.
- Usabilidade: português do Brasil, layout em 360 px e desktop, teclado, foco visível, labels e mensagens claras, estados de carregamento/erro. Paleta do PDF como referência, validar contraste antes de adotá-la.
- Desempenho proposto: p95 de leituras internas abaixo de 1 s e checkout interno abaixo de 2 s sob 20 sessões concorrentes, excluindo latência do gateway; medir em homologação com dataset documentado. Disponibilidade de terceiros deve aparecer separadamente.
- Operação: logs estruturados por pedido/transação sem dados sensíveis; alertas de pagamentos sem conciliação e falhas dos jobs. Confirmação interna até 60 s após receber evento válido, em condição normal de homologação.
- Recuperação proposta para piloto: backup diário, RPO de até 24 h e RTO de até 4 h; só prometer após teste e conferência do plano contratado.
- Privacidade: aviso de uso de dados, canal para solicitações e política de retenção a definir com a empresa. Não excluir registros financeiros automaticamente sem política validada.
- Manutenção: migrations, seed sintético, testes das regras críticas e instalação documentada em ambiente limpo.

## 9. Aceite da versão

Cliente deve concluir cadastro → data → produto personalizado → retirada → Pix/cartão → confirmação → consulta.
Admin deve configurar essa venda e executar produção/retirada/cancelamento com histórico.
Todos os cenários críticos da [matriz de testes](TESTES_ACEITE.md) devem passar, especialmente última unidade, webhook repetido, pagamento tardio e isolamento entre clientes.
Homologação e piloto têm critérios adicionais em [Operação](OPERACAO.md).

## 10. Fora do MVP e próximos marcos

V1.1: entrega por rota, tarifas independentes, endereços, CRM/exportações e eventual WhatsApp oficial automático.
V1.2: serviços, capacidade por convidados, recursos/horários de eventos e deslocamento de ida e volta.
Fora do projeto atual: marketplace, ERP fiscal, assinatura, estoque de matérias-primas, aplicativo nativo e IA atendente.

As fases futuras exigem novo detalhamento antes de implementação; o plano executável deste pacote cobre M00 a M12 do MVP.
