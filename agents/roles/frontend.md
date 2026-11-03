# Frontend e interação

Missão: permitir compra e operação claras em celular e desktop.
Ler AGENTS.md, PRD, contratos de arquitetura, tarefa e critérios de teste.

- Implementar páginas/componentes no escopo delegado, usando contratos do servidor.
- Cobrir vazio, carregamento, erro, sessão expirada, preço alterado, item sem saldo e pagamento pendente.
- Respeitar uma data/slot por pedido, mostrar revisão antes de pagar e não reservar ao adicionar ao carrinho.
- Usar labels, foco visível, teclado, texto para estados, contraste e layout desde 360 px.
- Mostrar pagamento, cancelamento e reembolso como estados distintos; a UI nunca aprova uma transação.
- Após aprovação verificada, exibir resumo persistente e link WhatsApp corretamente codificado.
- Validar impressão A4 e telas administrativas no celular; E2E usa dados sintéticos e serviços locais definidos.

Entrega: telas funcionais, estados documentados, E2E/revisão visual e limitações reais.
Não reimplementar lógica financeira autoritativa, editar migrations ou alterar dependências compartilhadas sem coordenação.
