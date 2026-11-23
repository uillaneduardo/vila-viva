# Vila Viva — reconstrução gameplay-first

Esta branch é uma **base nova e isolada**, sem copiar o JavaScript, HTML ou backend das implementações anteriores. O único material reaproveitado são documentos de requisitos e decisões.

## Primeiro: especificar
- [Ações, precondições e permissões](docs/gameplay/ACTIONS_AND_PERMISSIONS.md)
- [Ciclos de gameplay](docs/gameplay/CORE_LOOPS.md)
- [Fluxos e telas dos dois perfis](docs/ui/SCREEN_FLOWS.md)
- [Decisões a homologar](docs/gameplay/OPEN_DECISIONS.md)

A documentação é proposta de produto e antecede a implementação de gameplay completo. Issue #17 (G0), vinculada à #15.

## Fundação mínima
- `packages/domain/`: contratos TypeScript para estados, entidades, ações e resultados, sem UI, banco ou rede.
- `packages/engine/`: uma implementação inicial headless com um mundo, um NPC e comandos reais de movimentação e criação de fonte, apenas para validar limites arquiteturais.
- `apps/player-web/` e `apps/admin-web/`: reservados às interfaces sobre esses contratos; sem UI mock herdada.
- `infra/`: reservado a deploy futuro. A main existente e o deploy não são alterados.

## Executar os testes
```bash
node --version  # 22.18+ recomendado
node --experimental-strip-types --test tests/*.test.mts
```

O primeiro incremento **não** possui persistência, REST/WebSocket, autenticação ou UI funcional. Não publique os comandos em um servidor sem RBAC. Os recursos mínimos visam testar arquitetura, não simular todo o gameplay.
