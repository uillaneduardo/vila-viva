# vNext core — integração segura na main

Este diretório registra a primeira fatia **isolada** da arquitetura modular. A simulação em produção continua executando exclusivamente o motor e as telas legadas.

## Incluído no merge
- `packages/domain`, `packages/content`, `packages/engine`, `packages/systems/effects`, `packages/i18n`: contratos e código experimental headless.
- `docs/architecture`, `docs/gameplay`, `docs/ui`: contratos de gameplay, habitação, reprodução, efeitos, atributos e localização pt-BR.
- Testes novos em `tests/*.mts` e workflow independente de verificação.

## Explicitamente excluído
- `apps/server`, `apps/player-web`, `apps/admin-web`, `apps/shared-ui` novos: precisam de autenticação, UX e ambiente de homologação separado.
- `README.md`, `index.html`, `app.js`, `lab.js`, `server/`, `Dockerfile`, `compose.yml`, `infra/`, `.github/workflows/deploy.yml` e `package.json` da main: **não alterados**.

## CI
```sh
node --experimental-strip-types --test tests/buildings.test.mts tests/catalog.test.mts tests/effects.test.mts tests/engine.test.mts tests/inspection.test.mts tests/i18n-core.test.mts
```

**Atenção:** o workflow de deploy existente é disparado por qualquer push em `main`, mesmo por mudanças apenas em documentação/código isolado. Portanto, fazer merge desta PR ainda publica uma nova imagem e executa o pipeline de deploy da aplicação legada (sem alteração intencional do código de runtime). Verifique se esse deploy é desejado antes de mesclar.
