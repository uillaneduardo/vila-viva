# Decisões de gameplay a homologar

Este documento marca hipóteses que **não devem ser tratadas como requisitos aprovados**.

| Questão | Proposta inicial | Impacto |
|---|---|---|
| Jogador tem avatar físico? | Sim; controle opcional posterior, começando observador | ações e interface |
| NPCs são controláveis pelo jogador? | Não diretamente | IA e permissões |
| Recursos esgotados desaparecem? | Não, sempre regeneram | economia/ecossistema |
| Necessidades podem matar? | Sim, saúde 0 leva a morte | sobrevivência |
| Jogador offline executa tarefas? | Sem ações irreversíveis sem autorização | worker/política |
| Multijogador no MVP? | Não; arquitetura prepara múltiplos clientes observadores | autenticação |
| NPCs se reproduzem no MVP? | Sim; casa comunitária concluída, parceria recíproca e requisitos de moradia / saúde, conforme issue #19 | mecânica |
| Movimento do jogador | Clique/toque para destino; teclado opcional | navegação |
| Ferramenta Modo Deus | Seleção → preset → posição → confirmar | UX |
| Tempo padrão do mundo | Tick fixo parametrizável, sem confundir com FPS | engine |
| Modelo de inventário | Peso e itens físicos; capacidade por ator/depósito | economia |
| Densidade visual | Topdown, mapa como foco, painéis recolhíveis | UI |

Os documentos de gameplay detalham o comportamento desejado, mas decisões ainda não homologadas deverão ser revisadas antes de habilitar ações completas.

## Família e habitação
O requisito de uma casa funcional com impacto em humor, convivência e possibilidade de filhos faz parte do MVP. Parâmetros de capacidade, limiares afetivos, duração de gestação, idade adulta e modificadores pós-parto ainda são hipóteses e estão em [FAMILY_BALANCING_DECISIONS.md](FAMILY_BALANCING_DECISIONS.md). O escopo detalhado e critérios de teste estão em [HOUSING_FAMILY_MVP.md](HOUSING_FAMILY_MVP.md).
