# Plano de execução do primeiro MVP

Estado atual: MVP 1 local implementado. Gateway real e piloto comercial adiados; protótipo público estático solicitado pelo usuário. Backlog detalhado em [BACKLOG.md](BACKLOG.md).
Escopo proposto em [PRD.md](PRD.md); premissas e bloqueios em [DECISOES.md](DECISOES.md).

## 1. Entregas e marcos

Revisão de execução: M00–M06 e M08–M10 entregues no ambiente local/fake; M07 e o piloto comercial aguardam decisões externas. A publicação no Pages é uma demonstração estática adicional, não o marco G4 comercial. Veja o [relatório](evidencias/MVP-local/RELATORIO.md) e o [roteiro](ROTEIRO_PROTOTIPO.md).

| Marco | Tarefas | Demonstração para considerar concluído |
| --- | --- | --- |
| G0 · Fundação reproduzível | M00, M01 | Instalação limpa, banco local, seed e usuário cliente/admin funcionais |
| G1 · Oferta operável | M02, M03, M04 | Admin abre data; visitante consulta a oferta; login ao personalizar |
| G2 · Venda local íntegra | M05, M06, M08, M09 | Reserva atômica, pagamento simulado, pedido consultável e produção |
| G3 · Integração homologada | M07, M10 | Pix/cartão em sandbox, concorrência, RLS, expiração e reconciliação comprovados |
| G4 · Piloto publicado | M11, M12 | Ambiente real preparado, aceite operacional, compra real supervisionada e entrega treinada |

G2 é uma demonstração técnica. Não atende o requisito de gateway homologado nem autoriza receber dinheiro.
Pode-se mostrar G2 enquanto credenciais de sandbox são providenciadas, sem declarar M07 concluída.

## 2. Ordem de execução

```text
M00 -> M01 -> M02 -> M03 -> M04
                         M03 -> M05 -> M06 -> M07
                         M04 + M06 -> M08
                         M02 + M06 -> M09
                         M07 + M08 + M09 -> M10 -> M11 -> M12
```

Depois de M03, interface de catálogo (M04) e transação de reserva (M05) podem ser executadas em paralelo com contratos estáveis.
Depois de M06, pagamentos reais (M07), acompanhamento (M08) e administração de pedidos (M09) têm arquivos distintos.
O coordenador integra alterações compartilhadas; não há paralelismo obrigatório. Os papéis também funcionam sequencialmente.

## 3. Estimativa para planejamento

Estimativa inicial: 35 a 52 dias úteis de esforço de uma pessoa experiente, incluindo testes e entrega, com incerteza adicional para integrações e revisão da empresa. Não é orçamento nem compromisso de prazo.

| Bloco | Esforço estimado | Risco principal |
| --- | --- | --- |
| M00 a M03 | 9 a 13 dias | Modelo de oferta e políticas de acesso |
| M04 a M06 | 9 a 13 dias | Personalização e atomicidade |
| M07 a M09 | 9 a 14 dias | Gateway e operação de cancelamento |
| M10 a M12 | 8 a 12 dias | Homologação, operação e correções |

Agentes não tornam etapas dependentes simultâneas. Revisar estimativa após G0 e após o spike do gateway em M07.
Tempos de cadastro, credenciais e validação externa não estão incluídos no esforço.

## 4. Primeira sessão: M00

1. Ler instruções, escopo e decisões; inspecionar repositório sem sobrescrever os documentos.
2. Conferir Node, pnpm, Git e suporte ao ambiente local Supabase. Escolher versões estáveis compatíveis, registrar em ADR e fixar Node/packageManager e lockfile. Não deixar `latest` nas dependências do projeto.
3. Criar workspace pnpm na raiz, com aplicação em `apps/web`. Gerar o Next.js em subdiretório preserva este pacote e seu AGENTS.md.
4. Criar aplicação com TypeScript, App Router, ESLint e Tailwind. Exemplo inicial, a conferir na documentação no dia da execução:

```powershell
pnpm create next-app@latest apps/web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
```

5. Adicionar scripts da raiz que encaminhem ao workspace e ferramentas de teste; nenhum script de teste pode ser um placeholder que retorna sucesso.
6. Preparar `.env.example`, ignorar `.env.local`, criar rotas de saúde sem segredos e configurar CI de verificações estáticas/build.
7. Executar instalação limpa, lint, typecheck e build. Registrar logs e limitações em relatório da tarefa.

