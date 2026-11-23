# Vila Viva — Game Design Document v0.1

## Visão
RPG medieval de assentamentos persistentes, colaborativos e autônomos. O objetivo é expandir de um acampamento a uma cidade viva por meio de coleta, produção, construção e cooperação.

## Princípios
- Jogadores sem classes: habilidades evoluem pelo uso.
- NPCs especializados, controlados pelo servidor conforme estoques e necessidades.
- Jogadores podem realizar qualquer ação para a qual possuam equipamento, recursos, stamina e habilidade suficientes.
- Edifícios comunitários são disponibilizados pelo líder como blueprints e progridem mediante entrega de materiais + tempo de trabalho.
- Pontos de atividade possuem vagas limitadas e animações visíveis.
- O mundo continua evoluindo quando jogadores estão desconectados (planejado para versão com servidor autoritativo).
- Um jogador offline fica representado no mapa em trabalho, repouso ou rotina social, sem ações econômicas irreversíveis não autorizadas.
- Guardas NPCs e quartel são expansões futuras, não parte da v0.1.

## NPCs iniciais
| NPC | Função | Prioridade |
|---|---|---|
| Líder | Planeja e libera blueprints | Progresso comunitário |
| Coletor | Madeira / frutos | Abastecimento |
| Fazendeiro | Comida | Suprimentos |
| Pedreiro | Pedra / minério | Construção |
| Construtor | Execução de obras | Etapas com materiais entregues |
| Mercador | Comércio | Abastecimento básico |

## Locais de atividades
- Floresta: madeira, frutos, caça, com vagas independentes.
- Fazenda: alimentos.
- Pedreira: pedra.
- Mina: minério.
- Canteiro: trabalho em construção.

## Primeiro projeto
Casa comunitária para 6 moradores. Etapas: fundação, estrutura, telhado, acabamento. Materiais devem ser entregues por etapa; construção depende de trabalho. No MVP, apenas um projeto ativo.

## Recursos e necessidades
Madeira, pedra, alimento, minério, moedas; energia/stamina dos personagens. O estoque comunitário mantém disponibilidade de materiais. Expansão futura: reservas pessoais e mochila limitada.

## Simulação
Um minuto de mundo por tick. Os NPCs verificam seus objetivos, escolhem locais com vagas e produzem ao finalizar ciclos; descansam quando precisam. Estoque de comida é consumido diariamente. A implementação inicial é propositalmente simplificada.

## Eventos de teste
Colheita abundante, seca, caravana, tempestade, animais selvagens. Aleatórios a cada 4 dias de mundo e também disparáveis manualmente. O laboratório permite avançar um dia e comparar os resultados.

## Limitações explícitas da v0.1
Simulação local em um único navegador. Não há sincronização multiplayer, autenticação, combate, backend, persistência de mundo em servidor, nem execução real quando a aba está fechada. O estado é mantido em localStorage por navegador. A arte é procedural para evitar dependências externas e acelerar a homologação.

## Roadmap
E0: simulação visual local; E1: motor com testes automatizados; E2: backend com estado autoritativo e persistência PostgreSQL; E3: multiplayer e personagens AFK; E4: mercado e crafting; E5: exploração, combate, quartel e invasões.

## Arte
Usar sprites próprios/procedurais na primeira versão. Para futuros pacotes, avaliar Kenney e itch.io (licença de cada asset e atribuição antes de incorporar). Phaser pode substituir a renderização Canvas atual quando a jogabilidade exigir.
