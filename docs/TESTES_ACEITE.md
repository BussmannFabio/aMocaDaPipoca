# Testes e aceite

Matriz de requisitos com execução local registrada em docs/evidencias/MVP-local/RELATORIO.md. Partes de gateway externo continuam pendentes; mocks não representam homologação.
Responsável por evidências: papel qa; implementadores devem criar os testes junto das regras.

## Matriz de cenários

| ID | Cenário e resultado esperado | Camada | Tarefas |
| --- | --- | --- | --- |
| CT-01 | Catálogo/agenda públicos; login ao personalizar com retomada; cadastro/login/recuperação funcionais | E2E + integração | M01, M04 |
| CT-02 | Cliente não acessa admin nem promove o próprio papel; chamada direta é recusada | API + RLS real | M01 |
| CT-03 | Relógio 03/11/2026 São Paulo: 17/11 consulta; 18/11 e 19/11 permitem com oferta; testar virada do dia | Unitário + E2E | M03, M04 |
| CT-04 | Exceção só para cliente/data previstos; revogada não vale; não ignora bloqueio/limites; item com maior antecedência é respeitado | Integração | M03 |
| CT-05 | Data não publicada/fechada impede checkout; aberta/parcial/esgotada aparecem corretamente; fechar mantém contratos anteriores | Integração + E2E | M03 |
| CT-06 | Somente produtos liberados; mínimo/máximo, opções válidas e soma de sabores iguais à quantidade; forjar payload é recusado | Unitário + integração + E2E | M02, M04 |
| CT-07 | Servidor ignora total adulterado; mudança de preço pede revisão; mistura de datas/slots é recusada; slot cheio bloqueia | Integração | M04, M05 |
| CT-08 | Vinte clientes disputam última unidade e depois último slot: só uma reserva vence e nunca há saldo negativo | PostgreSQL real concorrente | M05, M06 |
| CT-09 | Expiração e job repetidos liberam uma vez; job atrasado não mantém falsa disponibilidade no checkout | Banco real, relógio controlado | M05 |
| CT-10 | Pix QR/copia e cola, cartão aprovado/recusado/expirado no sandbox; reabrir sessão recupera cobrança sem duplicar | Gateway sandbox + E2E | M07 |
| CT-11 | Redirect ou evento forjado não confirma; evento autêntico repetido confirma uma vez; pendência atrasada não regride aprovado | Integração + sandbox | M06, M07, M08 |
| CT-12 | Cancelamento solicitado não libera capacidade; negar preserva pedido; aprovar libera uma vez; reembolso com falha fica pendente/visível | Integração + painel | M05, M09 |
| CT-13 | Snapshot preserva preço, sabor, regra e dados de retirada após edição/arquivamento; idempotência de checkout/cobrança persiste após restart | Integração | M05, M06 |
| CT-14 | Cliente A não lê/altera pedido/perfil de B por URL, API ou SQL exposto; admin autorizado acessa; service key não aparece no cliente/log | RLS + API + build | M01, M02, M08, M09 |
| CT-15 | Cliente fecha tela e não usa WhatsApp; pedido confirmado e resumo continuam consultáveis, link não contém dados desnecessários | E2E | M08 |
| CT-16 | Fluxos essenciais em 360 px/desktop, teclado, labels, foco e erros; nenhum estado depende só de cor | E2E + revisão visual | M04, M08, M09 |
| CT-17 | Histórico e cancelamento visíveis; ficha A4 e consolidado por data/sabor batem com pedidos confirmados não cancelados | E2E + impressão | M08, M09 |
| CT-18 | Aprovação depois de expirar: com capacidade readquire/confirmada uma vez; sem capacidade ou pedido cancelado abre exceção e reembolso sem confirmar | Banco real + sandbox | M06, M07 |
| CT-19 | Carrinho multi-item sem saldo em um item desfaz tudo; expiração e aprovação simultâneas não duplicam/liberam consumo; reduzir limite abaixo do comprometido falha | PostgreSQL real concorrente | M05, M06 |
| CT-20 | Timeout de criação, webhook perdido, valor/moeda/conta divergentes, segunda tentativa aprovada e reembolso repetido: conciliação recupera sem duplicar | Sandbox + falhas controladas | M07 |
| CT-21 | Admin filtra/move produção; transições inválidas recusadas; totais pagos não somam tentativas duplicadas; pedido retirado não aceita autosserviço de cancelamento | Integração + E2E | M09 |

## Dados e execução reproduzível

Seed: dois clientes, um admin, três produtos, dois sabores, um complemento pago, data aberta/fechada/esgotada e dois horários, incluindo oferta de uma unidade e slot de um pedido.
Datas de teste são relativas a um relógio injetável, com um teste explícito de fronteira São Paulo. Fixtures não podem começar a falhar porque a data atual avançou.
Testes concorrentes usam clientes/chaves diferentes e barreira de início. Conferir respostas e estado persistido: pedidos, reservas, contadores, tentativas e histórico.
Repetir o cenário crítico com múltiplas conexões de banco; não usar execução sequencial que apenas parece simultânea.

Testes unitários cobrem cálculo de elegibilidade, centavos, personalização e estados.
Testes de integração cobrem SQL/RLS/locks e idempotência com PostgreSQL local real.
E2E local usa fake determinístico; homologação adiciona testes reais do gateway em sandbox. Separar resultados no relatório.

## Evidência por tarefa e marco

Em `docs/evidencias/<ID>/`, registrar commit/revisão, ambiente, versões, comando, resultado, cenário, dados sintéticos e defeitos corrigidos/pendentes. Criar pasta quando a tarefa for executada.
Screenshots precisam estar sem dados sensíveis. Não anexar segredos ou payloads completos de pagamento.

Gate de piloto: todos os CT críticos aprovados, lint/typecheck/build passando, observabilidade, backup e reembolso verificados.
Falha crítica bloqueia release; resultado não executado não é aprovado.
