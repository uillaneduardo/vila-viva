# Oturo — Simulação de mundos (arquitetura vNext)

A raiz do repositório contém **somente a arquitetura nova**: mundos e entidades, registros de ações, catálogos, efeitos, atributos derivados, localização pt-BR, motor headless e duas interfaces mínimas ligadas a uma API local.

## Executar no ambiente de desenvolvimento

Requer Node.js 22.18 ou superior.

```bash
npm install --no-package-lock --ignore-scripts
npm test
npm run dev
```

- Jogador: `http://127.0.0.1:8086/`
- Modo Deus: `http://127.0.0.1:8086/admin`

**IMPORTANTE:** servidor experimental, loopback por padrão, sem autenticação/RBAC. Possui relógio autoritativo, IA, agricultura, logística, construção, efeitos, persistência opcional via `OTURO_DATA_DIR` e WebSocket somente leitura. Sem diretório de dados, o estado é volátil. Não expor API mutável publicamente sem proteção. Relações, reprodução e nascimento ainda não foram entregues.

## Estrutura
- `apps/player-web/` e `apps/admin-web/`: telas mínimas sobre o mesmo mundo.
- `apps/server/`: gateway HTTP/WebSocket, persistência opcional, loopback por padrão.
- `apps/shared-ui/`: composição de interface e inspeção/ações.
- `packages/protocol/`: snapshots e contrato de stream.
- `packages/client-sdk/`: sincronização, reconexão e métricas.
- `packages/renderer/`: Canvas 2D, câmera, sprites e interpolação.
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
- O deploy original permanece arquivado em `.old/.github/workflows/deploy.yml`, e a nova raiz possui fluxo de CI, imagem vNext e deploy isolado para homologação no homelab2.
- O fluxo de integração em lote usa a branch `integration`, CI individual e coletivo e janela de estabilidade de 5 minutos. Consulte [CI/CD em lote](docs/infra/BATCHED_CI_CD.md). O workflow valida domínio, renderer e imagem Docker; em release da `main`, publica imagem imutável `vnext-sha-<SHA>` no GHCR e aciona o runner `vila-viva-svr2`. O servidor é um protótipo **sem autenticação**: evite dados reais e não considere o link secreto como proteção.
- A atualização do serviço HTTP substitui somente o container `web` da mesma stack na porta loopback 8481. O serviço `api` legado e seus volumes permanecem no Docker e não são apagados; rollback de Compose é preparado pelo script de deploy.
- A homologação pública do Modo Deus sem autenticação é uma exceção temporária solicitada pelo proprietário. Qualquer pessoa com acesso à URL poderá enviar comandos, pois não há verificação de identidade. Recomenda-se Cloudflare Access antes de qualquer uso fora do teste.
- Não mover ou apagar os volumes persistentes da simulação antiga.

## Roadmap
O [roadmap oficial (#15)](https://github.com/uillaneduardo/vila-viva/issues/15) é a fila única. Baseline auditada: `d36729c`, PR #58 integrada. Prioridades: segurança #27 e homologação do stream #57 em paralelo; sobrevivência #44, economia #50, desenvolvimento #54, sociedade #26 e interface #28. #22/#23 mantêm os gates de contratos e motor. A PR #56 ainda não integra essa baseline. Implementação, CI, deploy e homologação são estados distintos. Consulte [contrato de tempo real](docs/architecture/REALTIME_WORLD_STREAM.md).

## Nova interface modular (UI-V1)
A shell sandbox desktop da interface aprovada foi implementada com HUD central superior, dock inferior, inspetor contextual proporcional com navegação vertical, câmera WASD/pan/zoom e pincéis administrativos. O renderer consome entidades reais, sem executar regras de depósitos, IA ou construções no cliente. Execute `npm run dev` e abra `http://127.0.0.1:8086/admin` **localmente**. Consulte `docs/ui/UI_V1_INTEGRATION.md`. Para homologar no homelab2: `https://vila-viva-svr2.ulln.com.br/admin` ou galeria em `/apps/player-web/assets-preview.html` (quando o job `deploy_homelab2` estiver verde).

## Assets de UI e handoff para agentes
Ícones e futuros sprites da interface são resolvidos por IDs semânticos em `packages/ui/assets/`. A HUD e o inspetor não definem geometria SVG própria; usam `createUiVisual` e fallback seguro. O tema inicial `forest-dark` está centralizado. Veja `docs/agents/UI_ASSETS_IMPLEMENTATION.md` para contratos, extensão, testes e limites. Sprites artísticos reais e temas alternativos continuam pendentes.

## Homologação pública (exceção temporária)
Veja [docs/infra/HOMELAB2_DEPLOY_VNEXT.md](docs/infra/HOMELAB2_DEPLOY_VNEXT.md) para publicação, rollback e limitações. Este ambiente é experimental, público via Tunnel e **não possui autenticação**. Não use credenciais nem dados sensíveis; sem `OTURO_DATA_DIR` o estado é volátil; com volume configurado, snapshots e journal persistem, com restauração pausada.
