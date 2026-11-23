# Integração inicial da interface aprovada — UI-V1

**Estado:** implementação funcional de shell modular em `feat/approved-modular-sandbox-ui`, ainda como **protótipo local sem autenticação**. Integra #29, #23 e #28. O HTML anterior continua como referência de UX, não foi transplantado como código monolítico.

## Módulos implementados
- `packages/renderer/src/camera.js`: transformações, zoom no cursor, pan, picking e footprint do pincel
- `packages/renderer/src/scene.js`: canvas topdown, entidades **realmente existentes**, estados visuais e rota somente com waypoints reais; fallback geométrico
- `packages/renderer/src/sprites.js`: registro de visual IDs por entidade/estado e sprite resolver; atlas/arte ainda não fornecidos
- `packages/ui/src/icons.js`: SVGs reutilizáveis da interface
- `packages/ui/src/hud.js`: HUD superior central, relógio, depósito indeterminado, dock inferior e tamanho do pincel 1–15
- `packages/ui/src/inspector.js`: painel flutuante com largura proporcional, colapso a um ícone e navegação vertical; atributos e efeitos reais do motor
- `apps/shared-ui/app.js`: composição, mouse/WASD, hover, seleção, comandos e polling local
- `apps/server/src/index.mts`: API local de mundo/inspeção/clock/pincel, sem dados simulados de construção/família
- `packages/engine/src/engine.ts`: `advanceTick` explícito e impedimento de criar sobre posição já ocupada

## O que funciona
- Zoom e pan da câmera sem mutar mundo
- Seleção e hover de entidades, ícones geométricos, ficha real de saúde/energia e atributos derivados
- Navegação vertical do inspetor, recolher/expandir, HUD e pincéis de NPC/madeira/alimento/pedra com validação pelo motor
- Pausa/1×/2×/4× no modo administrador local, com tick independente do navegador
- As entidades são as do servidor; não criar casas/obras/estoques falsos no frontend

## Pendente — sem fingir implementação
- IA, rota/pathfinder, trabalho, fome, inventário físico, depósito, obra, moradia, famílias
- Sprite atlases reais, animações por estado de atividade, interpolação de posições futuras
- Persistência, autenticação, RBAC e WebSocket; jogador não possui intervenção administrativa
- Separação completa de tick de comando: o motor ainda avança tick em `applyCommand` no caminho legado. M1/#23 corrigirá antes da simulação definitiva
- Servidor local em loopback: **proibido expor publicamente** pelo Cloudflare Tunnel ou proxy sem autorização segura

## Uso local
```bash
npm test
npm run dev
# http://127.0.0.1:8086/admin
```
Não confundir CI de contratos/API com homologação visual de navegador; realizar browser QA manual e automatizado posteriormente.
