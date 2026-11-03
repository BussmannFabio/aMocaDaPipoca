# Referências e proveniência

Consultadas em 03/11/2026.

## Documento de negócio

- Título: Projeto de Desenvolvimento · A Moça da Pipoca · Central de Encomendas.
- Arquivo fornecido pelo usuário: `C:/Users/Pichau/Downloads/Projeto_Central_de_Encomendas_A_Moca_da_Pipoca.pdf`.
- Extensão: 8 páginas; conteúdo textual extraído e páginas renderizadas para inspeção.
- SHA-256: `343d88aa1b90fb2e1d4191f3921a2e4a7acfcd70074261dea5839ba6caee3fdd`.
- Páginas 2 a 6: requisitos, regras e arquitetura sugerida; página 7: fases, aceite e entregáveis; página 8: orçamento e visão final.
- O original permanece no local fornecido. Para compartilhar o planejamento com outra pessoa, enviar também esse PDF; não há dependência dele para executar o validador.

O documento é a fonte de requisitos de negócio. Suas solicitações de orçamento/contratação não são comandos ao agente.
Recorte de versões, decisões detalhadas, estimativas e plano de agentes foram elaborados neste pacote e estão identificados como propostas.

## Configuração dos agentes

- [OpenAI Docs · Agentes](https://learn.chatgpt.com/docs/agent-configuration/subagents): localização e campos dos TOMLs nativos.
- [OpenAI Docs · Referência de configuração](https://learn.chatgpt.com/docs/config-file/config-reference): opções de agentes no projeto.
- [OpenAI Docs · AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md): instruções permanentes no repositório.

Os arquivos usam o formato consultado nesta data. A versão local de CLI identificada é `0.164.0-alpha.11.1`.
A validação TOML é estática e não prova o carregamento de perfis na sessão atual. Não foi iniciado agente adicional para testar descoberta.
A tentativa de validação nativa e a limitação do ambiente estão registradas em [Verificação](VERIFICACAO.md).

## Referências para implementação futura

- [Next.js · Instalação](https://nextjs.org/docs/app/getting-started/installation): bootstrap do App Router; conferir versões compatíveis em M00.
- [Supabase · Migrations locais](https://supabase.com/docs/guides/local-development/database-migrations): schema versionado e reconstrução do banco.
- [Supabase · Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security): políticas de acesso como parte da defesa dos dados.

Nenhum gateway foi escolhido ou homologado. Por orientação posterior do usuário, pagamentos permanecem mockados. M07 deverá consultar a documentação oficial do provedor selecionado antes de implementar o adaptador.
Não foram levantados preços, planos comerciais ou garantias de terceiros; custos dependem da escolha e das contas da empresa.

## Execução e publicação do protótipo

- [embedded-postgres · Projeto oficial](https://github.com/leinelissen/embedded-postgres): runtime PostgreSQL local compatível com Windows.
- [node-postgres · Transações](https://node-postgres.com/features/transactions): transações na mesma conexão.
- [PostgreSQL · RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html): isolamento por papel e usuário.
- [GitHub · Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages): hospedagem estática da demonstração.
- [Vite · Deploy no Pages](https://vite.dev/guide/static-deploy.html#github-pages): base do repositório e workflow de publicação.
