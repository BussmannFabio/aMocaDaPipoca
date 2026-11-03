# Estado do projeto

Atualizado em 03/11/2026.

- Entregue: MVP 1 local com Next.js, PostgreSQL/RLS, cadastro/sessões, catálogo público, personalização, reserva, pagamentos mockados, pedidos, produção e cancelamento/reembolso simulados.
- Versão Pages publicada: https://bussmannfabio.github.io/aMocaDaPipoca/ · apps/demo reutiliza as telas, com estado fictício por navegador e rotas por hash. Dois testes aprovados na URL pública; evidências no relatório.
- Regra atual do usuário: catálogo/calendário sem login; pedir conta ao personalizar e retomar a escolha. Essa regra prevalece sobre a regra original do PDF.
- M00–M06 e M08–M10 concluídas no escopo local. M07 bloqueada por ausência de gateway e orientação explícita de manter mocks; M11/M12 comerciais futuras.
- Próximo passo comercial: discutir gateway/conta com o cliente, usando `docs/PAUTA_CLIENTE.md`. Não integrar ou receber dinheiro real por conta própria.
- Contas demonstrativas e roteiro em `docs/ROTEIRO_PROTOTIPO.md` e README.md.
- Guia interno no ícone ? do header: acessos fictícios com cópia, roteiro, tecnologias por ambiente e opções de gateway a avaliar. Disponível também no celular.
- Decisões comerciais/contas pendentes em `docs/DECISOES.md`; não impedem explorar o protótipo.
- Agentes: arquivos preparados; descoberta nativa em uma nova sessão ainda precisa ser verificada. Nenhum subagente foi iniciado para esta entrega.
- Verificações: 7 unitários, 18 integrações PostgreSQL e 10 E2E locais aprovados. Testes da versão Pages e publicação são registrados em `docs/evidencias/MVP-local/RELATORIO.md`.
- Validação nativa: CLI não conseguiu carregar configuração no ambiente de execução (`Could not find home directory`). Perfis validados estaticamente; conferir descoberta na próxima sessão normal. Detalhes em `docs/VERIFICACAO.md`.

## Como atualizar

Registrar tarefa em andamento, resultado, caminho de evidência, bloqueio concreto e próxima ação.
Manter tasks.json como fonte de verdade; não usar este resumo para substituir dependências/aceites.
