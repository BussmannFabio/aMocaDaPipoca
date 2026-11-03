# Arquitetura e contratos do MVP

Status: núcleo local implementado; contratos de gateway real continuam propostos. Dono: backend; integração final: coordenador.

## 1. Decisões de base

Implementação local: PostgreSQL embarcado com RLS, senhas scrypt e sessões HTTP-only. Não depende de Supabase Auth/Storage; fotos usam URL/caminho configurável. A proposta de infraestrutura hospedada abaixo será reavaliada antes de produção (ADR-12).
O build Pages usa um adaptador exclusivo de demonstração no navegador, sem backend, credenciais ou garantias de concorrência compartilhada. Os testes SQL/locks/RLS referem-se ao runtime local, nunca ao Pages.

Aplicação única Next.js/TypeScript com módulos de domínio, PostgreSQL e Supabase Auth/Storage, alinhados à sugestão do briefing.
Hospedagem web compatível com Next.js; Supabase para dados. Escolha final de planos e provedores depende das contas da empresa.
Migrations SQL versionadas. Regras de capacidade e confirmação ficam em transações de banco, acessadas pelo servidor; não em múltiplas chamadas independentes do navegador.
Interface chama casos de uso no servidor, que validam sessão, autorização e dados antes de acessar o banco ou o provedor.
Gateway atrás de adaptador; checkout hospedado para cartão. A decisão do gateway real será tomada pelo spike de M07.

Documentação técnica de apoio em [Referências](REFERENCIAS.md). Versões serão fixadas em M00 após conferência, sem inventar SDK ou endpoint de provedor não escolhido.

## 2. Modelo mínimo

| Entidade | Campos/constraints essenciais |
| --- | --- |
| profiles | auth_user_id único, nome, telefone, dados adicionais estritamente necessários |
| admin_memberships | auth_user_id único, papel, criado_por; escrita somente privilegiada |
| store_settings | identidade, WhatsApp, endereço de retirada, antecedência, timezone |
| products | id, ativo, nome, descrição, imagem, unidade, preço_centavos, mínimo, máximo, antecedência |
| product_options | produto, schema versionado com opções, preços adicionais e regras de validação |
| business_dates | date único, estado de publicação, bloqueio e motivo |
| date_offers | chave única date/product_id, habilitada, capacidade, reservado, confirmado; contadores não negativos |
| pickup_slots | date, início/fim, habilitado, capacidade_pedidos, reservado, confirmado; intervalo único por data |
| lead_time_exceptions | cliente, date, escopo de antecedência, motivo, autor, validade/revogação |
| orders | id UUID, número único, cliente, date, slot, total_centavos, order_state, snapshot, created_at |
| order_items | pedido, produto de origem opcional, quantidade, preços e opções em snapshot |
| reservations | pedido único, estado active/consumed/expired/released, expires_at UTC, recursos e quantidades |
| payment_attempts | pedido, sequência, provider, provider_payment_id único quando presente, idempotency_key única, valor, moeda, estado |
| payment_events | provider + event_id únicos, referência, estado de processamento, payload mínimo/redigido, tentativas |
| financial_exceptions | pedido, tentativa, motivo, resolução, responsável e timestamps |
| cancellation_requests | pedido, solicitante, motivo, decisão, autor; uma solicitação aberta por pedido |
| refund_operations | tentativa, chave única de operação, valor, provider_ref, estado e evidência |
| order_history / audit_log | ator, ação, estado anterior/novo, referência, instante; acesso restrito |

Índices por date, cliente/created_at, order_state, status de pagamento e expiração. Constraints garantem `reservado + confirmado <= capacidade` em ofertas e horários.
Chaves estrangeiras e exclusão restrita preservam pedidos. Remover do catálogo usa arquivamento.
MVP não necessita tabela de endereços nem serviços; os snapshots e a modalidade permitem evolução sem coletar esses dados antecipadamente.

## 3. Tempo, capacidade e valores

