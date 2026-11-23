# Oturo — sprites do mundo (árvore frutífera v1)
- Atlas real: `public/assets/world/vegetation/apple_tree_atlas_96.png` (384×96 px, 4 quadros em 96px com transparência), gerado a partir das artes aprovadas nesta conversa. Versão otimizada para preview.
- Manifesto: `public/assets/world/vegetation/apple_tree.json`; pivô (48,88), atlas `leafless / foliage / fruit_sparse / fruit_ripe`.
- Registro/render: `packages/renderer/src/sprites.js`; seleção de estado via `resolveWorldSprite(entity)` e `SpriteLibrary.preload/draw`.
- Integração: `packages/renderer/src/scene.js` mantém fallback geométrico e usa a localização da entidade para posicionamento, zoom, pan, seleção e ordenação por eixo Y.
- Protótipo atual: fontes do tipo `food` são exibidas como macieiras **provisoriamente**; espécie futura será definida por dados de conteúdo. Quantidades reais: zero = foliage, positivas até 40% do máximo = fruit_sparse, acima disso = fruit_ripe. `leafless` fica reservado a estado visual explícito autorizado pelo servidor.
- Atenção: isso **não** implementa frutificação, colheita, crescimento, saúde ou regeneração. Tais comportamentos pertencem ao motor/sistemas.
- Servidor estático restringe PNG/JSON a namespaces permitidos; API de desenvolvimento continua **localhost-only** por ausência de autenticação.
- Galeria local de inspeção: `npm run dev` → `http://127.0.0.1:8086/apps/player-web/assets-preview.html`; visão de simulação: `http://127.0.0.1:8086/admin`.
- Esta integração não altera os assets de UI `packages/ui/assets`; os dois domínios são independentes.
- Validação: `npm test`; conferir visualmente no navegador zoom, pivô e sobreposição. Aprovação visual final de `leafless` e equivalência de copa segue pendente.
- Entrega/infraestrutura: somente código e assets para a vNext. **Nenhum deploy público**: a raiz vNext deliberadamente não publica no homelab2. Não ativar proxy/tunnel para o backend sem autenticação, isolamento e persistência.


## Atualização — espécie de macieira e ciclo de vida
A fonte `resource.food` **não é mais um tipo visual genérico**: instâncias com `sourceId=apple_tree` são macieiras; a quantidade deriva de produção por tick em `packages/systems/nature`. Estados `leafless / foliage / fruit_sparse / fruit_ripe` são projeções do ciclo de vida e do recurso disponível. Mudas/jovens usam escala menor do mesmo atlas; envelhecidas e mortas podem usar `leafless` sem adicionar novo sprite. Os obstáculos `boulder / wall / statue` usam fallback geométrico e colisão no motor. Veja `docs/gameplay/NATURAL_SOURCES_AND_COLLISION.md`.
