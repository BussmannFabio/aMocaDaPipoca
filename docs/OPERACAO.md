# Operação, homologação e piloto

Runbook comercial a completar durante M07 a M12. O runtime local foi implementado; a demonstração no Pages é separada e não recebe pagamentos reais. Nenhuma conta de gateway ou infraestrutura comercial de banco foi configurada.

## 1. Ambientes e modos

| Ambiente | Dados | Pagamentos | Exposição |
| --- | --- | --- | --- |
| Local | Seed sintético e banco isolado | fake determinístico | Máquina de desenvolvimento |
| Homologação | Dados de teste, credenciais próprias | Sandbox real | URL de homologação com acesso controlado |
| Produção/piloto | Dados e catálogo reais autorizados | Gateway live | Domínio da empresa, após preparação e autorização |

Nunca apontar reset/seed para produção. Separar credenciais, webhooks, storage e banco por ambiente.
Uma página de demonstração deve identificar pagamentos simulados. Produção deve recusar inicialização/checkout em modo fake.

## 2. Preparação de M11

- [ ] Recorte do MVP e limitações validados pela empresa; D-01 registrada.
- [ ] Conta do gateway e dados recebedores conferidos; Pix/cartão e reembolso homologados.
- [ ] Catálogo, preço, capacidade, horários, endereço e WhatsApp reais revisados pela empresa.
- [ ] Conta de hospedagem, banco, domínio, código e faturamento pertencem à empresa.
- [ ] Credenciais live instaladas no secret store; nenhuma chave no cliente, log ou repositório.
- [ ] Autenticação/recuperação de senha, envio de e-mail e URLs de retorno funcionam no domínio final.
- [ ] HTTPS, cookies/sessões e acesso admin verificados; administradores criados por procedimento auditável.
- [ ] Webhook autenticado e job de expiração/conciliador agendados; alerta de falha chega ao responsável definido.
- [ ] CT-01 a CT-21 aprovados e build validado; logs redigidos e acessíveis somente a quem precisa.
- [ ] Política de cancelamento/reembolso, privacidade, retenção, suporte e atendimento publicadas com conteúdo validado pela empresa.
- [ ] Backup e restauração testados em ambiente isolado; RPO/RTO confrontados com os recursos contratados.
- [ ] Preview, roteiro de piloto e plano de rollback concretos, revisáveis e com responsáveis.
- [ ] Autorização de publicação/compra real registrada quando exigida pela sessão; não solicitar novamente se já dada.

Não tratar este checklist como exigência de nova aprovação para cada tarefa de desenvolvimento.

## 3. Publicação

1. Registrar revisão do código, migrations, backup prévio, variáveis por nome (sem valores) e responsáveis.
2. Aplicar migrations compatíveis e verificar saúde do banco; publicar aplicação com modo live e novas reservas inicialmente desativadas.
3. Verificar login, catálogo, leitura de pedidos, webhook e jobs sem expor segredos.
4. Abrir somente as datas/capacidades do piloto, executar a compra supervisionada autorizada e verificar dinheiro/pedido/capacidade/histórico.
5. Registrar evidências redigidas, treinar administradora e habilitar o piloto planejado.

O cron/job deve ter autenticação, timeout, limite de lote e retry. Frequência inicial proposta: expiração a cada minuto e conciliação a cada cinco minutos; conferir suporte/custo do provedor e ajustar SLA antes de publicar.

## 4. Reconciliação e exceções

Pagamento aprovado sem pedido confirmado: conferir referência, valor e capacidade; usar o processamento idempotente. Sem capacidade ou pedido cancelado, manter exceção aberta e encaminhar reembolso integral conforme procedimento validado.
Não alterar manualmente o pagamento para aprovado nem apagar eventos para forçar retry.
Se duas tentativas forem aprovadas, manter uma confirmação e devolver o excedente; registrar as duas transações.
Operação consulta diariamente pendências, exceções financeiras e reembolsos até a estabilização do piloto.
Prazo e responsável pelo atendimento são definidos em D-05/D-06; a tela não deve prometer prazo inventado.

## 5. Rollback e incidente

Se houver risco de excesso de vendas ou cobrança incorreta, desativar novas reservas preservando acesso a pedidos e recebimento/registro de eventos financeiros.
Retornar a versão web anterior compatível. Não restaurar backup de banco por padrão após vendas: isso pode apagar pagamentos/pedidos já ocorridos.
Se houver dano de dados, restaurar em ambiente isolado, reconciliar com o gateway e planejar correção auditada antes de trocar produção.
Registrar janela do incidente, pedidos afetados, mitigação e correções. Comunicação com clientes depende de autorização do usuário/empresa, sem disparo automático pelo agente.

## 6. Entrega e acompanhamento

Entregar manual de: abrir data/oferta/slot, cadastrar produto, imprimir produção, consultar pagamento, cancelar e acompanhar reembolso, recuperar acesso e acionar suporte.
Registrar treinamento com cenário sintético; validar que a administradora consegue repetir sozinha.
Medir amostra e conversão do piloto sem dados pessoais em analytics. Relatar metas atingidas, falhas e inconclusões.
Condições de manutenção, suporte, custos mensais, taxas por transação e APIs futuras são itens comerciais separados; não há valores cotados neste pacote.