- Datas de encomenda são `DATE` da loja. Horários de retirada são horários locais associados à data; instantes de reserva/eventos são UTC.
- Exemplo com relógio congelado em 03/11/2026 em São Paulo: 17/11 é consulta, 18/11 permite, se houver oferta. Não comparar 15 × 24 horas em milissegundos.
- Dinheiro em centavos inteiros; nenhuma soma monetária com float. Servidor recalcula produtos e complementos a partir da versão vigente.
- Unidade de capacidade por produto: unidades vendáveis, como pacote/kit; sabor subdivide a quantidade e não duplica consumo. Slot consome um pedido, mesmo com vários itens.
- Carrinho não reserva. Checkout revalida todos os recursos e aplica tudo ou nada.
- Guardar versão/preço exibido; se preço/regra mudou desde a revisão, devolver conflito e pedir nova revisão antes de criar cobrança.

## 4. Estados independentes

```text
Pedido: pending_payment -> confirmed -> in_production -> ready -> fulfilled
        pending_payment -> expired
        pending_payment/confirmed/in_production/ready -> cancelled (decisão manual)

Pagamento: created -> pending -> approved
                         |-> rejected / expired / failed
           approved -> refund_pending -> refunded / refund_failed

Cancelamento: requested -> approved / denied
Reserva: active -> consumed / expired / released
Exceção financeira: open -> refund_pending -> resolved
```

Solicitar cancelamento não muda produção nem libera capacidade. Cliente vê solicitação em análise junto do andamento atual.
Cancelamento aprovado muda o estado do pedido e libera capacidade uma vez; se houve pagamento, a operação de reembolso tem estado separado. Não exibir dinheiro devolvido antes da confirmação.
No MVP, pedido já retirado não aceita cancelamento no autosserviço; atendimento manual analisa fora desse fluxo e registra eventual ocorrência.
Administradora nunca marca pagamento como aprovado manualmente. Correções financeiras passam pela conciliação com o provedor.
Status de entrega será introduzido em V1.1, e não aparece para retirada.

## 5. Algoritmo de reserva

1. Receber `checkout_key` idempotente por cliente e tentativa, payload normalizado e versão comercial.
2. Em transação: localizar pedido prévio pela chave; se payload divergir, rejeitar reuso. Serializar criação por chave única.
3. Bloquear data e linhas de oferta em ordem estável por product_id, depois slot; validar publicação, antecedência/exceção, produto, personalizações e preços.
4. Expirar reservas vencidas dos recursos necessários de forma idempotente, sob a mesma disciplina de locks; não confiar apenas no job periódico.
5. Verificar capacidade para todos os itens e slot. Inserir pedido, snapshot, itens e reserva; incrementar reservado; gravar histórico; commit.
6. Fora da transação, criar cobrança com chave persistida por tentativa. Não segurar locks durante acesso de rede.
7. Em timeout, consultar a mesma cobrança/chave antes de tentar criar outra. Falha definitiva libera reserva; incerteza permanece rastreável até conciliação/expiração.

Não usar um mutex em memória: ele não protege múltiplas instâncias da aplicação.
Todos os fluxos que alteram capacidade seguem a mesma ordem de locks. M05 define e testa a função SQL/caso de uso único para essas escritas.

## 6. Pagamento, webhook e expiração

### Contrato de adaptador

```typescript
type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'failed';
interface PaymentProvider {
  create(input: {
    orderId: string; amountCents: number; currency: 'BRL';
    method: 'pix' | 'card'; idempotencyKey: string; expiresAt: string;
  }): Promise<{ providerId: string; status: PaymentStatus; checkoutUrl?: string;
    pixQrCode?: string; pixCopyPaste?: string; expiresAt: string }>;
  get(providerId: string): Promise<{
    providerId: string; orderId: string; amountCents: number;
    currency: string; status: PaymentStatus;
  }>;
  verifyWebhook(rawBody: Uint8Array, headers: Headers): Promise<{
    eventId: string; providerId: string;
  }>;
  refund(input: { providerId: string; amountCents: number; idempotencyKey: string }):
    Promise<{ refundId: string; status: 'pending' | 'refunded' | 'failed' }>;
}
```