Saída mínima: aplicação abre em localhost, diretórios e scripts existem, README técnico permite outra pessoa repetir. M00 não implementa pagamento ou toda a jornada.

## 5. Estrutura prevista após M00/M01

```text
apps/web/src/
  app/(auth)/                 cadastro e acesso
  app/(cliente)/              agenda, catálogo, checkout, meus pedidos
  app/admin/                  operação administrativa
  app/api/                    webhooks e tarefas internas autenticadas
  modules/
    identity/
    catalog/
    availability/
    checkout/
    payments/
    orders/
  shared/                     UI e utilitários realmente compartilhados
supabase/
  migrations/
  seed.sql
tests/
  integration/
  e2e/
docs/evidencias/
```

Não criar módulos de serviços/mapas vazios. Não usar dados reais de clientes no seed.

## 6. Contrato dos comandos da aplicação

Os comandos abaixo estão implementados. O conciliador informa pendências fake; não há consulta a gateway externo nesta versão.

| Comando na raiz | Obrigação | Quando existe |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | Instalar versões fixadas | M00 |
| `pnpm dev` | Iniciar web local | M00 |
| `pnpm lint` | ESLint sem alterações automáticas | M00 |
| `pnpm typecheck` | TypeScript sem emitir código | M00 |
| `pnpm test` | Testes unitários das regras existentes | M00, ampliado a cada tarefa |
| `pnpm build` | Build de produção | M00 |
| `pnpm db:start` | Iniciar stack local, documentar runtime necessário | M01 |
| `pnpm db:reset` | Reset exclusivamente do banco local e seed sintético | M01 |
| `pnpm test:integration` | Testes contra PostgreSQL local real, incluindo RLS e concorrência | M01, ampliado até M10 |
| `pnpm test:e2e` | Jornada com Playwright em banco isolado | M04, completado em M10 |
| `pnpm payments:reconcile` | Job idempotente de consulta de pendências no provedor | M07 |
| `pnpm reservations:expire` | Job idempotente de expiração de reservas | M05 |

Após M01, o onboarding esperado é: copiar exemplo de ambiente, instalar, iniciar banco, aplicar reset local e executar `pnpm dev`.
M01 documenta nomes e valores locais gerados pela CLI, e faz os scripts recusarem host remoto em reset. Não usar essas rotinas destrutivas em produção.
Jobs de produção têm agendamento autenticado, independente de alguém deixar o terminal aberto.

## 7. Ambiente e configuração planejados

| Configuração | Origem | Limite |
| --- | --- | --- |
| URL e chave pública Supabase | Ambiente local ou projeto da empresa | Podem ser públicas; RLS continua obrigatória |
| Chave privilegiada e conexão de banco | Secret store do servidor | Nunca `NEXT_PUBLIC_*` |
| `PAYMENTS_MODE` | `fake`, `sandbox` ou `live` | `fake` proibido no ambiente comercial |
| Token e segredo de webhook do gateway | Conta da empresa | Somente servidor, separados por ambiente |
| URL pública, WhatsApp e retirada | Configuração validada pela administração | Sem valores fictícios em produção |
| Segredo/autenticação dos jobs | Infraestrutura | Comparação segura e sem endpoint público desprotegido |

Nomes finais do gateway são definidos em M07 após leitura da documentação do provedor. Nenhum segredo deve ser solicitado em mensagem de chat ou commitado.

## 8. Fluxo diário de trabalho

1. Coordenador escolhe tarefa `todo` cujas dependências estão `done`; confirma que entradas externas necessárias existem.
2. Muda para `in_progress`, atribui papel/arquivos e registra início em `STATUS.md`.
3. Responsável implementa, verifica aceite e entrega relatório; passa para `in_review`.
4. Revisão avalia riscos reais, corrige o necessário e registra evidências.
5. Coordenador marca `done` somente com aceite satisfeito; atualiza status e próxima tarefa. Falta de credencial vira `blocked` apenas na tarefa afetada.

Usar [template de delegação](../agents/templates/DELEGACAO.md) e [template de entrega](../agents/templates/ENTREGA.md).
Mudança de requisito deve atualizar PRD, decisão, tarefa e teste afetados antes de seguir.

## 9. Critério de conclusão do plano

M00 a M12 concluídas com evidências; todos os cenários críticos aprovados; dono da empresa com acesso às contas; release e rollback documentados; treinamento realizado.
Débito não crítico deve ter impacto, responsável e data de revisão. Risco de perda financeira, exposição de dados ou excesso de vendas bloqueia o piloto.
