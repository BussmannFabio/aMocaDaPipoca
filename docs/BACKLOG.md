# Backlog executável do MVP

Status e dependências oficiais: [tasks.json](../agents/state/tasks.json).
Cada tarefa só começa depois das dependências concluídas. Estimativas agregadas estão no [plano](PLANO_MVP.md).
Todas as tarefas exigem relatório com arquivos, comandos executados, resultados e limitações.

## M00 · Criar fundação reproduzível

- Responsável: coordenador; apoio técnico backend/frontend. Dependências: nenhuma.
- Entrada: PRD, plano, arquitetura e decisões; ambiente com Node/pnpm ou instalação autorizada.
- Fazer: workspace pnpm, `apps/web`, TypeScript estrito, App Router, UI base, ESLint, runner unitário, scripts da raiz, `.env.example`, `.gitignore` e CI de lint/typecheck/build. Validar configuração de ambiente e impedir modo fake em produção comercial.
- Saídas: manifests/lockfile, configuração de ferramentas, aplicação mínima, ADR de versões e README de setup. Preservar documentos e instruções existentes.
- Aceite: instalação frozen em checkout limpo; `pnpm dev` abre; lint, typecheck, teste que prova rejeição de configuração fake no ambiente comercial e build passam; nenhum segredo no bundle/repositório.
- Evidência: versões exatas, comandos e resultados. Atualizar status para done somente após a verificação.

## M01 · Banco, autenticação e autorização

- Responsável: backend. Dependências: M00.
- Entrada: modelo mínimo e política cliente/admin.
- Fazer: PostgreSQL local com autenticação por sessão no servidor (ADR-12), migrations iniciais de perfis/papéis/configurações, cadastro/login/recuperação/edição de perfil, sessão no servidor, RLS e procedimento de criação do admin.
- Saídas: migrations, seed sintético, scripts db:start/db:reset/test:integration, UI de acesso e testes de isolamento.
- Aceite: banco pode ser reconstruído localmente; cliente não acessa admin; usuário A não lê/altera perfil de B; não há autopromoção de papel; reset recusa host remoto; recuperação de senha funciona no capturador local.
- Testes: CT-01, CT-02, CT-14. Não configurar contas de produção nesta tarefa.

## M02 · Configuração administrativa de produtos

- Responsável: backend, com UI implementada pelo frontend sob escopo exclusivo. Dependências: M01.
- Entrada: modelo produto/opções e tipos de personalização do PRD.
- Fazer: CRUD/arquivamento, foto, unidade, preço, mínimo/máximo, antecedência e schema de sabores/complementos; loja/WhatsApp/retirada.
- Saídas: migrations de catálogo, validação server-side e telas responsivas administrativas.
- Aceite: admin cadastra/edita/arquiva produto; opções variam sem alterar código; limites/preços inválidos são rejeitados; cliente não altera catálogo; ausência de foto tem fallback acessível; snapshot futuro pode versionar opções.
- Testes: CT-06, CT-14. Usar fotos sintéticas/permitidas e dados fictícios até materiais reais estarem disponíveis.

## M03 · Agenda, disponibilidade e exceções

- Responsável: backend. Dependências: M02.
- Entrada: RN-01 a RN-04, RN-13 e RN-14.
- Fazer: datas fechadas por padrão, publicação, oferta por produto/data, capacidade, slots, exceção cliente/data com motivo e auditoria; leitura pública do calendário/catálogo; operações de pedido continuam autenticadas.
- Saídas: migrations, funções/serviços de elegibilidade, tela admin e contrato de leitura da oferta.
- Aceite: 14/15/16 dias corretamente tratados; item pode exigir antecedência maior; exceção não ignora bloqueio/capacidade; limite não pode ficar abaixo do comprometido; calendário distingue estados com texto.
- Testes: CT-03, CT-04, CT-05. Fixar contrato de disponibilidade antes de M04/M05.

## M04 · Jornada de catálogo e carrinho

