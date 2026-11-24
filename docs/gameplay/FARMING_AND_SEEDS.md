# Oturo — Plantio modular v1 (sementes, pomar, cenoura e batata)

## Princípios arquiteturais
- **Content-only** em `packages/content/src/natural-sources.ts` registra espécie, semente, item produzido, modo `perennial | single_harvest`, idade das etapas, capacidade, produção, sementes por colheita e colisão. Adicionar um novo cultivo exige apenas um novo registro de conteúdo, sprite/fallback e testes, não uma ramificação no motor.
- `packages/content/src/foods.ts` define alimentos com saciedade, não sementes; `systems/needs` executa nutrição de qualquer item registrado.
- `systems/nature` envelhece plantas por ticks e diferencia perene regeneradora de plantações de safra única; plantas anuais senescentes liberam o solo.
- `systems/farming` valida áreas, células, passabilidade, ocupação e instâncias plantadas por semente. Zona é **entidade de terreno** sem colisão e **não** um estoque oculto.
- `systems/collision` usa política por espécie: macieira bloqueia; hortaliças são atravessáveis; depósitos e edificações bloqueiam; fontes básicas exauridas não bloqueiam, mas continuam visíveis.
- `engine` continua única autoridade para `farming.zone.create`, `farming.plant`, `farming.zone.remove`, `resource.harvest` e `npc.eat`.
- `systems/ai` planeja a partir do estado real do mundo; caminho até a célula adjacente ao plot; transfere a semente do inventário antes de gerar muda. Plantio é prioridade de segurança alimentar antes da construção, mas a fome crítica interrompe trabalhos.
- `renderer` representa plantações por sobreposição de solo e geometrias top-down provisórias. A macieira utiliza atlas existente. Criar PNGs de cenoura/batata não deve alterar gameplay.

## Catálogo inicial
| Espécie | Modo | Adulta em | Duração total | Colheita | Sementes recebidas por colheita | Colisão |
|---|---|---:|---:|---:|---:|---|
| Macieira | Perene | 120 ticks | 3000 ticks | até 3 maçãs por ação; regenera 3 a cada 40 ticks | 1 `apple_seed` | Sólida |
| Cenoura | Safra única | 55 ticks | 300 ticks | 3 cenouras (sem regeneração) | 2 `carrot_seed` | Atravessável |
| Batata | Safra única | 80 ticks | 330 ticks | 4 batatas (sem regeneração) | 2 `potato_seed` | Atravessável |

Após colheita integral, cenoura e batata desaparecem e o tile da zona volta a ficar livre. Se não houver colheita antes da morte, a planta seca e o tile se libera **sem criar alimento ou sementes**. Árvore perene continua existindo após morrer; pode ser cortada quando velha ou seca através da ação física `nature.cut`, gerando 4 madeiras no inventário do NPC, desde que haja capacidade.

## Conservação, circulação e segurança alimentar
1. O Modo Deus demarca **Plantio** com espécie e dimensão (quadrado de 1 a 12 células por lado). Criar zona não cria plantas ou sementes.
2. O primeiro suprimento de maçã vem de macieiras já existentes; colher gera maçãs e **uma semente**. Cenoura/batata precisam de lote inicial de sementes no depósito: criar **Depósito → Concluída**, selecionar e clicar para adicionar `carrot_seed` ou `potato_seed` (injeção de homologação explícita). O depósito não começa com itens.
3. NPC reserva trabalho em um plot livre por planejamento de rota, retira sementes reais do depósito ou usa as do inventário, viaja e usa `farming.plant`: exatamente uma semente some e uma muda surge.
4. Vegetais produzem alimento quando amadurecem; colheita converte uma planta pronta em alimento **e duas sementes no inventário**, sem creditar estoque global ou regenerar a mesma planta.
5. Havendo depósito, NPC pode transferir comida/sementes e replantar. Com fome, NPC procura maçã/cenoura/batata disponíveis no próprio inventário, depósito ou fonte colhível.
6. Se todas as árvores morrerem **antes** de existir semente guardada e não houver outra espécie plantada, a simulação não criará alimento gratuitamente: Modo Deus pode repor lote de sementes ou uma árvore para retomada. Para resiliência, criar zonas e preservar um lote de sementes ainda durante a produção.

## Limites
- Ciclo agrícola é físico, determinístico e baseado em ticks; sem fertilidade do solo, chuva, estação, irrigação, sementes de qualidades variadas, reserva de tarefa global ou profissões especializadas.
- Arte das culturas é fallback, ainda não há sprites definitivos de cenoura e batata.
- Simulação vNext em memória, reinicia quando container é reiniciado; o deploy automático do homelab2 **reinicia o mundo**. Modo Deus público continua desprotegido, como exceção solicitada.
- Não foi criado um arbusto nesta entrega; uma nova espécie será só uma nova definição com ciclo e sprites próprios.

## Homologação
1. Abrir `/admin`, criar Depósito concluído e injetar algumas sementes de cenoura e batata no estoque.
2. Selecionar **Plantio**, escolher cenoura, batata ou macieira, ajustar o tamanho da área e clicar em terreno livre. Inspecionar área para acompanhar células livres e colhíveis.
3. Criar NPCs em áreas acessíveis; acelerar o mundo e observar busca de sementes, deslocamento, plantio, amadurecimento, colheita e replantio.
4. Inspecionar um NPC para conferir itens reais (comida e sementes) e motivos das decisões; no depósito, conferir entradas/saídas de estoque.
5. Bloquear acessos com muros: o planejador não pode atravessar as colisões. Fontes de madeira/pedra exauridas deixam de bloquear, árvores permanecem sólidas até serem cortadas.
