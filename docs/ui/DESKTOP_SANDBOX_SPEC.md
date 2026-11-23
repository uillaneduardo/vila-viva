# Especificação UX/UI — Vila Viva desktop sandbox (decisão de produto)

**Status:** requisitos para implementação incremental; sem desenvolvimento de interface nesta entrega. **Referências:** #15, #23, #28, #29.

## 1. Premissas e referências
- Jogo de simulação **sandbox/colony-sim para computador, mouse como entrada principal**, God Mode observador e interventor. Interfaces de jogador e admin consomem o **mesmo mundo autoritativo**, mas capabilities diferentes.
- Referências de organização: `RimWorld` (inspeção contextual e necessidades), `Oxygen Not Included` (recursos e controles persistentes), city builders top-down (câmera e tool modes). Não clonar visuais/ícones/arte.
- Direção visual: top-down 2D, legível, formas geométricas/ícones/letras e estados animados; não exigir sprites prontos ou isometria. Design system compacto, hierarquia tipográfica discreta, alto contraste, textos localizados `pt-BR`.
- A prioridade é **observar o comportamento real** e intervir no mundo, não gerenciar janelas de administração em tela cheia.

## 2. Layout do desktop — divisão
```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Vila Viva · Mundo ▾   Dia / Hora   [⏸][1×][2×][4×]  [🪵 34][🥕 17][🪨 9]  [⚙] │
├──────┬───────────────────────────────────────────────────────────────┬────────────┤
│ Modo │                                                               │ Inspetor   │
│ 👁   │                 MAPA TOP-DOWN / CANVAS                         │ contextual │
│ 👤   │                                                               │ (seleção)  │
│ 🌿   │          ● NPC  · fonte ▴  · casa ▣  · carga ◇                 │            │
│ 🏠   │             ⇢ ⇢ ⇢ rota NPC em hover                            │            │
│ ✦   │                                                               │            │
│      │                                                               │            │
├──────┴───────────────────────────────────────────────────────────────┴────────────┤
│ Eventos ▴   [última decisão]   [alertas]   [estado da conexão / fps]              │
└───────────────────────────────────────────────────────────────────────────────────┘
```
- **Topbar** compacta fixa (48–56 px): seletor de mundo, dia/hora, controles de velocidade, recursos **realmente depositados** em depósitos conhecidos/compartilhados da vila, estado de conexão. Recursos nunca contabilizam coleta em trânsito. Ícones com legenda e tooltip; saldo agregado distinto de uma seleção de depósito individual.
- **Toolbar esquerda** (40–52 px): observar/selecionar, NPC, recurso, construções, eventos; botões com tooltips e atalhos quando houver. Ferramentas indisponíveis não apresentam ação falsa.
- **Canvas** ocupa o maior espaço; foco visual principal. UI sobreposta ao canvas apenas quando contextual; sem painel lateral gigante permanente.
- **Inspetor direito** dockable/recolhível, largura alvo 300–360 px, tabs compactas. Abre na seleção e atualiza dados sem remontar componente, preservando aba/scroll.
- **Rodapé** fino ou retrátil: eventos, alertas, erros e métricas de depuração opcionais; sem console ruidoso por padrão.
- Preferências locais de câmera, zoom, último painel/aba e modo de visualização **não** alteram o estado do mundo.

