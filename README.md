# Vila Viva — Simulação de mundos (arquitetura vNext)

A raiz do repositório contém **somente a arquitetura nova**: mundos e entidades, registros de ações, catálogos, efeitos, atributos derivados, localização pt-BR, motor headless e duas interfaces mínimas ligadas a uma API local.

## Executar no ambiente de desenvolvimento

Requer Node.js 22.18 ou superior.

```bash
npm test
npm run dev
```

- Jogador: `http://127.0.0.1:8086/`
- Modo Deus: `http://127.0.0.1:8086/admin`

**IMPORTANTE:** esse servidor é um protótipo local, vinculado exclusivamente a `127.0.0.1`, sem autenticação/RBAC, persistência ou WebSocket. Não exponha via Tunnel/proxy público. A simulação em memória é descartada quando o processo reinicia. Ainda não existe a mecânica completa de construção, relações, reprodução, nascimento ou IA.

## Estrutura
- `apps/player-web/` e `apps/admin-web/`: telas mínimas sobre o mesmo mundo.
- `apps/server/`: API HTTP de desenvolvimento, **somente loopback**.
- `apps/shared-ui/`: renderer 2D e inspeção/ações.
- `packages/domain/`: contratos de mundo, entidade, ação, efeito e localização.
- `packages/content/`: definições de entidades, efeitos e Casa Comunitária.
- `packages/engine/`: processamento de comandos e capacidades.
- `packages/systems/effects/`: gestão de efeitos, expiração e atributos derivados.
- `packages/i18n/`: mensagens gerais de interface em pt-BR.
- `docs/`: especificações de gameplay/arquitetura e tarefas.
- `tests/`: testes unitários e integração de API.

## Versão anterior preservada
Toda a implementação antiga está em [`.old/`](.old/). A cópia preserva inclusive os antigos Dockerfile, Compose, backend, interface, testes e definição de deploy. **O repositório foi reorganizado, mas os mundos e volumes Docker não foram modificados.**

## Política de deploy
- A migração **desativa o antigo deploy automático no nível da raiz**, arquivando o workflow anterior em `.old/.github/workflows/deploy.yml`.
- O único workflow ativo da nova raiz executa validação e testes; ele **não publica containers nem modifica o homelab2**.
- A aplicação antiga que já está rodando no homelab2 permanece no estado do último deploy até que uma migração de infraestrutura seja feita separadamente.
- Antes de expor a nova API, implementar identificação/autorização do Modo Deus, RBAC, persistência e ambientes isolados.
- Não mover ou apagar os volumes persistentes da simulação antiga.

## Roadmap
Issues #15 (arquitetura), #17 (ações e fluxos), #19 (Casa Comunitária e família). O próximo marco é o primeiro ciclo jogável real com operações físicas e inspectores, seguido por ambientes de homologação isolados.
