# Vila Viva — vNext

Reconstrução limpa do projeto. A implementação antiga permanece no histórico Git; nesta branch, somente a documentação foi reaproveitada.

## Protótipo de interface administrativa
Abra `apps/admin-web/index.html` no navegador ou sirva `apps/admin-web/` com um servidor HTTP estático (ex.: `python3 -m http.server 8080 --directory apps/admin-web`).

**Importante:** os mundos, NPCs, métricas e comandos desta etapa são dados demonstrativos de interface, não uma simulação persistente. Nenhum comando é enviado ao servidor. Isso é intencional: primeiro homologar layout, fluxo e componentes.

## Organização
- `apps/admin-web/`: protótipo standalone de God Mode, mapa topdown e inspetor.
- `apps/player-web/`: reservado à interface do jogador.
- `packages/`: reservado aos novos contratos, núcleo e motor.
- `docs/`: referências preservadas e decisões arquiteturais.

## Sequência
A1 — Admin shell, mapa, inspeção, menus e ferramentas em dados mock; A2 — homologação responsiva/touch e design system; A3 — contratos do cliente; E1 — núcleo headless; E2 — persistência; E3 — WebSocket e sincronização; E4 — permissões; E5 — deploy e homologação.

Não fazer merge na main até existir um novo deploy seguro e testes adequados. Issue #15.

## A2 — Modularização da interface
A composição principal permanece em `apps/admin-web/src/app.js`. As telas, atividade e inspeção foram extraídas para `src/features/`, com escape de dados de exibição em `src/shared/`. Tokens de tema em `src/styles/tokens.css` e breakpoints em `responsive.css`.

### Verificação
```bash
cd apps/admin-web
npm test
```
O workflow `Admin UI checks` executa verificação de sintaxe e testes no Ubuntu 24.04 / Node 22. Esta etapa **não inclui backend, WebSocket, persistência nem deploy**.