- Responsável: frontend. Dependências: M03.
- Entrada: contrato de oferta, design básico e validação de opções.
- Fazer: calendário do cliente, catálogo por data, personalização, carrinho com data/slot únicos, revisão do resumo, estados vazios/erro/carregamento; iniciar Playwright.
- Saídas: telas e testes E2E da jornada até revisão, com dados do banco local.
- Aceite: sem sessão consulta agenda/catálogo; personalizar pede login e retoma a seleção; sem oferta não há item comprável; sabores somam quantidade; mudança de data revalida itens; total exibido deriva de resposta do servidor; funciona em 360 px e com teclado.
- Testes: CT-01, CT-03 a CT-07, CT-16. Sem botão que simule uma compra aprovada na UI.

## M05 · Reserva transacional e snapshot

- Responsável: backend. Dependências: M03.
- Entrada: contratos de oferta e arquitetura de reserva.
- Fazer: pedidos/itens/snapshot, reservas, chave de checkout idempotente, locks e constraints; expiração por job e sob demanda; validação de preços/regras no servidor.
- Saídas: migrations, caso de uso checkout/reserve, comando reservations:expire e testes em PostgreSQL real.
- Aceite: requisições concorrentes da última unidade geram uma única reserva; pedido com vários itens é tudo ou nada; slot também limita; repetição retorna mesmo pedido; payload diferente com mesma chave conflita; job duplo libera uma vez; snapshot não muda com edição do produto.
- Testes: CT-07, CT-08, CT-09, CT-12, CT-13, CT-19. Não vale teste com banco mockado para provar concorrência.

## M06 · Pagamento simulado e máquina de estados

- Responsável: pagamentos. Dependências: M05.
- Entrada: contrato PaymentProvider, reserva e estados independentes.
- Fazer: adaptador fake determinístico, tentativas idempotentes, eventos persistidos, confirmação/rejeição/expiração, recuperação de timeout e ramo de aprovação tardia; ligar checkout à UI.
- Saídas: módulo payments, fixtures/eventos sintéticos, tela de pagamento e confirmação local.
- Aceite: fake exercita Pix/cartão sem movimentar dinheiro; retorno do navegador não confirma; webhook repetido não duplica; aprovação tardia sem capacidade abre exceção; pagamento fake não pode ser habilitado em ambiente comercial.
- Testes: CT-08 a CT-13, CT-18, CT-19. Esta tarefa não entrega integração real.

## M07 · Selecionar e homologar gateway real

- Responsável: pagamentos. Dependências: M06. Entrada externa: D-02.
- Fazer primeiro: spike com documentação oficial e sandbox comparando Pix/cartão, assinatura, idempotência, expiração, consulta, duplicidade, reembolso e titularidade da conta. Registrar decisão e limites operacionais.
- Fazer depois: adaptador real, checkout hospedado, Pix QR/copia e cola, autenticação de webhook, consulta de transação, retries e conciliação; mapear estados reais; documentar job e variáveis.
- Saídas: ADR do gateway, integração, comando payments:reconcile, configuração de sandbox e instruções para endpoint de webhook.
- Aceite: Pix e cartão aprovados/recusados em sandbox; assinatura inválida falha; valor/moeda/conta divergentes não confirmam; timeout não cria outra cobrança; evento perdido é conciliado; reembolso verificável e alerta de exceção funcionam.
- Testes: CT-10, CT-11, CT-18, CT-20. Credenciais ausentes bloqueiam esta tarefa; M08/M09 podem seguir.

## M08 · Acompanhamento e confirmação do cliente

- Responsável: frontend. Dependências: M04, M06.
- Entrada: estados do pedido/pagamento, dados de retirada e configuração WhatsApp.
- Fazer: meus pedidos, detalhe, atualização de pendência, recuperação após fechar navegador, resumo e link WhatsApp URL-encoded; solicitação de cancelamento.
- Saídas: área do cliente e E2E com fake local.
- Aceite: confirmação existe sem abrir WhatsApp; pedido pendente não aparece como pago; cliente só vê seus pedidos; resumo inclui número, itens, sabores, data/horário, retirada, total e pagamento; solicitação não cancela automaticamente; sem contato configurado há orientação útil.
- Testes: CT-11, CT-14, CT-15, CT-17. Link não deve conter CPF, senha, token nem documento.

