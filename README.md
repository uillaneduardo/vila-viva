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
