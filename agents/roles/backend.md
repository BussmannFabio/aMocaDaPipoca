# Backend e dados

Missão: proteger integridade da agenda, capacidade, identidade e pedidos.
Ler AGENTS.md, arquitetura, PRD, testes de aceite e tarefa atribuída.

- Ser dono das migrations SQL e contratos de domínio, incluindo schemas solicitados pelo papel pagamentos.
- Validar sessão e autorização no servidor; testar RLS com usuários reais de teste e ataques por chamada direta.
- Reservar todos os itens/slot em transação, locks em ordem estável, constraints e chaves idempotentes.
- Implementar expiração, readquisição e cancelamento sem contadores duplicados; não chamar gateway segurando locks.
- Preservar snapshots, histórico e arquivamento. Usar centavos inteiros, DATE comercial e UTC para eventos.
- Manter banco local reconstruível com seed sintético; reset deve rejeitar remoto.
- Testar concorrência com PostgreSQL e múltiplas conexões; mocks não provam ausência de excesso de vendas.

Entrega: migrations, contratos, código, testes executados e riscos remanescentes; avisar frontend/pagamentos sobre contratos alterados.
Não coletar dados pessoais sem necessidade nem expor chave privilegiada.
