# Interface aprovada — Vila Viva / Oturo — baseline visual v1

**Estado da decisão:** ACEITA como referência de UX e composição visual em 23/11/2026.
**Natureza:** protótipo HTML independente com dados fictícios; **não** homologação de motor, simulação, autenticação ou persistência.
**Rastreio:** issue #29; roadmap #15, motor #23, interfaces #28.
**Referência complementar:** `docs/ui/DESKTOP_SANDBOX_SPEC.md` e `docs/architecture/DESKTOP_CLIENT_BOUNDARIES.md`.

## 1. Decisões aprovadas — preservar na integração
1. O mapa top-down ocupa a tela inteira atrás das camadas de HUD, mantendo prioridade visual.
2. Controles de tempo (**pausa, 1×, 2×, 4×**) e recursos **centralizados no topo**; itens em depósito são os únicos contabilizados como estoque.
3. Barra de ações centralizada na parte inferior, compacta e **flutuante**, com ícones consistentes.
4. Ferramentas como pincel: prévia de ocupação, controle de dimensão de **1×1 a 15×15 células** no protótipo, aplicação por clique/arraste, cancelamento e validação por célula. Quantidade/limites futuros definidos pelo sistema de regras.
5. Painel contextual **flutuante sobre o mapa à direita** e recolhível até um ícone único na borda. O conteúdo varia conforme NPC, fonte, depósito, obra, residência ou outros tipos.
6. **Navegação vertical por ícones/legendas** na lateral interna do painel; a navegação horizontal com barra de rolagem é **rejeitada**. Conteúdo vertical pode rolar, sem barra cromaticamente intrusiva.
7. **Largura proporcional do inspetor** e adaptável ao viewport: valores iniciais de referência `clamp(360px, 29vw, 480px)` para desktop; em telas ≥1600px até 540px; telas estreitas usam painel adaptado. Esses valores podem ser ajustados após testes, sem transformar a proporção em tamanho rígido.
8. Ícones de alta legibilidade e com gramática consistente: mesmo desenho de linha, espessura e tamanho; textos em `pt-BR` com `displayName`.
9. Hover do NPC mostra **humor, ação, alerta e rota conhecida**; clique abre ficha detalhada (necessidades, efeitos/atributos, inventário, relações e decisões), conforme dados realmente disponíveis.
10. Câmera: zoom pela roda no cursor; pan por clique/arraste no terreno não selecionável ou botão do meio; WASD move **câmera**, não NPC. Atalhos `'` (pausa/retoma), `1`/`2`/`3` (1×/2×/4×).
11. Representação legível por formas geométricas, ícones/letras e animações de estado, até os sprites definitivos substituírem essa apresentação. **Não modificar a mecânica do mapa para alterar a aparência da HUD.**

## 2. Direção de arte e implementação com sprites
**Decisão:** a versão de jogo será desenhada usando **sprites/atlases**, podendo usar elementos vetoriais/SVG nos ícones da HUD. Sprites são recursos de visualização, **não** componentes de domínio, condição de vitória, fonte do movimento nem lógica da IA.

- `packages/renderer`: câmera, transformações, picking, camadas do mapa, interpolação, sprite renderer, sprite atlas resolver, transições de estado e efeitos visuais.
- `packages/ui`: componentes reutilizáveis independentes (TopHUD, TimeControls, StorageStrip, ToolDock, BrushSettings, ContextInspector, VerticalSectionNav, NpcHover, Tooltips, Notifications).
- `packages/content`: mapeia definições estáveis e categorias de entidades aos IDs de visual/ícone e estados disponíveis. Tradução separada no `packages/i18n`.
- `packages/client-sdk` / `packages/protocol`: projeções de dados tipadas e eventos autoritativos; a apresentação consome dados sem executar regras.
- Estados `idle, moving, working, resting, eating, carrying, injured, dead` (somente conforme sistemas disponíveis) podem selecionar frames/anim clips com `SpriteVisualDefinition`, `visualState`, `direction`, `animationClock` e `spriteId`.
- Atlas/sprite sheets versionados por namespace: `terrain/`, `entities/`, `buildings/`, `resources/`, `ui/`, `effects/`; evitar URLs embutidas em componentes lógicos.
- UI adota design tokens para fontes, espaçamentos, superfícies, cores semânticas, ícones, sombras e dimensões; trocar tema ou atlas sem mudar layout de domínio.
- Fallback declarado: sprite ausente → forma geométrica/ícone; placeholder é **explícito**, não substitui dados faltantes por estado simulado.
- Sprites de terceiros exigem licença/atribuição documentada; preferir artes próprias e atlas com metadados reutilizáveis.

