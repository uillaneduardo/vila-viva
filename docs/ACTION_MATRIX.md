# Vila Viva — catálogo de ações e fronteiras de UX

## Jogador
Ações demonstradas nesta etapa: observar o mundo, selecionar e inspecionar NPCs, fontes e construções; navegar pelo mapa e alternar mundos de demonstração.
Ações planejadas, ainda indisponíveis: mover personagem, coletar, transportar/entregar, comer, descansar, trabalhar em canteiro, interagir/socializar. Elas exigem stamina, inventário, equipamento, distância, vagas e validação pelo motor.

## Administrador
Ações demonstrativas: selecionar entidades, criar mundos temporários, pausar, velocidade, criar NPCs/fontes fictícios e eventos. Somente interface; nenhuma alteração é persistida.
Ações planejadas: criar construções, editar entidades, regras do mundo, clonar mundos, auditar comandos e comparar estatísticas.

## Segurança
O catálogo em `packages/protocol/src/actions.js` é declarativo e serve à UX. O backend deve autenticar e validar autorização por role e por comando; jamais confiar que a interface escondeu controles. O jogador não recebe funções de Modo Deus.

## Contratos de integração
Comandos futuros: `world.move`, `resource.collect`, `inventory.transfer`, `needs.eat`, `needs.rest`, `building.work`, `entity.interact`, `npc.spawn`, `resource.spawn`, `event.trigger`, `world.pause`, `world.speed`, `world.rules`.
Todas as mensagens mutáveis precisam de commandId/idempotência, worldId, actor, autorização, validação, tick de aplicação, seq e auditoria.

## Critérios de aceite de UI
Player e admin possuem telas separadas; compartilham somente renderer e dados mock neste estágio. O jogador não recebe ferramentas administrativas. Seleção, zoom, toque, navegação e inspetor são testáveis em ambas. Ações futuras não podem aparentar que estão funcionais. Nenhum WebSocket, backend ou persistência é simulado como se fosse real.

## Ações contextuais da seleção (protótipo atual)
- NPC → jogador: inspecionar; interagir (planejada). Admin: inspecionar, **restaurar saúde (prévia)**, editar atributos (planejada).
- Recurso → jogador: inspecionar; coletar (planejada). Admin: inspecionar, **reabastecer fonte (prévia)**, editar atributos (planejada).
- Construção → jogador: inspecionar; trabalhar/entregar (planejadas). Admin: inspecionar, **avançar obra 25% (prévia)**, editar atributos (planejada).
- Ações desabilitadas exibem motivos; as ações de demonstração alteram apenas as entidades locais mock. Nenhum motor autoritativo ou persistência.
