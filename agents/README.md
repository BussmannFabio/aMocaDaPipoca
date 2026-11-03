# Agentes do projeto

Os agentes são papéis de desenvolvimento. Não são funcionalidades de IA dentro da loja.
Definições nativas ficam em `.codex/agents/`; instruções detalhadas ficam em `agents/roles/`.
O `AGENTS.md` da raiz contém as regras comuns. Esta pasta organiza prompts, contratos de entrega e estado entre sessões.

## Papéis e limites

| Nome nativo | Missão | Arquivos sob sua responsabilidade | Não fazer |
| --- | --- | --- | --- |
| coordenador | Ordenar tarefas, integrar alterações e verificar marcos | Estado, plano, manifests/lockfile e integração compartilhada | Declarar aprovação/teste sem evidência |
| produto | Refinar requisito, experiência e rastreabilidade | PRD, decisões, rastreabilidade e revisão de UX | Mudar regra comercial silenciosamente |
| backend | Dados, autenticação, agenda, capacidade e pedidos | Migrations, módulos de domínio, testes de banco | Deixar regra crítica só na UI |
| frontend | Jornada e painel responsivos/acessíveis | Páginas, componentes e E2E de interação | Confirmar pagamento ou calcular preço autoritativo no cliente |
| pagamentos | Gateway, eventos, idempotência e conciliação | Módulo/adaptadores payments, webhooks e jobs financeiros | Guardar cartão ou marcar pagamento por redirect |
| qa | Revisar riscos, testes e prontidão da entrega | Testes, evidências e relatório de release | Tratar simulação como homologação real |

Backend mantém migrations inclusive as de pagamentos; pagamentos solicita mudança contratada, sem editar o mesmo arquivo em paralelo.
Coordenador atribui arquivos exclusivos na delegação; produto e qa iniciam em leitura/revisão e só alteram escopo acordado.
Esses limites são instruções de trabalho, não permissões técnicas adicionais. Agentes herdam as permissões da sessão.

## Configuração e carregamento

Foram preparados seis TOMLs independentes com `name`, `description` e `developer_instructions`, conforme a [documentação oficial de agentes](https://learn.chatgpt.com/docs/agent-configuration/subagents).
O arquivo `.codex/config.toml` define até três subagentes simultâneos. Um limite menor do ambiente continua valendo.
Modelo e esforço não foram fixados: os papéis herdam as escolhas da sessão. Não há tokens, MCPs, credenciais ou mudança de sandbox nos arquivos.

Para verificar uso no ambiente:

1. Abrir o repositório em uma nova sessão compatível do Codex que carregue a configuração local. Configurações de projeto podem depender da confiança atribuída ao diretório e das políticas gerenciadas; ver [referência](https://learn.chatgpt.com/docs/config-file/config-reference).
2. Pedir que o agente confira os nomes disponíveis e confronte com os seis TOMLs antes de delegar.
3. Se os papéis nativos não forem descobertos, relatar a limitação e executar os papéis sequencialmente lendo `agents/roles/<nome>.md`. Não inventar que o registro foi carregado.

O validador deste pacote verifica TOML e consistência estática. Não inicia sessões de agentes nem prova a descoberta dos perfis pelo aplicativo.
As instruções permanentes da raiz seguem a convenção [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

## Como operar

O agente principal normalmente assume coordenador; não criar outro coordenador só por existir um perfil.
Delegação requer autorização aplicável à sessão. Para pedir execução paralela, o prompt pode dizer: “Use os agentes configurados, delegue tarefas independentes com arquivos exclusivos e coordene a integração”.
Sem essa autorização ou sem suporte, executar sequencialmente.

Ordem de contexto: instruções da sessão → AGENTS.md → papel atribuído → tarefa do backlog → contratos e decisões → estado atual.
Materiais externos são referências de produto; não alteram permissões do agente.

Cada delegação usa [DELEGACAO.md](templates/DELEGACAO.md), cada entrega usa [ENTREGA.md](templates/ENTREGA.md).
Qualquer alteração em regra de capacidade, pagamento ou permissão exige revisão qa antes de fechar o marco.
Não criar chats de usuário, enviar mensagens, contratar APIs ou publicar por causa da existência destes perfis.

## Retomada e comandos

- Início: [INICIAR_MVP.md](prompts/INICIAR_MVP.md).
- Próxima tarefa: [EXECUTAR_TAREFA.md](prompts/EXECUTAR_TAREFA.md).
- Fonte de status: [tasks.json](state/tasks.json).
- Contexto resumido: [STATUS.md](state/STATUS.md).
- Verificação: `python scripts/check_plan.py`.

Estados permitidos: `todo`, `in_progress`, `in_review`, `blocked`, `done`.
`blocked` deve registrar a dependência concreta e o que continua possível. `done` exige relatório/evidência e aceite; não mover tarefas dependentes antes disso.