## 3. Entradas e câmera (desktop)
| Entrada | Comportamento | Observações |
|---|---|---|
| Roda do mouse sobre mapa | Zoom ancorado no cursor | Preserva ponto do mundo sob o mouse; limitar `minZoom/maxZoom` configuráveis; nada de zoom se scroll for em painel |
| Clique esquerdo sobre entidade | Seleciona entidade e abre inspetor | Seleção única no MVP; hover não altera seleção |
| Clique em terreno vazio | Não seleciona entidade; opcional limpa seleção somente com clique curto | Não executar ação de movimento sem ferramenta explícita |
| **Clique esquerdo + segurar/arrastar em terreno não selecionável** | Pan da câmera | Limiar de deslocamento (ex. 5 px) distingue clique de arraste; não selecionar no `pointerdown` |
| Botão do meio + arrastar | Pan em qualquer posição do mapa | Alternativa quando cursor está em cima de entidade |
| `W` / `A` / `S` / `D` | Move câmera continuamente | Nunca mover avatar; ignorar quando foco em input, textarea, select, contenteditable ou modal |
| `'` (apóstrofo/quote) | Alterna pausa/retomada | Ao retomar, restaurar última velocidade não-zero |
| `1` / `2` / `3` | Velocidades **1× / 2× / 4×** | Não afetar campos de edição; botões destacam velocidade ativa |
| `Esc` | Cancela ferramenta/modal; se não houver ferramenta, fecha seleção | Não cancelar trabalho autônomo do NPC |
| Clique em botão de ferramenta | Abre modo de posicionamento/inspeção | Ghost + validação e confirmação quando causa mutação |
- Zoom/câmera são completamente client-side. Pan não envia comando ao motor, não pausa os ticks e não afeta o pathfinder.
- Seleção de entidade vs pan é decidido por **hit test + limiar de movimento**; se iniciar sobre entidade, clique seleciona; pan alternativo pelo meio funciona sempre. Não arrastar entidade no MVP.
- Não capturar WASD/velocidade quando modal, chat, menu de texto ou campo possuir foco. Padrão de `KeyboardEvent.code` para 1/2/3 e `KeyboardEvent.key` para apóstrofo, com tratamento internacional no futuro; permitir personalização depois.
- Atualizar viewport em `ResizeObserver` com DPR, sem resetar câmera ou escala em cada tick. Canvas com coordenadas de mundo vs tela separadas.

## 4. Renderização e estados visuais sem sprites
| Elemento | Visual mínimo | Estado visível |
|---|---|---|
| NPC | círculo com letra/inicial e pequeno indicador de direção | cor, aro e animação (andando: deslocamento fluido, trabalhando: pulso, descansando: Z, comendo: símbolo, alerta: contorno) |
| Fonte | árvore/pedra/alimento em formas geométricas com pequeno pictograma | quantidade disponível, exaurida = dessaturado, regenerando = pequeno indicador |
| Depósito | quadrado/caixa com ícone | ocupação, entrada/saída, lotação e recursos disponíveis |
| Canteiro | retângulo tracejado e barra de progresso | etapa, material faltante, progresso, concluído |
| Casa | volume 2D estilizado com ícone de abrigo | moradores, vagas, conforto, conclusão e necessidade de manutenção |
| Item no chão | losango com ícone / quantidade | disponível, reservado, em transporte |
| Seleção | contorno/anel de destaque | persiste mesmo se a câmera se mover |
| Caminho | polilinha com nós/indicador de destino | renderizado para hover e/ou seleção enquanto houver rota conhecida |
- Indicadores críticos (fome/ferimento/exaustão/bloqueio) são pequenas marcas apenas quando relevantes; não colocar seis barras sobre cada personagem.
- Animações com interpolação da apresentação entre snapshots e `requestAnimationFrame`; jogo/decisões não dependem de FPS. Quando pausado, interrompe a progressão do mundo e animações de deslocamento, mas UI e câmera continuam fluídas.

## 5. Hover no NPC (nível 1: leitura rápida)
- Delay discreto 100–180 ms, sem bloquear a área clicável; tooltip próximo ao cursor, deslocado para não cobrir o NPC, mantido dentro da viewport.
- Conteúdo: nome, atividade atual (incluindo ícone), **humor** em barra resumida e descrição do estado, destino/objetivo curto, alerta prioritário se houver. Se atividade bloqueada, mostrar motivo curto. No hover prolongado não iniciar ação.
- Renderizar **rastro da rota planejada** em traçado fino com direção e destino. Distinguir caminho calculado vs trecho já percorrido se estiver disponível; **nunca inventar path** se motor não devolver waypoints. Caso `routeStatus=calculating|blocked|unavailable`, exibir mensagem adequada.
- O hover só afeta o mapa e UI client-side, sem consulta de rede por frame; camadas de projeção/snapshot alimentam a renderização.

