# A Moça da Pipoca · Central de Encomendas

MVP 1 local de produtos para retirada agendada, com pagamentos **mockados**, conforme orientação do usuário em 03/11/2026.

## Abrir e explorar

Protótipo estático preparado para publicação em `https://bussmannfabio.github.io/aMocaDaPipoca/`. O [roteiro rápido](docs/ROTEIRO_PROTOTIPO.md) descreve as contas, telas e evolução.

[Abrir catálogo público](http://127.0.0.1:3000/encomendar) · [Início](http://127.0.0.1:3000/) · [Administração](http://127.0.0.1:3000/admin)

O catálogo e o calendário são públicos. O login/cadastro é pedido ao começar a personalizar um produto; a data e o produto escolhidos são preservados após o acesso.

| Acesso demonstrativo | E-mail | Senha |
| --- | --- | --- |
| Cliente | `cliente@pipoca.local` | `Pipoca@123` |
| Administrador | `admin@pipoca.local` | `Pipoca@123` |

Esses acessos e o catálogo inicial são fictícios, exclusivos do ambiente local. Também é possível criar uma conta de teste pela interface.
Nenhuma cobrança real é feita. Não informe cartão real nem use esta instalação para vendas comerciais.

## Executar localmente

Requisitos: Node 22.18 ou superior compatível e pnpm 11.25.0. Não exige Docker ou conta externa.

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

O comando prepara o PostgreSQL real em `127.0.0.1:55432`, aplica migrations e dados iniciais quando necessário, inicia a aplicação em `127.0.0.1:3000` e o job de expiração a cada 30 segundos.
Dados persistem em `.local/postgres`; credenciais locais aleatórias são geradas em `.env.local`, ignorado pelo Git. Use o endereço com `127.0.0.1`, conforme APP_URL.

Para servir o build otimizado:

```powershell
pnpm build
pnpm start
```

Encerre o servidor web anterior antes de executar `pnpm start`, para liberar a porta 3000. Ctrl+C encerra a execução. Um PostgreSQL iniciado separadamente pode ser encerrado com `pnpm db:stop`, preservando os dados.

## Funcionalidades

- Catálogo público por data, calendário com estados e antecedência de 15 dias.
- Cadastro, login, perfil, recuperação de senha em caixa de e-mail local e isolamento entre clientes.
- Produtos com sabores, quantidades, complementos e campos de personalização configuráveis.
- Sacola com uma data/horário, revisão e preço recalculado pelo servidor.
- Reserva transacional por 15 minutos, expiração e proteção contra excesso de vendas/duplicidade.
- Simulador de Pix/cartão: aprovar, recusar ou manter pendente; confirmação persistente.
- Pedidos, histórico, solicitação de cancelamento e decisão administrativa; reembolso simulado separado.
- Administração de catálogo, agenda, capacidade, horários, exceções, clientes e configurações.
- Produção, ficha individual e consolidado imprimíveis, além de layout para celular.

## Comandos úteis

| Comando | Uso |
| --- | --- |
| `pnpm db:start` | Iniciar somente o PostgreSQL local |
| `pnpm db:migrate` | Aplicar migrations locais |
| `pnpm db:reset` | **Apagar dados locais** e reconstruir seed; recusa banco remoto |
| `pnpm demo:orders` | Criar pedidos fictícios para explorar produção/retirada/pagamento |
| `pnpm pages:build` / `pnpm pages:preview` | Compilar e testar demonstração estática do Pages |
| `pnpm test:pages` | Verificar o roteiro da versão estática no Chrome headless |
| `pnpm mailbox` | Consultar links de recuperação na caixa de e-mail local |
| `pnpm lint` / `pnpm typecheck` | Verificações estáticas |
| `pnpm test` | Regras unitárias |
| `pnpm test:integration` | Reconstruir somente pipoca_test e testar PostgreSQL/RLS/concorrência |
| `pnpm test:e2e` | Testar no Chrome headless, com aplicação local já iniciada |
| `pnpm reservations:expire` | Executar a expiração idempotente uma vez |
| `pnpm payments:reconcile` | Informar pendências fake; não consulta gateway externo |
| `python scripts/check_plan.py` | Validar documentação, agentes e dependências do backlog |

E2E usa Chrome instalado e cria dados de teste no banco local de demonstração. Integração utiliza um banco separado, `pipoca_test`.

## Documentação e execução

- [PRD](docs/PRD.md) e [plano do MVP](docs/PLANO_MVP.md).
- [Backlog](docs/BACKLOG.md), [estado atual](agents/state/STATUS.md) e [tarefas](agents/state/tasks.json).
- [Arquitetura](docs/ARQUITETURA.md), [decisões](docs/DECISOES.md) e [matriz de aceite](docs/TESTES_ACEITE.md).
- [Relatório da implementação e testes](docs/evidencias/MVP-local/RELATORIO.md).
- [Agentes configurados](agents/README.md) e [guia para continuar](agents/prompts/INICIAR_MVP.md).
- [Pauta para o cliente](docs/PAUTA_CLIENTE.md), [operação comercial futura](docs/OPERACAO.md) e [referências](docs/REFERENCIAS.md).

O runtime local usa PostgreSQL com autenticação por sessão no servidor e RLS. Supabase hospedado, e-mail real, gateway, domínio e implantação comercial não foram configurados.
Entrega atual: MVP local mockado; homologação de pagamentos e piloto comercial continuam separados.