## 3. Interações e contrato do componente
- `ContextInspector` recebe `entityId`, `kind` e seções declarativas providas pelos subsistemas; seleção permanece em estado de UI entre ticks.
- `VerticalSectionNav` consome seções permitidas/realmente disponíveis; não deve depender de nome textual, ordem do array da entidade nem manipular DOM de outros subsistemas.
- `ToolDock` define ações por capability; `BrushSettings` não cria recursos diretamente: emite comandos validados no motor.
- `StorageStrip` apresenta **estoque efetivo depositado**, não estoque fictício ou recursos em trânsito.
- `NpcHover` exibe waypoints do sistema de movimento; rota desenhada no Canvas corresponde ao pathfinder, não a suposição da UI.
- Render da HUD e menu não são recriados no tick: atualizações incrementais e interação suave.
- Componente principal não importa implementações específicas de IA, inventário ou gestação. Só usa contratos de projeção/ações.
- Câmera e HUD mantêm estado local; velocidade, inserção de objetos e alterações de mundo exigem confirmação do servidor.

## 4. Escopo da referência e exclusões
**Aceito:** disposição espacial, navegação vertical, painel recolhível, dimensionamento relativo, pincéis, ícones consistentes, hover, inspeção progressiva, animações simples e separação render/UI.
**Não homologado:** física, pathfinding, IA, reprodução, dados reais, persistência, segurança, backend ou métricas calculadas (demonstradas ficticiamente no HTML).
**Não reintroduzir:** abas horizontais roláveis, painel fixo ocupando uma coluna inteira, HUD inferior com recursos/velocidade, ação sem feedback, sprites que imponham lógica ao domínio.

## 5. Critérios de aceite de implementação
- [ ] Fidelity: HUD centro-superior, ferramentas centro-inferior, inspetor à direita com colapso para ícone.
- [ ] Responsividade: largura do painel proporcional, conteúdo sem truncamento; navegação vertical acessível em resoluções 1366×768 e 1920×1080.
- [ ] Mapa e câmera funcionam independentemente dos componentes UI; nenhuma regressão em pan/zoom/click/hover.
- [ ] Sprite renderer com atlas versionado e fallback geométrico por visual state; sem regras no renderer.
- [ ] Ícones consistentes e estados de botão `hover, active, disabled, focus`; textos localizados em pt-BR.
- [ ] Brush 1–N permite prévia, aplicação por múltiplos tiles e resposta sobre bloqueios sem alterar mundo no cliente.
- [ ] Hover de NPC aponta para rota real do motor; conteúdo do inspetor muda por tipo de entidade.
- [ ] Conteúdo sem scrollbar horizontal; rolagem vertical do corpo funciona com mouse, sem bloquear mapa fora do painel.
- [ ] Testes de interação, acessibilidade e desempenho da interface; FPS separado do tick do mundo.
- [ ] Integração realizada por componentes/adapters, **sem copiar o monolito HTML de demonstração como arquitetura definitiva**.

## 6. Sequência para integração futura
1. M1/#23: clock/ticks/eventos e projeções mínimas; reconstruir shell `TopHUD + ToolDock + ContextInspector + Camera`.
2. M2/#24: NPC real, rota/pathfinder e hover/inspeção de necessidades/efeitos.
3. M3/#25: pincéis de fontes/edificações e armazenamento físico visível.
4. M4/#26: seções social/família e estados de vida.
5. M5/#27 e M6/#28: servidor persistente, autenticação, streaming, E2E e homologação no navegador.

**Protótipo de referência:** `vila-viva-interface-aprovada.html` entregue nesta conversa. Manter a versão HTML como *referência de UX*, e não fonte única de verdade da implementação; este documento e a issue #29 são os contratos persistentes no repositório.
