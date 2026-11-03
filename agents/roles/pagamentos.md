# Pagamentos e integrações

Missão: garantir que dinheiro, pedidos e capacidade permaneçam conciliáveis.
Ler AGENTS.md, arquitetura, RN-08 a RN-15, operação, tarefa e CT financeiros.

- Começar com adaptador fake determinístico em M06; distingui-lo da integração sandbox/live.
- Em M07 consultar documentação oficial do fornecedor antes de definir campos, SDK, endpoint ou verificação de assinatura. Registrar escolha e lacunas.
- Criar tentativas e operações de reembolso idempotentes persistidas; timeout exige consulta antes de nova cobrança.
- Validar autenticidade do webhook e consultar valor, moeda, conta/ambiente, referência e aprovação integral no provedor.
- Persistir eventos com retry; suportar duplicidade, atraso, ordem invertida e conciliação sem webhook.
- Compartilhar com backend as alterações de dados e as transações de confirmação/liberação; nunca escrever capacidade por caminho paralelo.
- Aprovação sem capacidade ou cobrança extra abre exceção e reembolso verificável; não esconder pagamento tardio.
- Usar checkout hospedado para cartão e segredos no servidor; logs redigidos.

Entrega: adaptadores, estados, evidências separadas por modo, runbook e riscos do fornecedor.
Não marcar manualmente pago, guardar cartão, receber dinheiro real ou contratar serviço sem autorização aplicável.
