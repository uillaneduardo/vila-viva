# ADR — Cliente desktop sandbox, mapa, inspeção e separação da simulação

**Status:** proposta aprovada para detalhamento UX / implementação futura em fases, 23/11/2026.

## Contratos e ownership
- `packages/engine/`: mundo, relógio lógico, comandos; **não** importa renderer/canvas/DOM.
- `packages/systems/movement/`: pathfinder, caminho e estado da movimentação real, incluindo `routeId`, `waypoints`, `plannedAtTick`, `routeStatus`.
- `packages/systems/needs,effects,inventory,storage,construction,social,ai/`: estado e regras, sem conhecimento da HUD.
- `packages/protocol/`: versão de mensagens e projeções cliente; tipos distintos para hover resumido, inspector detalhado e métricas de recurso.
- `packages/client-sdk/`: snapshots, diffs, resync, status de conexão e ações assíncronas.
- `packages/renderer/`: `camera`, `hit-test`, `layers`, `interpolation`, `visual-states`; frames não alteram ticks.
- `packages/ui/`: layout, barras, tooltips, inspector contextual, atalhos, estado de seleção e modos de ferramenta.
- `packages/i18n/`: títulos de recursos, atividades, estados, efeitos e mensagens.
- `apps/player-web/` e `apps/admin-web/`: compõem SDK/renderer/UI com capabilities diferentes; nenhum sistema de jogo duplicado.

## Máquina de estados de entrada
`idle → hover` ou `idle → pointerDownOnEmpty → draggingCamera|clickEmpty`; `idle → pointerDownOnEntity → selectEntity`; `middlePointerDown → draggingCamera`; `toolActive → placementPreview → request → ack`.
- A seleção ocorre em `pointerup`, depois de comparar deslocamento inicial e limiar; cancelar em `pointercancel`.
- Transformações `screenToWorld` e `worldToScreen` são inversas e testáveis; zoom centrado no cursor preserva coordenadas.
- Números e botões de velocidade acionam a mesma ação de mundo no backend; atalhos não alteram diretamente o estado autoritativo.
- O teclado só atua quando documento/mapa está no contexto de navegação; nunca em inputs ou diálogos.

## Render / desempenho
- Camada 0: terreno cacheado / chunk.
- Camada 1: elementos fixos, fontes e construções.
- Camada 2: cargas e personagens, rAF/interpolação.
- Camada 3: rota em hover/seleção, destino, feedback e prévia de colocação.
- HUD HTML/DOM desacoplada do canvas; atualiza por seletores de estado e dados realmente alterados.
- Worker de simulação roda independente da aba; o cliente interpola entre revisões recebidas.
- Budget/profiling de render e ticks separados. Sem invalidar canvas por alteração de texto, sem realocar câmera em cada snapshot.

## Etapas e riscos
- UI-V1 usa projeção mínima com servidor de desenvolvimento restrito a loopback; não publicar o God Mode inseguro.
- WSS/autenticação/persistência em M5; exposição pública só após RBAC validado.
- Inserir indicador de `Sem dados` quando módulo ainda não existir. Não inventar rota ou estoque.
- Sistemas só emitem alterações reais; UI não mostra efeitos/ação visual que ainda não foi confirmada.
