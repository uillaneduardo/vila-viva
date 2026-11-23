# Oturo — Fonte natural viva e colisão de cenário (v1)

Status: **implementado no motor/headless e prévia vNext**. Este contrato é extensível sem copiar mecânicas para cada espécie.

## Fronteiras
- `packages/domain/src/contracts.ts`: representação persistível de entidades, estado vital, inventário e comandos. Não importa engine/renderer/content.
- `packages/content/src/natural-sources.ts`: **catálogo de espécies**, inicialmente somente `apple_tree`. Cada definição fornece `resourceType`, `productId`, etapas por idade, vida máxima, taxa/capacidade de produção, limite de coleta e flag de colisão.
- `packages/systems/nature/src/index.ts`: funções puras por mundo para inicializar e avançar fontes por tick. Não depende da UI nem chama API.
- `packages/systems/collision/src/index.ts`: ocupação autoritativa única. Impede atravessar obstáculos e entidades sólidas e impede novos objetos sobre células ocupadas.
- `packages/content/src/scenery.ts`: catálogo `boulder / wall / statue`, cenografia não minerável. `obstacle.spawn` coloca itens sólidos, distintos de `resource.stone`.
- `packages/engine/src/engine.ts`: valida comandos `resource.spawn`, `resource.harvest`, `obstacle.spawn` e movimento; aplica efeitos físicos e dispara eventos.
- `packages/renderer/src/sprites.js` e `scene.js`: projeção visual sem determinar colisão ou quantidade de recursos.
- `packages/ui/src/inspector.js`: consulta de idade, saúde, produção, capacidade, colisão e inventário real.

## Macieira (única espécie de fonte natural viva neste marco)
A entidade `kind:resource`, `resourceType:food`, `sourceId:apple_tree` tem `productId:apple`, `life:{ageTicks,stage,health,productionProgress}`, `quantity` e `maximum`.
Muda antes de 40 ticks, jovem até 119, adulta de 120 a 1799, velha 1800–2999 e morta a partir de 3000. Na fase adulta/velha produz até 30 maçãs, a cada 40 ticks (3 por ciclo adulta; 1 por ciclo velha). A morte encerra produção, zera frutos e conserva o tronco, que ainda bloqueia passagem.
A árvore **não desaparece na colheita**, não é automaticamente retirada do mundo e **não credita estoque do depósito**. `resource.harvest` exige personagem NPC ou jogador fisicamente adjacente, energia, fonte produtiva e capacidade de transporte (12 unidades totais). Coleta até 3 maçãs por comando, reduz o recurso, aumenta `actor.inventory.apple` e consome energia.
O sistema não realiza IA automática de NPC, transporte ou depósito nesta etapa; coleta manual pelo inspetor exige NPC vizinho no Modo Deus. Modo jogador também pode coletar se estiver adjacente. Portanto, a coleta já é física e autoritativa, mas a logística posterior é outra etapa.

## Colisão de cenário
`obstacle.spawn` exige preset válido `boulder`, `wall` ou `statue`. A instância `kind:obstacle` armazena `obstacleType`, `position`, `blocksMovement` e não tem `quantity` nem `resourceType`. Presets atuais não são coletáveis, mineráveis nem destrutíveis.
O sistema único de bloqueio impede movimentação e posicionamento em células com qualquer entidade física. Isso já protege o movimento manual de NPC/jogador; o futuro pathfinder deverá consultar `canEnter` na expansão de vizinhos e revalidar no comando final.
Os sprites de cenário são formas geométricas de fallback até se criar um pack artístico próprio. Para o usuário God Mode há pincel **Cenário** e seletor entre os três obstáculos; para **Macieira**, seletor de muda/adulta.

## Contrato para adicionar arbustos no futuro
1. Cadastrar somente uma nova definição em `NATURAL_SOURCES`: `berry_bush` com `resourceType:'food'` e `productId:'berry'`, etapas, capacidade, intervalo de produção e colheita.
2. Cadastrar sprite, ID de atlas e escala no renderer; não editar regras de produção/colheita do motor. Vincular no pincel quando houver sprite validado.
3. Testar transições, envelhecimento, inventário, colisão, exaustão, regeneração, limites, extrapolação do tick e proteção contra duplicação.
4. No futuro a separação entre `sourceId` e `resourceType` permitirá macieira e arbusto produzirem itens de `food` sem fingir que ambos têm o mesmo visual.

## Limites conhecidos
O protótipo vNext ainda não tem persistência, IA ou pathfinder de produção e opera em memória. Reinício do container recomeça o mundo. O comando legado ainda incrementa o contador de tick imediatamente; fontes vivas avançam *somente* no `advanceTick` independente de comandos. Testes não autorizam fingir depósito ou colheita automática concluída.
Modo Deus sem autenticação é uma exceção de homologação e não deve ser entendido como seguro só por possuir URL pouco divulgada.
