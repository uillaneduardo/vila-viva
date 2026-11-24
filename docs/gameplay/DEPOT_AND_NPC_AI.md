# Oturo — Depósito, construção pronta e NPCs autônomos (vNext)

## Contratos
- `content/buildings/depot.ts`: blueprint data-only de depósito 2×2, três etapas (fundação, estrutura, cobertura), capacidade física de 120 itens e tipos aceitos `wood`, `stone`, `apple`. Futuro edifício usa registro normal de `BuildingBlueprint`.
- `construction.place` aceita `parameters:{blueprintId,mode:"site"|"completed"}`. Padrão `site`. Modo `completed` **somente admin**, com etapas concluídas, capacidades ativadas, **estoque vazio**, sem trabalho/materiais fictícios. Spawn pronto é intervenção God Mode, não um resultado legítimo de produção da simulação.
- `construction.site` para depósito usa exatamente o mesmo sistema de entregas físicas, trabalho e colisão por footprint. Antes da conclusão não armazena recursos.
- `storage.deposit` e `storage.withdraw` verificam personagem adjacente, energia, capacidade, item permitido, quantidade e inventário físico. Só após **depósito efetivo** o total armazenado aumenta no HUD. Para repor estoque de teste, `storage.admin_supply` é comando de Modo Deus explícito, não contabilizado como entrega de NPC.
- `resource.gather` permite recolher até 3 unidades de madeira ou pedra de fonte acessível para o inventário (a exaustão permanece no mundo). Macieiras usam a ação existente `resource.harvest`.
- `systems/pathfinding`: BFS determinístico com colisão autoritativa, destino em célula adjacente ao recurso/obra/depósito. Nunca entra no tile ocupado. O caminho é refeito a cada decisão.
- `systems/ai`: agenda ações autônomas no tick do servidor (a cada 3 ticks por NPC), executa **uma ação ou passo por ciclo**. Comandos internos reutilizam as validações do motor, mas não aceleram o relógio nem enchem a lista de IDs externos.
- `renderer`: interpola deslocamento entre snapshots (animação visual, não altera posições no servidor); depósito possui fallback por etapas enquanto não há sprite PNG próprio.
- O inspetor de NPC exibe atividade, motivo, destino, trajeto e últimas 8 mudanças de decisão. O inspetor de depósito exibe estoque real, ocupação e tipos armazenados.

## Ordem de decisão (determinística)
1. Se saúde zero, inativo; se energia baixa (<=15), descansa **no local** até >=75, recuperando 12 por ciclo (local de repouso provisório).
2. Se carrega material exigido por uma obra, leva até o canteiro e entrega o necessário.
3. Se algum canteiro já tem **todos os materiais da etapa**, vai trabalhar.
4. Se falta material: procura primeiro depósito com estoque físico acessível; se não houver, procura fonte real de madeira/pedra. Move, recolhe, transporta e entrega.
5. Se carrega sobras, deposita no estoque funcional mais próximo que aceita o item.
6. Se não há obra para atender e existe depósito com capacidade, coleta recursos no mundo (prioriza árvores frutíferas quando disponíveis), transporta e armazena.
7. Sem caminho seguro, capacidade, fonte ou destino: espera. Não inventa recursos, não teleport, não atravessa outro NPC nem obstáculo.

Candidatos alcançáveis são selecionados pela menor rota e ID estável; replanejamento a cada ciclo. A IA não controla o personagem jogador. Pausa do mundo interrompe a IA; fechar navegador não interrompe simulação em memória no servidor.

## Como homologar no navegador
1. No Modo Deus escolha **Construir > Depósito > Concluída**. Posicione em área livre 2×2; inspetor confirma estoque 0/120.
2. Posicione fonte de madeira ou pedra, selecione **Habitante** e coloque NPC próximo. Veja o NPC buscar recurso, desviar obstáculos e levá-lo ao depósito. No NPC, observe histórico de decisões, energia, inventário e rota.
3. Para testar obras, crie **Casa Comunitária > Projeto (fase 1)**. Se o depósito já tiver madeira/pedra, NPCs poderão levar materiais ao canteiro e trabalhar; caso contrário buscarão fontes.
4. Crie muro ou pedra decorativa no percurso, sem bloquear **todos** os caminhos. NPC recalcula trajeto. Para ver resultado mais rápido use velocidade 4×.
5. Use o botão **Adicionar estoque (teste)** no depósito para acelerar; ele é intervenção explícita de Modo Deus, sem fingir coleta física. Uma obra concluída pelo seletor começa com suas capacidades, mas nunca com moradores ou inventário gerados automaticamente.

## Limites conhecidos
- Não existe ainda fome, personalidade, profissão, prioridades por pessoa, descanso em casa, reservas de tarefas, persistência da simulação em banco ou animações/sprites próprios de NPC/depot.
- O planejador inicial usa prioridades fixas para validar o ciclo logístico; não é uma IA generativa nem sociedade completa. Pode haver contenção ou bloqueios em corredores apertados com muitos NPCs.
- O servidor atual continua sem autenticação por exceção de homologação e o mundo em memória reinicia com container.
