# Oturo — ciclo econômico e ocupações v1

## Contratos e módulos
- `content/items.ts`: IDs de itens físicos e rótulos/grupos estáveis (`raw`, `food`, `seed`, `processed`, `equipment`). O inventário do NPC e estoque dos edifícios usam exatamente o mesmo `Record<string,number>`.
- `content/recipes.ts`: receitas puras declarativas, com `workstationId`, `inputs`, `outputs`, `workUnits` e domínio. `building.workshop` usa a interface de blueprint existente (`production.recipes`) e capacidade de estoque, não uma regra especial no renderizador.
- `systems/production`: ordens (`recipeId,quantity,workDone`), validação de ingredientes/capacidade e conversão atômica na conclusão das unidades de trabalho. Sem completar etapas ou criar itens por decisão de IA.
- `engine` autoriza `production.order` (somente Modo Deus ou líder vivo), `production.work` (trabalhador adjacente) e `npc.equip` (ferramenta **fisicamente carregada**). Comandos válidos entram no journal de ticks persistente existente.
- `systems/ai`: logística mantém prioridade sobre novas coletas; materiais em inventário vão para obra ou oficina conforme demanda, sobrantes ao depósito. Com necessidades imediatas atendidas, afins escolhem entre trabalhos disponíveis. Ferramentas são retiradas, transportadas e equipadas do inventário real.
- `content/characters.ts`: traços positivos, neutros e negativos com `affinities` por `WorkDomain`, modificadores de atributos, multiplicadores de recuperação e chance de ferimento; sem regras específicas por nome de personagem.
- `systems/health`: recuperação condicionada a alimentação (`satiety > 25`), tick e abrigo/cama disponível. Traços de cura positiva/negativa ajustam o ganho. Mortos não se recuperam; fome anula regeneração. Continuidade da saúde do personagem não depende de UI.
- `systems/leadership/production`: calcula demanda de equipamentos do assentamento a partir dos itens existentes em inventários, equipamentos e estoques, considerando ordens abertas. Antes de solicitar a ferramenta, verifica se precisa produzir lingotes. O líder cria a ordem (não fabrica). `leadership` planeja agora a construção da oficina após depósito e abrigo, respeitando emergências funerárias.
- `api/economy`: projeção somente leitura para o Modo Deus de demandas, motivos do líder, oficina, faltas de insumos e depósito. Sem cópia de regra na interface.
- `UI`: barra de HUD superior permanece compacta; inspeção do depósito usa listas expansíveis por categoria com números e capacidade. Painel Mundo acompanha fabricação e líder. Minério de ferro/cobre podem ser posicionados via pincel Pedreira. Arte mineral geométrica provisória, sem exigir sprite novo para regras novas.

## Fluxo material
```text
Fonte de madeira, pedra, ferro ou cobre
 → coleta por NPC (risco, energia, equipamento apropriado)
 → inventário físico (limite 12 itens)
 → depósito ou estoque físico da Oficina
 → ordem de produção do líder (sem creditar inventário)
 → trabalho físico no prédio, ingrediente presente
 → no último workUnit: insumos consumidos, produtos entram no estoque
 → transporte ao depósito ou NPC retira ferramenta
 → npc.equip: item deixa inventário e ocupa slot; risco de trabalho reduz
```

## Catálogo inicial de receitas
| Receita | Consome | Trabalho | Produz |
|---|---|---:|---|
| Fundir ferro | 3 minério ferro + 1 madeira | 4 | 2 lingotes ferro |
| Fundir cobre | 3 minério cobre + 1 madeira | 4 | 2 lingotes cobre |
| Fabricar machado | 2 lingotes ferro + 2 madeira | 5 | 1 machado |
| Fabricar picareta | 2 lingotes ferro + 2 madeira | 5 | 1 picareta |
| Fabricar martelo | 1 lingote ferro + 1 lingote cobre + 2 madeira | 5 | 1 martelo |

## Priorização
1. Sobrevivência, fome, descanso e sepultamento precedem qualquer preferência pessoal.
2. Material já transportado para trabalho/obra é entregue; depois produtos não demandados são depositados antes de novas coletas.
3. Os demais trabalhos concorrentes têm pontuação por afinidade ocupacional e distância; agricultura, extração, construção, fabricação e logística não são permissões exclusivas.
4. O líder prioriza estoque, camas, oficina, sepultamentos urgentes; a oficina cria ordens de demanda e falta de insumos.
5. Se a fonte de minério não existir, a IA não cria minério: a ordem aguarda suprimento de jazida real ou injeção explícita do Modo Deus.

## Homologação
1. Selecione um depósito concluído: verifique **ocupação**, **Sementes** e as outras categorias expansíveis. Com 1×/4×, confirme que o estoque só aumenta após a entrega.
2. Selecione **Pedreira → Minério de ferro** e **Minério de cobre**, posicione jazidas. Adicione NPCs e observe coleta e transporte.
3. Crie **Oficina → Concluída** (ou aguarde projeto do líder); em sua inspeção use `Solicitar receita` ou aguarde o líder.
4. Confira filas, insumos, etapas de trabalho e quantidades de lingotes/ferramentas.
5. Selecione NPCs para visualizar traços/afinidades. Trabalhadores favoráveis a mineração ou fabricação tendem a buscar estas atividades quando disponíveis.
6. Em Mundo → **Economia e decisões do líder**, acompanhe necessidade de ferramentas, razões de decisões, bloqueios de receita e depósito.
7. Exporte o diário JSONL para confirmar `production.order`, `production.work`, `storage.deposit`, `npc.equip` e coletas realizadas.

## Limites
- Oficina reúne fundição e bancada nesta primeira iteração. Futuramente separar edificios usando `recipe.workstationId` e diferentes blueprints.
- Recuperação é regeneração física condicionada, não medicina avançada. Medicamentos, hospitais, infecções, doenças contagiosas, durabilidade de equipamentos e especializações profissionais serão extensões dos contratos existentes.
- Preferência de ação é ponderada, não profissão exclusiva; não há aprendizado, experiência, qualificação progressiva nem contratos de trabalho.
- Um líder emite até uma ordem por intervalo de decisão (12 ticks); primeira meta é uma ferramenta de cada tipo por até quatro NPCs, aumentando conforme população, sem assumir estoque infinito.
- Recursos e inventários do mundo são persistidos em snapshots JSON v1; o histórico de ticks continua usando o journal da etapa anterior. Novos campos do domínio são opcionais e snapshots antigos continuam carregáveis.
