# SimNext — Referências de simuladores e decisões de design

Data: 26/11/2026. Direção conceitual aprovada na conversa; implementação ainda não realizada. Complementa [SIMNEXT.md](SIMNEXT.md) e [SIMNEXT_SCENARIOS.md](SIMNEXT_SCENARIOS.md). As referências são observações de funcionalidades públicas, documentação e relatos de desenvolvimento; não constituem auditoria de código interno nem especificação de seus algoritmos. As decisões SimNext abaixo são próprias, não cópia de implementação de terceiros.

## 1. Referências e lições aplicáveis

| Referência | Foco observado | Aplicação no SimNext |
|---|---|---|
| [RimWorld — Ludeon](https://rimworldgame.com/) | Necessidades, humor, saúde, relações, características individuais e narrador de eventos | Indivíduos com atributos, motivações, tarefas, efeitos e consequências. Narrador opcional, separado de experimentos controlados. |
| [Dwarf Fortress — Bay 12](https://bay12games.com/dwarves/) / [discussão de geração de mundo e história](https://bay12games.com/media/df_talk_combined_transcript.html) | Mundos gerados, histórias e indivíduos persistentes | Registro histórico, identidade, continuidade de gerações e observação retrospectiva; evitar simular todos os detalhes desde o início. |
| [WorldBox](https://store.steampowered.com/app/1206560/) | Sandbox de intervenção e observação, civilizações e diplomacia | Sociedades autônomas, múltiplas comunidades, configuração inicial, convivência e conflitos emergentes. |
| [Oxygen Not Included — Klei](https://store.steampowered.com/app/457140/Oxygen_Not_Included/) | Sobrevivência condicionada por ambiente, temperatura e gases | Propriedades reutilizáveis, consequências físicas, ciclos de retroalimentação. Só adicionar propriedades úteis aos cenários, sem exigir química/física detalhadas. |
| [Songs of Syx](https://store.steampowered.com/app/1162750/) | Gestão de cidades e grandes populações | Escolher granularidade adequada à escala; avaliar abstrações por benchmark. A escala anunciada pelo jogo não é garantia de desempenho do SimNext. |
| [Factorio — Friday Facts #176](https://www.factorio.com/blog/post/fff-176) | Cadeias produtivas e otimização de transporte por segmentos | Transformações declarativas com insumos, condições, tempo e resultados; agregação quando preservar o comportamento relevante. |
| [NetLogo — BehaviorSpace](https://docs.netlogo.org/behaviorspace) | Modelagem por agentes, experimentos repetidos, variação de parâmetros e coleta de resultados | Presets, seeds, execução headless, comparação de distribuições, métricas, replay e bifurcação. |

Fontes públicas consultadas em 26/11/2026. Não atribuir Utility AI, ECS, frequências de tick ou estratégias específicas de paralelismo a esses jogos sem fonte técnica. O ciclo abaixo é um desenho do SimNext.

## 2. Princípios consolidados

- Modelagem baseada em agentes (ABM): representar indivíduos, estados locais, ações e interações; padrões coletivos surgem de sua composição.
- Sistemas simples, responsabilidade pequena, catálogos declarativos, estado autoritativo, comandos validados e eventos observáveis. Não criar um sistema específico para cada história, crise ou desfecho.
- Abstração intencional: fome como atributo, confiança como relação dirigida, conhecimento como pontos e pré-requisitos, construção como materiais/trabalho, cultura como tendências de valores, economia como produção/consumo/transferência. Não confundir o modelo com a realidade.
- Conhecimento individual, acumulativo e transferível por ensino e registros; não substituir por desbloqueio tecnológico global. Conhecimento habilita ações, não cria recursos.
- Propriedades físicas e condições reutilizáveis, sem exigir simulação molecular ou científica universal. Efeitos e consequências conectam sistemas.
- Objetivos do observador são independentes dos interesses dos agentes; ausência de um resultado esperado é válida. Eventos externos roteirizados ou narrador, se adicionados, devem ser opcionais, explicitamente configurados e registrados, desabilitados por padrão em experimentos controlados.
- Oturo como primeira aplicação visual, SimNext Engine como regras compartilhadas, SimNext Lab como configuração e análise. Separação de responsabilidades, não obrigação de três aplicativos.
- Escopo e fidelidade graduais: preservar indivíduos e identidade inicialmente; estudar agregação em grandes escalas somente mediante testes de equivalência ou tolerâncias explícitas. Não trocar precisão silenciosamente por desempenho.

## 3. Ciclo de execução de referência

Estado atual -> atualizar sistemas físicos/necessidades/efeitos -> perceber oportunidades -> selecionar intenções viáveis -> validar e executar ações -> registrar consequências -> novo estado -> publicação/persistência conforme contrato. Ordem de sistemas e desempates determinísticos; eventos com tick, agente, alvo e motivo. Renderizador separado da frequência lógica; modo headless não depende do renderer. Estado mutável com proprietário claro; dependências por consultas e contratos, sem acesso indiscriminado a estado interno. Este é um desenho de alto nível, não uma alteração do agendamento atual.

## 4. O que aproveitar, adaptar e evitar

| Dimensão | Aproveitar | Adaptar/evitar |
|---|---|---|
| Individualidade | Atributos, necessidades, afinidades, efeitos e relações | Prioridades comunitárias não são ordens absolutas; não tornar NPC onisciente |
| História | Identidade, memória, registros, transmissão | Limitar memória operacional; preservar eventos importantes em histórico externo; não simular toda história em detalhe máximo |
| Sociedade | Membros, liderança, valores, negociação, cooperação | Não predeterminar guerra/paz; mecanismos de força e coerção exigem especificação própria |
| Física | Propriedades e transformações observáveis | Implementar apenas abstrações úteis; evitar complexidade sem efeito verificável |
| Produção | Insumos, receitas, trabalho, saídas e logística | Preservar conservação física e pré-requisitos de conhecimento |
| Escala | Índices espaciais, filas eficientes, processamento por cadência/evento e agregação | Medir antes; não alterar causalidade por otimização; não prometer população sem benchmark |
| Experimentação | Cenários versionados, múltiplas seeds, métricas e comparação | Não interpretar resultados como previsão científica de sociedades reais; não confundir narrativa com causalidade |

## 5. Aplicação incremental ao roadmap

- S0: registrar baseline funcional, testes determinísticos, desempenho e dependências da vNext; identificar o que preservar/refatorar. Criar configuração de cenário mínima que reproduz o mundo existente.
- S1–S3: catálogo de conhecimento, pontos por técnica, pré-requisitos, estudo, ações habilitadas e registro/leitura. Demonstrar que um segundo indivíduo continua o aprendizado do primeiro, sem redescoberta nem crédito duplicado.
- S4–S5: interesses, decisões por utilidade em shadow mode, descoberta por estudo e cadeia metalúrgica física. Medir impacto na sobrevivência, produção e CPU. Comparar diferentes perfis.
- S6: pertencimento a comunidades, liderança, valores, relações, comunicação, cooperação e mediação; família e transmissão geracional reais depois dos contratos mínimos. Primeiro contato entre dois assentamentos em cenário controlado sem combate obrigatório.
- S7 e frentes transversais: otimizar pathfinding, cadência, índices espaciais, publicação e persistência com medição. Execuções comparáveis, replay e modo headless desde primeiras fatias. Ampliar catálogo tecnológico e escalas quando as bases estiverem estáveis.

## 6. Gates de design e aceitação

Para cada novo sistema, documentar: responsabilidade, estado, entradas, saídas/eventos, requisitos físicos e de conhecimento, interação com pelo menos um sistema existente, efeitos sobre desempenho, teste isolado e cenário integrado. Distinguir hipótese de implementação validada. Verificar que o comportamento desejado pode surgir sem script de desfecho; testar também contraexemplos e falhas. Comparar configurações em múltiplas seeds e relatar dispersão. Preservar compatibilidade de snapshots, reprodução determinística, visibilidade de bloqueios e limites de recursos. Não introduzir dependências entre sistemas sem contrato justificável.

A finalidade não é reproduzir todos os jogos de referência. É construir um motor reutilizável, pequeno por partes, capaz de produzir simulações variadas de acordo com condições iniciais e regras disponíveis.
