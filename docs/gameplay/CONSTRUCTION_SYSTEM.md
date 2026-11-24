# Oturo — construção modular v1 (Casa Comunitária)

**Status:** implementação de um canteiro funcional no motor vNext, com controle explícito de homologação no Modo Deus. A IA de transportes, depósito físico, moradia, descanso e relações sociais automáticas seguem futuras.

## Responsabilidades
- `content/buildings/community-house.ts`: blueprint versionado com footprint 2×2, etapas, recursos, workUnits e capacidades após conclusão. Não importa o motor, nem confere buffs a NPCs.
- `content/buildings/registry.ts`: registro de projetos. Um novo tipo entra como outro blueprint com etapas e capacidades, sem copiar o motor.
- `systems/construction/src/index.ts`: estado de canteiro, materiais entregues, condições por etapa, trabalho, transições, capacidades derivadas.
- `systems/collision/src/index.ts`: ocupa **todas as células do footprint** e impede posicionamento / movimento sobre elas. Continua servindo obstáculos e fontes naturais.
- `engine.ts`: valida comandos, autorizações e invariantes. Emite `construction.material_delivered`, `construction.stage_completed` e `building.completed`.
- `renderer/src/sprites.js`: identificadores `buildings/community_house` para as fases `site / foundation / structure / roof / completed`. O renderizador desenha fallback geométrico por fase até serem disponibilizados PNGs do PixelLab — esses SVGs/sprites definitivos **ainda não foram gerados**.
- `ui/src/inspector.js`: status, custo e trabalho por etapa, capacidades ativas e comandos explícitos de homologação.

## Estados e regras
1. `construction.place` (admin) exige blueprint registrado e footprint desocupado inteiramente.
2. `construction.deliver` exige ator adjacente, vivo e com energia e **inventário físico** contendo exatamente os materiais entregues. Transfere somente a quantidade necessária para a etapa.
3. `construction.work` exige ator adjacente, energia e todos os materiais da etapa entregues; acrescenta 1 trabalho por comando e consome 1 energia. Não gera progresso pelo tempo sozinho.
4. `construction.admin_supply` e `construction.admin_work` são ferramentas **explicitamente artificiais do Modo Deus**, destinadas à homologação antes de existir logística NPC. O primeiro preenche somente o material necessário na etapa atual, o segundo acrescenta unidades de trabalho com validação. Não simular atores nem creditar depósito.
5. Etapa completa consome as entregas da etapa, reinicia `delivered={}` e `workDone=0`, avança `stageIndex` e emite evento.
6. Última etapa completa marca `status=completed, availability=available` e `completedTick` uma vez. Não aceita mais materiais ou trabalho.

## Blueprint inicial
| Etapa | Madeira | Pedra | Trabalho |
|---|---:|---:|---:|
| Fundação | 4 | 12 | 30 |
| Estrutura | 24 | 6 | 45 |
| Telhado | 16 | 0 | 30 |
| Acabamento | 8 | 2 | 20 |
**Total: 52 madeira, 20 pedra e 125 unidades de trabalho.**

## Capacidades e efeitos
`buildingCapabilities(site)` retorna **vazio** para canteiros e construções indisponíveis, e depois da conclusão retorna: 6 vagas adultas, 2 dependentes, +10 pontos de conforto e 4 vagas sociais. Isto **não** significa atribuição automática de moradores ou aplicação incondicional de `well_sheltered`. O sistema de moradia, quando implementado, usará essas capacidades e exigirá residência real para aplicar o efeito condicional.

## Homologação web
1. Abrir `/admin` na versão vNext e clicar **Construir**. Pincel reserva footprint 2×2, com feedback vermelho para posição inválida.
2. Posicionar canteiro, clicar **Inspecionar** e selecionar o canteiro.
3. Ver requisitos da Fundação; clicar em **Adicionar madeira/pedra (Modo Deus)** para completar os materiais da etapa. Clicar em **Aplicar trabalho +15** até completar a etapa e repetir.
4. Observar evolução geométrica por etapa no mapa. Ao terminar Acabamento, conferir quatro capacidades e impedimento de nova obra ou trabalho na mesma entidade.
5. Testar que macieiras, NPCs, rochas, muros e outros canteiros impedem sobreposição.
6. Reiniciar container **apaga** o mundo de homologação; persistência vNext ainda não implementada.

## Próximas dependências
- Produzir pixel art de cada etapa (mesma perspectiva, dimensões e pivô), cadastrar atlas para `buildings/community_house`.
- Implementar extração real de madeira/pedra → pilhas/inventário → navegação/pathfinder → transporte e entrega automática → trabalho com energia e prioridades.
- Implementar moradia, ocupação de vagas, conforto e `well_sheltered` condicionado a residência/uso reais.
- Persistência, recuperação de obra após reinício e proteção de Modo Deus.
