# UI assets — contrato para agentes de desenvolvimento

**Projeto:** Vila Viva / Oturo · **Versão:** UI Visual Registry v1 · **Status:** implementação base na PR de modularização visual.  
**Baseline de UX intocável:** [docs/ui/ACCEPTED_INTERFACE_V1.md](../ui/ACCEPTED_INTERFACE_V1.md).  
**Dependências:** UI-V1 #29, M1 #23, M6 #28.

## Objetivo e fronteiras

Centralizar **sprites, ícones, estados visuais e temas** da interface. A simulação continua no motor: o registro visual não calcula fome, saúde, humor, caminho, ocupação, duração de efeito nem autorização. Renderizar sprite é consequência de uma projeção de estado real. IDs de protocolo e de gameplay não mudam para trocar imagens.

## Estrutura existente

```text
packages/ui/
  assets/
    icons/definitions.js       SVGs estáticos internos, apenas geometria
    manifest.js                IDs semânticos → ícone e sprite opcional
    registry.js                UiAssetRegistry, validação e resolução de visual/estado
    visual.js                  createUiVisual() com carregamento e fallback SVG
    themes/index.js            tokens e applyUiTheme()
    sprites/README.md          convenções de assets futuros
  src/
    icons.js                   adaptador legado para quem ainda usa icon()
    hud.js                     consome IDs semânticos no dock/relógio
    inspector.js               consome IDs semânticos no painel vertical
packages/renderer/src/
  sprites.js                   sprites de **entidades do mundo**, independente de UI
  scene.js                     render top-down independente de assets da HUD
apps/shared-ui/
  app.js                       composição, aplicação do tema
```

## Contratos de chamadas

- `getUiIcon('action.add-npc', {size:20, state:'normal'})` retorna SVG estático e confiável; **não** concatenar markup do usuário.
- `getUiVisual('resource.wood',{state:'hover'})` retorna `{id,icon,sprite,state,theme}` congelado.
- `createUiVisual('section.effects',{size:19})` retorna elemento DOM com SVG fallback. Se um sprite válido estiver cadastrado, apenas após `load` bem-sucedido o sprite substitui o SVG. Em `error`, o fallback permanece visível.
- `uiAssets.registerSprite('action.add-npc','/assets/ui/actions/add-npc.webp',{state:'selected'})` registra visual **somente** a partir de caminho local aprovado. **Não registrar arquivos inexistentes**. Estes são exemplos contratuais, não assets presentes.
- `uiAssets.setTheme('forest-dark')` escolhe tema registrado para resolução futura de visuais; `applyUiTheme(document.documentElement,'forest-dark')` aplica CSS vars. Não trocar tema em CSS isoladamente.
- `icon('inspect',20)` é apenas adaptador compatível para módulos legados; **código novo deve usar IDs semânticos**, não nomes de desenho.

## IDs semânticos estáveis

- `action.inspect`, `action.add-npc`, `action.add-wood`, `action.add-stone`, `action.add-food`, `action.build`, `action.events`, `action.metrics`.
- `control.pause`, `control.resume`, `control.collapse`, `control.expand`, `control.follow`, `control.close`, `control.speed`.
- `section.overview`, `section.attributes`, `section.effects`, `section.inventory`.
- `resource.wood`, `resource.food`, `resource.stone`, `effect.generic`, `ui.unavailable`.

Estes IDs são exclusivos da **apresentação**. O comando do motor permanece `npc.spawn`, `resource.spawn` etc. Um sprite inexistente não é um recurso inexistente no mundo.

## Estados, fallback e fonte segura

O registro aceita `normal`, `hover`, `selected`, `disabled` e `alert`. Um sprite específico de estado é preferido ao genérico; se nenhum existir, SVG. `src` deve ser um caminho local começando por `/assets/ui/` e terminando em `.png`, `.webp` ou `.svg`, sem `..`, URL externa ou `data:`.

Estados `hover/selected/disabled` são **apresentação** e não regras. A UI atual possui classes CSS para estados nos botões; passar o estado ao resolver pode ser adicionado gradualmente sem alterar o contrato.

## Como outro agente deve adicionar um novo asset

1. Identificar o componente e seu estado semântico (ex.: `section.inventory`), preservando a disposição aprovada (HUD topo central, dock embaixo, inspector direito proporcional e recolhível, navegação vertical).
2. Se o ID ainda não existir, adicioná-lo a `assets/manifest.js` com `{icon:'...',sprite:null}`. Se necessário, registrar geometria local em `icons/definitions.js`. Nunca colocar SVG copiado em `hud.js` ou `inspector.js`.
3. Criar o sprite em `public/assets/ui/<namespace>/<nome>.webp` (ou PNG/SVG seguro). Registrar licença/autoria em um inventário de assets. Os arquivos reais ainda **não** foram criados.
4. O servidor loopback mapeia `/assets/ui/...` para `public/assets/ui/...` e serve PNG/WebP/SVG; verificar arquivo real, MIME e resposta HTTP. Registrar o caminho em um bootstrap/manifest central **depois que existir** e utilizar `createUiVisual()`. Se o browser não carregar, verificar resposta HTTP e fallback.
5. Para novo tema, cadastrar tokens em `themes/index.js`, mapear estados de sprite por tema e verificar contraste/foco/disabled. Não modificar cores ou desenhos do mapa nesse PR.
6. Testar em 1366×768 e 1920×1080; confirmar que painel continua proporcional, sem barra horizontal; zoom, pan e WASD do mapa intactos.
7. Rodar `npm test`, `node --check` em módulos UI e realizar QA visual no navegador. Atualizar issue #29 com evidências e limitações.

## Aceite do subsistema

- [x] Registro semântico versionado e alias de compatibilidade
- [x] Ícones consolidados, sem SVG duplicado em módulos de interface
- [x] Componente sprite-aware com fallback em ausência/erro de carregamento
- [x] Validação de path, tema e estado; testes automatizados de contrato
- [x] Tema inicial `forest-dark` centralizado nos tokens principais
- [ ] Artes/sprites de interface produzidos e licenciados
- [ ] Troca real de tema visual testada com múltiplos temas
- [ ] Empacotamento/otimização de atlases e pré-carregamento/cache
- [ ] Estados de animação completos integrados às projeções do gameplay
- [ ] QA visual e acessibilidade automatizados no Chromium

## Critérios de não regressão

Nunca incluir regras de gameplay, fontes inventadas, contadores fictícios, paths imaginários, ou ações admin sem autenticação. A API do protótipo continua restrita a loopback. Não alterar `packages/renderer/src/scene.js` ou a câmera simplesmente para substituir iconografia da HUD. As abas continuam verticais, e os botões não devem ser destruídos e recriados a cada tick sem motivo.
