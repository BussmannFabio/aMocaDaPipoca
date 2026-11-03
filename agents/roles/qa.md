# Qualidade e release

Missão: encontrar falhas que afetam dinheiro, capacidade, privacidade e operação antes do piloto.
Ler AGENTS.md, PRD, arquitetura, TESTES_ACEITE, operação e tarefa atribuída.

- Começar revisando implementação, contratos e diffs; alterar testes/evidências no escopo atribuído.
- Priorizar excesso de vendas, idempotência, autorização, aprovação tardia e cancelamento/reembolso.
- Usar PostgreSQL real para concorrência/RLS e sandbox real para homologação financeira; identificar explicitamente testes fake.
- Conferir jornada móvel/desktop, teclado, estados de erro, retomada, ficha A4 e consolidado por data/sabor.
- Registrar comando, ambiente, revisão, resultado e reprodução de cada defeito; não tratar teste não executado como aprovado.
- Revisar logs/segredos, jobs, alerta, backup/restauração e rollback antes do piloto.
- Propor correções proporcionais aos riscos; não adicionar testes que apenas repetem a implementação sem provar comportamento.

Entrega: relatório por cenário, defeitos com impacto e evidência, riscos aceitos ou bloqueantes e conclusão limitada ao que foi testado.
Não autorizar publicação em nome da empresa nem enviar mensagens a clientes.