## 6. Clique NPC (nível 2: inspetor contextual)
**Cabeçalho fixo:** nome, ID técnico opcional em diagnóstico, ocupação/estado, idade/fase de vida, atividade e ícones de alertas; botão seguir câmera, fechar/recolher.
**Visão geral — padrão:** saúde, energia, saciedade, sono e humor (barras); destino, tarefa/objetivo, progresso e motivo da decisão; efeitos críticos e carga atual.
**Abas contextuais:**
1. `Necessidades`: valores atuais, limites, tendências e consequências, ações e razões de impedimento.
2. `Efeitos e atributos`: nome localizado, origem, duração restante, stacks, variação de atributo base/efetivo e cadeia de cálculo.
3. `Inventário`: itens transportados, peso atual/máximo, itens reservados e destinos de entrega (somente quando subsistema existir).
4. `Social e família`: residência, moradores/relacionamentos relevantes, vínculos recíprocos, dependentes, gestação/resguardo **somente após suporte do mundo e respeitando permissões**.
5. `Decisões`: objetivo, plano, ação, avaliação/razões, caminho/destino e últimos eventos (debug detalhado só Admin).
- **Não exibir no MVP por padrão:** hashes/IDs brutos, stacks internos, todo histórico vitalício, genética detalhada, árvores de parentesco gigantes, taxas brutas sem tradução, regras de IA ocultas no modo jogador, valores nulos como dados reais, edição livre de todas as propriedades do NPC.
- Abas podem ser omitidas até haver informação verdadeira; mostrar estado `Ainda não disponível` no protótipo sem dados apenas se for útil a testers, nunca inventar números.

## 7. Outros inspetores
- **Terreno**: coordenadas e propriedades úteis; não ocupar painel se nada relevante.
- **Fonte**: recurso, disponível/máximo, regeneração em ticks, vagas, ocupantes/reservas, coletores e último bloqueio.
- **Depósito**: capacidade peso usado/livre, recursos por tipo em linhas compactas, entradas/saídas, reservas, cargas a caminho **em seção separada**; clicar recurso topbar foca estoque agregado.
- **Canteiro**: blueprint, etapa atual de 4, recursos `exigido/entregue/em rota/faltante`, trabalho concluído/restante, NPCs ativos, bloqueios.
- **Casa completa**: capacidade adultas/dependentes, ocupação, conforto, moradores, benefícios condicionais, eventos sociais da residência; não mostrar controles de gravidez.
- **Item no chão**: tipo/quantidade, reserva e estado de recolhimento.
- Painel corresponde ao `selectedEntity.kind`, montado por seções declarativas; cada subsistema projeta campos para sua seção em vez de inserir HTML em outros módulos.

## 8. Regras de HUD e comportamento de velocidade
- Um `WorldClock` autoritativo retorna `paused`, `speed`, `tick`, hora/dia e versão. UI mostra `0×/pausado, 1×, 2×, 4×`, sem acelerar via render/FPS.
- `'` pausa/retoma; `1`/`2`/`3` ajustam velocidade e podem retomar a simulação conforme comando validado.
- Saldos topbar = soma de depósitos do mundo ou da comunidade selecionada **apenas armazenados fisicamente**. Nunca incluir itens em inventários, fontes ou canteiros no total. Se não existir depósito, mostrar `—`/indisponível em vez de inventar saldo.
- Controles continuam clicáveis após atualizações e mostram confirmação/rejeição do comando; painel de eventos mostra alteração aplicada em tick.
- Mudanças de mundo em 4× alteram simulação/ticks, mas os menus, tooltips e animações respeitam duração em tempo de tela adequada para leitura.

