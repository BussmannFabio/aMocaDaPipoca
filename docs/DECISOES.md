# Decisões, premissas e dependências

Data de referência: 03/11/2026. Não interpretar proposta como aprovação da empresa.
O coordenador mantém este registro e consulta o usuário somente quando a decisão passa a bloquear trabalho dependente.

## Decisões propostas para iniciar o desenvolvimento

| ID | Decisão de planejamento | Justificativa | Revisar |
| --- | --- | --- | --- |
| ADR-01 | MVP de produtos com retirada; entregas/eventos em versões posteriores | Fluxo comercial menor, completo e verificável | Antes do piloto, D-01 |
| ADR-02 | Next.js, TypeScript, PostgreSQL, Supabase Auth/Storage; monólito modular | Alinhamento com briefing e menor esforço operacional | M00, registrar versões |
| ADR-03 | Uma data e um slot por pedido; capacidade por unidade vendável e pedido/slot | Evitar ambiguidades de logística no MVP | Antes de M03/M04 |
| ADR-04 | Reserva de 15 minutos, sujeita à compatibilidade do gateway | Limitar bloqueio de capacidade não paga | Spike de M07 |
| ADR-05 | Pix e cartão à vista via checkout hospedado | Manter pagamento integral sem manipular cartão | M07 e D-02 |
| ADR-06 | Link WhatsApp com resumo no MVP | Confirmação depende do sistema; envio exige ação do cliente | D-01; automação futura |
| ADR-07 (substituída) | Cadastro antes da agenda do briefing foi substituído: catálogo/agenda públicos e login ao começar a personalizar | Orientação explícita do usuário em 03/11/2026 | Implementado e testado |
| ADR-08 | Exceção de antecedência por cliente/data, com motivo e auditoria | Evitar liberação indiscriminada | M03 |
| ADR-09 | Pagamento aprovado após reserva expirada readquire capacidade ou abre exceção/reembolso | Não ignorar dinheiro recebido nem causar venda acima do limite | M06/M07 |
| ADR-10 | Cancelamento aprovado libera capacidade; reembolso é controlado separadamente | Evitar estados financeiros implícitos | M09 e D-05 |
| ADR-11 | Ao fechar data, reservas já válidas continuam até expirar; pedidos existentes preservados | Evitar quebrar contratos e cobranças em andamento | M03 e validação operacional |

Se qualquer proposta for incompatível com o negócio, alterar PRD, arquitetura, backlog e cenários correspondentes antes da implementação afetada.

## Informações externas pendentes

| ID | Decisão/informação | Responsável externo | Quando bloqueia | Continuação possível |
| --- | --- | --- | --- | --- |
| D-01 | Validar recorte produtos/retirada, link WhatsApp e piloto | Empresa | M11/M12 | M00 a M10 com recorte identificado como proposto |
| D-02 | Gateway, conta da empresa, sandbox, credenciais e possibilidade de reembolso | Empresa + pagamentos | Integração de M07 | M06 fake, M08/M09 locais |
| D-03 | Catálogo real, fotos autorizadas, preços, unidades, sabores, capacidades e endereço/horários de retirada | Empresa | Dados de M11/M12 | Seed sintético e placeholders identificados |
| D-04 | Contas de hospedagem/Supabase, domínio, orçamento recorrente e quem autoriza publicação | Empresa | Infra de M11/M12 | Desenvolvimento e preview local |
| D-05 | Política de cancelamento/reembolso, retenção, aviso de privacidade, canal de suporte e titular dos acessos | Empresa, assessoria quando necessária | Piloto comercial M11/M12 | Implementar fluxo técnico sem inventar política jurídica |
| D-06 | Responsável por conciliar, responder exceções, restaurar backup e atender piloto; janela de suporte | Empresa | M11/M12 | Runbooks e treinamento com dados fictícios |

Não pedir segredos no chat. Orientar configuração em armazenamento seguro quando a tarefa precisar deles.
Não contratar API, comprar domínio ou cobrar cliente para desbloquear uma demonstração.

## Riscos com resposta definida

| Risco | Resposta técnica/operacional | Dono |
| --- | --- | --- |
| Dois clientes compram a última unidade | Locks, constraints, transação e CT-08/CT-19 | backend |
| Timeout provoca nova cobrança | Chaves persistidas, consulta ao gateway e CT-20 | pagamentos |
| Webhook não chega ou chega fora de ordem | Eventos persistidos, reconciliação e transições monotônicas | pagamentos |
| Aprovação após expiração ou cancelamento | Exceção financeira, readquirir só quando permitido, reembolso verificável | pagamentos + operação |
| Cliente acessa dados de outro | Autorização no servidor, RLS e teste direto de API/banco | backend + qa |
| Job de expiração para | Alerta e limpeza sob demanda na transação; job recuperável | backend + operação |
| Escopo cresce antes de vender | Recorte explícito e mudanças rastreadas, concluir G3 primeiro | coordenador + produto |
| Dados/custos de fornecedor impedem piloto | Separar modo local, sandbox e live; bloquear só fase dependente | coordenador |
| Capacidade configurada errada | Impedir redução abaixo do comprometido, auditoria e treinamento | backend + operação |

## Registro de alterações

- 03/11/2026: pacote inicial baseado no PDF; todas as ADRs acima são propostas de planejamento. Nenhuma decisão externa ou compra foi realizada.
- Novas entradas devem registrar data, autor, evidência, motivo, tarefas/testes afetados e eventual substituição de decisão anterior.

## Decisões de execução em 03/11/2026

- **ADR-12 · Runtime local:** PostgreSQL real 18.6 embarcado no projeto, RLS e autenticação própria por sessão/scrypt para executar sem Docker ou conta externa. Supabase hospedado não foi configurado; migração/infra comercial precisa de decisão própria.
- **ADR-13 · Pagamento mockado:** usuário informou que ainda não existe gateway e pediu mocks. M07 fica pendente de escolha com o cliente; nenhuma credencial/provedor foi presumido. M10 passou a ter aceite local; a homologação externa não foi declarada concluída.
- **ADR-14 · Catálogo público:** orientação posterior do usuário substitui a regra do PDF de login antes da agenda. Visitante consulta catálogo/disponibilidade; ao personalizar entra/cria conta e retoma data/produto.
- **ADR-15 · Pages:** publicação solicitada explicitamente no GitHub Pages. Como esse hosting é estático, apps/demo reutiliza os componentes com estado fictício no navegador e roteamento por hash. O backend/PostgreSQL continuam em apps/web na versão local. Não há capacidade ou pedidos compartilhados entre visitantes do Pages.
- **ADR-16 · Versões e UI:** versões exatas nos manifests/lockfile; CSS próprio e ilustrações SVG locais, sem dependência de fonte externa. ESLint 9.39.4 mantido por compatibilidade declarada dos plugins do Next; avaliar atualização conjunta do conjunto de lint na manutenção.

Essas decisões preservam a separação entre protótipo demonstrativo, MVP local com banco real e futura operação comercial.
