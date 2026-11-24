# Oturo vNext — Persistência, Diário de ticks e decisões do Líder

## Resultado
- **Contêiner sempre inicia pausado.** O estado salvo e o seed não alteram a pausa. A API controla 0/1/2/4×.
- A simulação reside em **volume Docker nomeado `oturo_world_data`** montado em `/opt/oturo/data`, de posse do usuário `node`. Nenhuma etapa do deploy atual deve remover ou recriar o volume; o legado continua separado.
- Em primeira inicialização, `OTURO_WORLD_SEED=oturo-starter-v1` gera um mundo reproduzível com habitante líder, três colonos, jogador, madeira, pedra e macieiras adultas e zona atravessável de pomar para replantio. Catálogo de projetos já contém depósito, casa e cemitério; **nenhum desses edifícios nasce concluído**. Em reinícios posteriores, o `active.json` é prioridade sobre seed, sem regenerar recursos ou NPCs.
- `packages/content/src/world-seeds.ts` declara a receita de mundo inicial. Geração utiliza comandos validados do motor. `createWorld` permanece puro e vazio para outros testes/geradores.
- `packages/protocol/src/world-snapshot.ts` valida o envelope `formatVersion=1`, dimensões, entidades, IDs e posição. Rejeita versões desconhecidas ou arquivos acima do limite. O motor não depende de arquivos.
- `apps/server/src/world-store.mts` implementa adaptador de persistência em arquivo. `active.json` é escrito via arquivo temporário + `fsync` + rename; guarda backup `active.previous.json`. O journal por linha do tempo fica em `logs/<timelineId>.jsonl`, registros com `sequence`, `tick`, data e ações aceitas (ID, ator, posição, parâmetros e eventos). **Apenas ticks com ações bem-sucedidas são gravados no diário**. Ticks só de crescimento, fome ou descanso sem comandos não aparecem no log, mas entram no snapshot completo.
- Sequenciamento: acrescenta ações no JSONL, depois confirma com snapshot atômico contendo `lastSequence`. Ao reiniciar, corta eventuais entradas além do marcador; impede tratar como confirmado um comando que caiu antes do checkpoint. Ações recusadas ou observações sem mutação não entram. Cada tick lógico, inclusive sem atividade, atualiza o estado ativo para preservar envelhecimento, fome e tempo.
- Salvar nomeado `saves/<nome>.json` com nomes limitados, sem caminhos arbitrários. Exportar envia JSON; importar e carregar revalidam o formato, **criam nova linha do tempo**, preservam logs antigos e pausam automaticamente.
- Um volume corrompido ou não gravável deve impedir startup ou pausar o relógio com erro. Não substituir arquivos existentes silenciosamente.
- Na **primeira migração a partir da vNext em memória**, o runner salva `/api/world` da versão anterior em `.deploy/world-backups/pre-persistence-<sha>.json`, converte em snapshot v1 e importa após subir o novo container; confirma o mesmo tick e relógio pausado. A captura não se aplica a versões já persistentes, nem importa os arquivos do legado `.old`. Eventos passados que nunca foram registrados não podem ser reconstruídos. O backup original permanece no host.

## Endpoints de homologação
| Método | Caminho | Função |
|---|---|---|
| GET | `/api/world` | Mundo, relógio, indicação de persistência/linha do tempo |
| POST | `/api/clock` | Controle 0/1/2/4× |
| GET | `/api/world/export` | Snapshot JSON exportável (v1) |
| POST | `/api/world/save` | `{role:"admin",name}` salva nomeado |
| GET | `/api/world/saves` | Lista de snapshots nomeados |
| POST | `/api/world/load` | `{role:"admin",name}` recupera snapshot |
| POST | `/api/world/import` | `{role:"admin",snapshot}` carrega JSON v1 |
| POST | `/api/world/new` | `{role:"admin",seed}` gera novo mapa usando receita de seed |
| GET | `/api/world/activity?limit=35` | Últimos ticks com ações válidas |
| GET | `/api/world/logs` | Listagem de linhas do tempo já registradas |
| GET | `/api/world/activity/export?timeline=<uuid>` | JSONL completo da linha do tempo |

## Liderança e prioridades
- `packages/content/src/leadership.ts`: tabela versionável de prioridades `Depósito (100)`, `Casa Comunitária (90)`, `Cemitério (65)`; cadáveres visíveis dão urgência adicional ao cemitério.
- `packages/systems/leadership/src/index.ts`: analisa presença/capacidade de edifícios, número de habitantes, sepultamentos, estoque e existência de fontes. A cada 12 ticks um NPC marcado como líder propõe no máximo um canteiro. Não abre outra obra se houver obra em andamento.
- O líder analisa posições candidatas dentro do mapa, exclusões de áreas agrícolas, possibilidade de caminho real (BFS), distância até fontes de madeira e pedra, até os moradores e até outras construções; pontuação e desempate determinísticos.
- `construction.propose` é comando NPC restrito a um **líder vivo** e só cria um canteiro da etapa inicial. Não concede estoque, materiais, trabalho, moradia ou capacidades fictícias. Aplicar planejamento via `applyCommand` permite auditar a decisão como qualquer outra ação. Os demais NPCs transportam materiais e constroem conforme a IA de logística.
- O inspetor do líder mostra último projeto, motivo e tick da avaliação. Modo Deus permite escolher `Habitante` ou `Líder` no pincel; somente um líder vivo por mundo neste incremento.
- A IA pessoal (alimentação, sono, enterro, plantio, construção) continua independente da estratégia do líder. Risco de falta de recursos e gargalos é registrado, não contornado por cheats.

## Limitações explícitas
- Armazenamento inicial é JSON + JSONL em volume nomeado, não PostgreSQL nem sistema de eventos transacional de alta escala. Preparado como adaptador substituível; a arquitetura vNext continua apontando para PostgreSQL/event sourcing em estágio posterior.
- O diário registra comandos **aceitos**, seus eventos e ticks. Nem todas as mudanças naturais de estado, como crescimento passivo ou fome a cada tick, produzem eventos próprios.
- Persistência guarda **um mundo ativo** e múltiplos snapshots nomeados; a troca de mundo é por carregar/importar/nova seed, não por várias simulações rodando simultaneamente.
- O Modo Deus permanece sem autenticação por decisão explícita de homologação. Dados de personagens, nomes e ações ficam acessíveis pela URL administrativa pública. Recomenda-se proteger antes de abrir o serviço para terceiros.
