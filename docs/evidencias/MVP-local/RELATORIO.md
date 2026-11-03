# Entrega do MVP 1 local e protótipo para Pages

Referência: 03/11/2026. Modos financeiros: exclusivamente mockados, por orientação do usuário.

## Escopo efetivamente implementado

Cadastro/login, sessões HTTP-only, perfil e recuperação local; catálogo e calendário públicos; login ao personalizar com retomada de data/produto; opções configuráveis; sacola/revisão; reserva transacional; simulador Pix/cartão; confirmação persistente; acompanhamento; administração de produtos, agenda, limites, exceções e pedidos; produção, impressão e cancelamento/reembolso separados.

Runtime local: Next.js 16.4.4, React 19.3.1, TypeScript 5.9.3, PostgreSQL 18.6 por embedded-postgres, node-postgres e RLS. A autenticação é própria com hash scrypt e sessão no servidor. Não foi configurado Supabase hospedado.

Pages: build Vite reutiliza componentes, com adaptador de estado fictício no navegador e rotas por hash. Não inclui servidor, banco compartilhado, credenciais de banco, webhook ou autenticação comercial. Aviso de dados fictícios permanece visível.

## Evidências por tarefa

| Tarefa | Entrega local verificada |
| --- | --- |
| M00 | Workspace, manifests/lockfile, scripts, TypeScript, ESLint, CI e bloqueio de modo fake comercial |
| M01 | PostgreSQL reconstruível, cadastro/login/perfil, recuperação de uso único, sessões e RLS |
| M02 | Cadastro/edição/arquivamento de produto, imagem por URL/caminho, sabores/complementos/campos |
| M03 | Agenda, publicação, capacidades, horários e exceção por cliente/data |
| M04 | Catálogo público, login ao personalizar, carrinho e revisão responsivos |
| M05 | Reserva, snapshot, expiração e concorrência em PostgreSQL real |
| M06 | Pagamentos mockados, eventos idempotentes e tratamento de aprovação tardia |
| M08 | Histórico, detalhe persistente, resumo, solicitação de cancelamento e link WhatsApp quando configurado |
| M09 | Produção, filtros, impressão, cancelamento manual e reembolso simulado |
| M10 | Verificações locais e de navegador; homologação externa explicitamente adiada |

M07 (gateway real) depende da decisão com o cliente e foi adiada pelo usuário. M11/M12 comerciais não fazem parte da publicação demonstrativa no Pages.

## Verificações realizadas

- `pnpm test`: 7 testes unitários de configuração, datas civis, centavos, personalização e versões comerciais.
- `pnpm test:integration`: 18 testes aprovados contra PostgreSQL real em pipoca_test, incluindo 20 requisições pela última unidade/slot, RLS, expiração concorrente, cancelamento, snapshots e pagamento tardio.
- `pnpm test:e2e`: 10 testes aprovados no Chrome headless: jornada, catálogo público, retomada pós-login, recuperação, administração, cancelamento/reembolso, mobile e mídia de impressão.
- `pnpm typecheck` verifica os dois projetos; `pnpm lint` aprovado. `pnpm build` e `pnpm pages:build` gerados com sucesso.
- `pnpm test:pages`: 2 testes aprovados do build estático, cobrindo catálogo público, retomada pós-login, compra, persistência, troca de contas, administração, cancelamento/reembolso e mobile. Não utilizam PostgreSQL.
- Capturas de tela nesta pasta usam somente pessoas/dados fictícios.

As falhas intermediárias de fixtures de data, labels acessíveis, consulta administrativa e transbordamento de layout foram corrigidas antes da entrega. Reexecuções constam na sessão; não foram tratadas como sucesso.

## Limites práticos

- Não houve teste com dinheiro real, gateway sandbox/live, webhook externo ou reembolso bancário.
- CT-10 e partes de CT-11/18/20 relativas a fornecedor externo só foram simuladas. Não significam homologação real.
- Teste de 20 requisições prova os invariantes exercitados; não é certificação de capacidade de produção nem medição de p95 sob carga comercial.
- E-mail de recuperação é local; na versão Pages o link é simulado na própria tela.
- Catálogo, preços, endereço e contatos precisam de validação comercial. Não há WhatsApp definido inicialmente.
- Impressão foi verificada em mídia CSS de impressão; não há exportação financeira PDF/CSV nesta versão.
- Backups, restauração, SLAs, retenção, infraestrutura comercial e treinamento com a empresa continuam na pauta futura.
- Os papéis dos agentes foram usados sequencialmente; não foram iniciados subagentes. Seus arquivos de configuração foram preservados.

## Segurança do repositório

`.env.local`, `.local`, caches, node_modules e resultados transitórios estão ignorados. Credenciais geradas e acesso do Git Credential Manager não fazem parte do código nem do bundle público. Os acessos publicados são fictícios e exclusivamente demonstrativos.
