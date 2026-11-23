# Arquitetura mínima nova — fronteiras

```text
apps/
  player-web/        interface do jogador (futuro)
  admin-web/         interface Modo Deus (futuro)
  server/            gateway HTTP/WebSocket + RBAC (futuro)
  simulation-worker/ instâncias de mundo (futuro)
packages/
  domain/            tipos, contratos e erros de domínio
  engine/            executor headless de comandos/ticks
  protocol/          serialização e versões de wire (futuro)
  renderer/          visualização 2D (futuro)
docs/
  gameplay/          mecânicas e ações propostas
  ui/                fluxos e comportamento das telas
  architecture/      decisões e limites
```

- Domain/engine não importam React, DOM, Canvas, Cloudflare, Express, PostgreSQL ou WebSocket.
- Um mundo tem um executor autoritativo; UI não muta entidades diretamente.
- Tick lógico separado do loop de renderização e da sincronização.
- Infraestrutura externa implementa portas (repositórios, transporte, autenticação) sem contaminar domínio.
- Nova base é **clean-room de implementação**: usar apenas documentação de requisitos, sem copiar o código funcional da branch vNext anterior ou main.
- A proteção do God Mode deve ser garantida na API/worker, não apenas na aparência.

## Extensão do MVP de moradia e população
Novos subsistemas planejados: `construction`, `housing`, `social`, `mood`, `reproduction`, `lifecycle`, `needs`, `modifiers`, `population`, `ai`. O blueprint da casa é conteúdo em `packages/content/src/buildings/community-house.ts`, não local de execução de decisões afetivas/reprodutivas. A integração usa eventos, consultas de capacidade e processamento determinístico por tick. Ver issue #19.