## M09 · Operação administrativa e cancelamentos

- Responsável: backend; UI em colaboração com frontend. Dependências: M02, M06.
- Entrada: estados, pedidos confirmados e fluxo de reembolso do adaptador.
- Fazer: lista/filtros, detalhe/histórico, produção/pronto/retirado, ficha imprimível e consolidado por data/sabor; decisão manual de cancelamento, liberação idempotente e status de reembolso; totais simples de pagos/pendentes.
- Saídas: painel responsivo, impressão A4 e auditoria.
- Aceite: filtro e soma não contam pagamento duplicado nem pedido pendente; transição inválida é recusada; cancelamento libera uma vez; falha de reembolso fica visível; ficha e consolidado batem com snapshots; sem admin não há acesso.
- Testes: CT-12, CT-14, CT-17, CT-21. No fake testar estados; homologação financeira real depende de M07/M10.

## M10 · Verificar regras críticas e jornada integrada local

- Responsável: qa. Dependências do aceite local: M06, M08, M09. M07 é obrigatória para homologação externa futura.
- Entrada: matriz de testes e ambiente local/fake; sandbox externo adiado pelo usuário.
- Fazer: executar unitários, RLS/integração em banco real, concorrência e E2E; verificar acessibilidade básica, mobile, impressão, logs e recuperação. Abrir defeitos reproduzíveis; responsáveis corrigem antes do marco.
- Saídas: evidências por cenário, relatório de riscos e matriz preenchida em docs/evidencias/M10.
- Aceite local: cenários sem fornecedor externo passam; CT-10 e partes externas de CT-11/18/20 ficam pendentes de M07; nenhum defeito de exposição de dados, perda financeira, inconsistência de capacidade ou confirmação indevida permanece; build/lint/typecheck passam; métricas de latência registradas com metodologia.
- Testes não executados são explicitados e impedem declarar o respectivo aceite. Sem substituir sandbox por fake.

## M11 · Preparar release e operação

- Responsável: coordenador, revisão qa. Dependências: M07, M10. Entradas externas: D-01 a D-06 conforme escopo.
- Fazer: validar recorte com empresa, preparar contas/ambientes, domínio, HTTPS, segredos, jobs, alertas, políticas, backup/restauração, rollback e guias de atendimento. Preparar preview revisável antes da autorização de publicação, se necessária.
- Saídas: checklist preenchido, runbook do release, evidência de restauração e pacote de treinamento.
- Aceite: propriedade das contas com a empresa, fake desabilitado em live, webhook e jobs reais verificados, valores/contato/retirada corretos, plano de reembolso praticável, backup restaurado em ambiente isolado, autorização de piloto registrada conforme a sessão.
- Verificar [Operação](OPERACAO.md). Falta de decisão comercial não impede entregar o preview e a documentação técnica.

## M12 · Executar piloto e entregar

- Responsável: coordenador, apoio qa/produto. Dependências: M11.
- Entrada: ambiente e piloto autorizados, dados de catálogo e responsáveis disponíveis.
- Fazer: publicar, realizar compra real de baixo valor sob autorização, conciliar pedido/capacidade/pagamento e tratar retirada/reembolso conforme roteiro; treinar administração; acompanhar amostra do piloto e registrar melhorias.
- Saídas: registro do release e transação redigida, treinamento, manual de uso, acessos entregues e backlog pós-piloto.
- Aceite: ciclo comercial verificado, sem inconsistência financeira, administradora consegue abrir data/produzir/cancelar, empresa controla acessos e tem canal de suporte; metas do piloto medidas ou inconclusão explicitada com tamanho de amostra.
- Só marcar done após aceite operacional. Não afirmar que vendas reais ocorreram a partir de testes sandbox.
