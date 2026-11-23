# Localização de conteúdo — pt-BR

## Decisão
IDs de conteúdo/ações/efeitos e campos de protocolo permanecem estáveis e independentes do idioma. Cada **definição** possui `displayName` localizado; o `name` de um personagem é nome próprio e não deve ser traduzido automaticamente.

Exemplo:
```ts
{id:"resource.wood",displayName:{"pt-BR":"Fonte de madeira"}}
```

## Responsabilidades
- `packages/domain/src/localization.ts`: contrato `LocalizedText`, idioma padrão, validação e fallback.
- `packages/content`: fornece rótulos `pt-BR` para entidades, efeitos, construção e etapas.
- `packages/domain/src/registry.ts`: exige texto de exibição para entidades e ações registradas.
- `apps/server`: endpoint `GET /api/catalog` publica rótulos, não regras.
- `apps/shared-ui`: usa o catálogo para títulos de recursos e nomes de ações, nunca interpreta IDs na interface.
- Strings gerais da UI (menu, mensagens, feedback) já estão em português neste protótipo; para idiomas adicionais, migrar essas strings a uma coleção de mensagens em pacote `i18n`.

## Regras
- `pt-BR` obrigatório e não vazio nas definições.
- Fallback para `pt-BR` quando outro locale não estiver cadastrado.
- Não traduzir IDs, chaves de save, `resourceType`, IDs de comando, `tags`, `action.id` ou nomes próprios.
- Textos fornecidos por jogadores devem ser apresentados como dados, com escaping adequado.
- Não introduzir `displayName` mutável na instância para conteúdo derivado de definição: resolver pelo `definitionId`. Valores customizados (apelidos, nomes próprios) são campos próprios.
- Traduções futuras poderão suportar descrições, plurais, formatos de data/medidas e variáveis de mensagem, sem afetar contratos do motor.

## Mensagens genéricas de interface
- `packages/i18n/src/index.js` concentra as mensagens da interface em `UI_MESSAGES['pt-BR']`; `createTranslator(locale)` resolve idioma e faz interpolação explícita de parâmetros com checagem de placeholders.
- `data-i18n`, `data-i18n-aria`, `data-i18n-placeholder` e `data-i18n-value` localizam o HTML estático ao iniciar, sem injetar HTML arbitrário.
- `apps/shared-ui/app.js` utiliza `t()` para razões de bloqueio, feedbacks e detalhes dinâmicos; textos de entidades/ações continuam chegando do catálogo de conteúdo pela API.
- Em novas telas, **não inserir novas strings fixas** em componentes; criar chaves estáveis neste pacote. A UI traduz apresentação, nunca IDs de comando, salvamento ou rede.
- Sem seletor de idioma neste incremento: `pt-BR` permanece o único locale disponível; fallback está pronto para novos idiomas.
