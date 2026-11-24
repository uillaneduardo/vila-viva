# Oturo — Submenus em blocos quadrados (Modo Deus)

## Decisão de interface
- Manter **a barra principal de ferramentas** e sua identidade visual compacta.
- Ao selecionar uma ferramenta com variantes, abrir acima da barra uma **segunda faixa de botões quadrados** com ícones e nomes, seguindo o mesmo componente visual e indicadores de seleção (`active`, `aria-pressed`).
- Usar **tipos de NPC** (Habitante/Líder), **minerais** (Pedra/Ferro/Cobre), **Macieira** (Adulta/Muda), **Cultivo** (catálogo das espécies), **Cenário** (Rocha/Muro/Estátua) e **Construção** (todos os blueprints disponíveis).
- Construções exibem uma segunda linha de blocos para o **estado inicial**: `Projeto · Fase 1` ou `Concluída · Pronta`. Pincel de tamanho permanece como controle separado e informa `blueprint.footprint` durante Construir.
- Ao trocar de ferramenta, preservar a opção previamente escolhida por ferramenta e a fase de construção. Inspecionar fecha o submenu. Floresta não precisa de submenu por possuir apenas uma opção atualmente.
- Os botões são semânticos e utilizáveis com teclado; horizontalmente roláveis em dispositivos estreitos, sem impor uma janela gigante ao mapa.
- O **jogador** não recebe ações de Deus habilitadas. Mantemos o shell compartilhado e a regra de papéis existente.

## Arquitetura
- `packages/ui/src/god-menu-definitions.js` é a fonte de opções de apresentação e IDs do domínio. Edifícios e espécies vêm de `/api/catalog`. Tipos futuros não exigem alteração do motor nem da barra.
- `packages/ui/assets/manifest.js` declara ícones semânticos; `assets/icons/definitions.js` contém apenas os desenhos SVG de fallback. Sprites de submenu poderão ser trocados via registro de ativos existente.
- `packages/ui/src/hud.js` controla seleção, estado e interação da navegação; chama os mesmos contratos `onTool/onPreset/onBuildMode/onSize` usados antes. **Não** envia comandos nem altera o mundo.
- `apps/shared-ui/app.js` conserva a prévia do pincel, cálculo de dimensões e comandos de colocação existentes. Todos os requisitos, áreas ocupadas e validações seguem no motor.
- `apps/shared-ui/style.css` limita largura, rolagem horizontal e o empilhamento acima do dock para desktop e mobile. Sem nova janela flutuante em cima do inspetor.

## Homologação
1. Em `/admin`, selecionar Habitante, Pedreira, Macieira, Plantio e Cenário; selecionar cada quadrado e pintar no mapa.
2. Selecionar Construir: testar Depósito 2×2, Oficina 3×2 e Cemitério 3×3, alternando Projeto e Concluída; verificar que o motor respeita recursos, dimensões e colisão.
3. Trocar de ferramenta e retornar: última opção e fase devem permanecer selecionadas.
4. Inspecionar fecha os submenus, sem alterar o NPC monitor, inspetor ou diário de atividades.
5. Em mobile: a faixa deve permitir rolagem horizontal e continuar independente do dock principal.