## 9. Contratos de interface e rede
- `WorldViewProjection`: `worldId,revision,tick,clock,viewportStaticRef,entities,storageSummary,events`.
- `EntityView`: `entityId,definitionId,kind,position,direction,visualState,activityId,activityProgress,selectionPriority`.
- `NpcHoverView`: `name,mood,moodMax,activityLabel,goalLabel,routeStatus,waypoints?,highestAlert?`.
- `NpcInspectorView`: `vitals,needs,effects,attributes,inventory,social,activity,decisions`, cada seção opcional ou `unavailable`.
- `storageSummary` é projeção do `storage`, não estado novo que a UI inventa.
- Clientes recebem estado do servidor e animam por interpolação, sem decidir ações por conta própria.
- Predicado de hit testing por camada prioriza entidades selecionáveis, respeitando sobreposição e z-order. Hover e selecionado são estados de UI distintos.
- Atualizações incrementais de estado não reconstroem os controles nem reiniciam `hover/selected` sem motivo.
- UI usa `packages/i18n` e `displayName` vindo do catálogo, ícones com fallback textual e acessibilidade com contraste e nomes.

## 10. O que fica FORA desta primeira versão jogável
- Gráficos artísticos, animação esquelética, asset packs, iluminação complexa, isometria, minimapa obrigatório.
- Personagem controlado por WASD, RTS de seleção múltipla, drag-and-drop de NPCs, comandos secretos de cheats, multiplayer público.
- Janelas livres e dezenas de menus ao mesmo tempo, painéis ocupando boa parte do canvas, abas com dados fictícios, sobreposição de alertas repetitivos.
- Histórico infinito local, atualização de todas as DOM nodes a cada tick, caminho gerado no frontend sem estado real de navegação.
- Árvores genealógicas complexas, editor de efeitos por formulário genérico e automatizações de reprodução no cliente.

## 11. Incrementos homologáveis sem atrasar até M6
- **UI-V1 / M1:** câmera zoom/pan/WASD, hover/seleção, HUD velocidade, barra de recursos com estado `indisponível` se estoque inexistente; inspector com dados reais básicos, motor avança tick independente de comando. Homologável localmente.
- **UI-V2 / M2:** NPC andando no caminho do servidor, hover mostra rota real, atividade e necessidades; seleção mostra atributos e efeitos reais, IA reagindo à sobrevivência.
- **UI-V3 / M3:** topbar com estoque entregue real e inspetor depósito/canteiro/casa, ferramentas de intervenção com preview e confirmação.
- **UI-V4 / M4:** relações, moradia, gestação/resguardo e ciclo familiar observável.
- **UI-V5 / M5-M6:** persistência, reconexão, autorização e ambiente separado seguro no homelab2; smoke/E2E desktop para cada etapa.

## 12. Testes de aceite desktop
- [ ] Zoom ancorado no mouse não desloca o tile sob o ponteiro, limita escala e funciona após resize.
- [ ] Drag em terreno vazio move câmera sem criar seleção/ordem; clique curto seleciona somente entidades válidas.
- [ ] Middle-button pan funciona inclusive sobre entidades; WASD não move NPC, não interfere em inputs.
- [ ] `'`, `1`, `2`, `3` alternam pausa/velocidades 1/2/4 e botões refletem estado remoto.
- [ ] Hover de NPC mostra humor/atividade e revela rota **somente se houver dados reais**; desaparece adequadamente ao sair, seleção não pisca.
- [ ] Seleção abre inspetor contextual correto e preserva abas/scroll durante updates.
- [ ] Recursos de topo são estoque entregue agregado, nunca material coletado e ainda transportado.
- [ ] Estado de cada entidade possui distinção geométrica/cor/ícone; animação responde à atividade real.
- [ ] HUD permanece compacta e canvas ocupa a maior parte da viewport em desktop 1366×768 e 1920×1080.
- [ ] Rotulagem em pt-BR e feedback de ação, incluindo offline/bloqueada/erro.
- [ ] FPS da renderização independe do tick e não há rerender completo de DOM em cada frame.