É um contrato interno proposto, não uma API de fornecedor. O mapeamento de expiração, reembolso, autenticação e estados será validado em M07; adaptar o contrato se necessário e atualizar os consumidores.

### Processamento confiável

1. Validar autenticidade conforme documentação do gateway, preservar corpo bruto quando exigido e deduplicar por provedor/evento. Evento inválido não altera dados.
2. Persistir evento para processamento recuperável. Retornar sucesso somente quando a persistência estiver garantida; falhas transitórias devem permitir retry.
3. Consultar o gateway no servidor e conferir conta recebedora/ambiente, referência do pedido, valor integral e moeda. Não confiar só no payload ou no redirect.
4. Em transação, bloquear pedido, reserva, data/ofertas/slot na ordem definida, reler estados e aplicar transição uma única vez.
5. Com reserva válida: diminuir reservado e aumentar confirmado, marcar consumed e confirmar pedido atomicamente.
6. Com reserva expirada de pedido não cancelado: tentar readquirir todos os recursos. Se não couber ou data estiver bloqueada para nova reserva, manter pedido não confirmado e abrir exceção financeira/reembolso. Pedido cancelado nunca é reativado pelo pagamento tardio: encaminhar exceção/reembolso. Registrar aprovação do dinheiro mesmo quando não houver confirmação comercial.
7. Evento de pendência atrasado não regride pagamento aprovado. Outra tentativa aprovada para pedido já pago abre exceção de pagamento duplicado, nunca consome mais capacidade.

Job de expiração usa os mesmos locks e atualiza somente reservas active vencidas. Job de conciliação consulta tentativas pendentes/incertas e reprocessa com a mesma lógica do webhook.
Se webhook e job disputarem a mesma reserva, apenas uma transição vence; transação perdedora relê os estados.
Pagamento tardio não pode ser ignorado porque o pedido estava expired/cancelled.
MVP aceita reembolso operacionalmente manual se o gateway não oferecer API suficiente: registrar referência, executar na conta da empresa e confirmar via consulta/evidência. Sem solução verificável de reembolso, não publicar.

## 7. Casos de uso e fronteiras

| Operação | Autor | Validação principal |
| --- | --- | --- |
| Consultar calendário/catálogo por data | Visitante ou cliente | Leitura pública via papel SQL restrito; antecedência e publicação |
| Configurar produto/data/slot/exceção | Admin | Papel no servidor, capacidade e auditoria |
| Criar checkout/reserva | Cliente proprietário | Totais, snapshot, disponibilidade e idempotência |
| Consultar pedido | Proprietário ou admin | Propriedade, sem enumeração de IDs |
| Receber webhook | Gateway autenticado | Assinatura, evento único e consulta ao provedor |
| Expirar/conciliar | Serviço autenticado | Credencial interna, limites e idempotência |
| Solicitar cancelamento | Proprietário | Estado permitido, uma solicitação aberta |
| Decidir cancelamento/produção | Admin | Transição permitida, motivo e auditoria |

Server Actions ou Route Handlers são detalhes de transporte; nenhum consumidor pode escrever diretamente em contadores, pagamentos ou snapshots.
RLS habilitada em tabelas expostas. Funções privilegiadas precisam de permissões mínimas, validação de identidade/papel, `search_path` controlado e testes de chamadas diretas.
Chave de serviço não substitui autorização do caso de uso. Fotos públicas não podem permitir listar documentos privados.

## 8. Infraestrutura e observabilidade

Ambientes local, homologação e produção com bancos, credenciais e URLs separados.
Logs: correlation_id, order_id interno, provider_id redigido quando necessário, event_id, resultado e duração. Proibir payload completo com dados pessoais/cartão.
Alertar sobre job sem execução, evento em retry repetido, aprovação sem confirmação e reembolso pendente acima do prazo operacional definido.
Registrar transição e ator, sem permitir edição pelo cliente. Retenção e acesso dos logs são decisões operacionais em [Operação](OPERACAO.md).
