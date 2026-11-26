# Solo e fertilidade (#118)
Camada imutável por célula, separada de entidades, zonas de plantio, colisão e pack gráfico. Novas seeds usam soilVersion 1, manchas interpoladas deterministicamente pela seed, com cache limitado. Saves antigos sem versão permanecem 100% férteis (normal); não há migração automática. O stream carrega somente seed e versão; não envia uma matriz por tick.

| Solo | Velocidade |
|---|---:|
| Arenoso | 50% |
| Pobre | 75% |
| Comum | 100% |
| Fértil | 125% |
| Muito fértil | 150% |

Fertilidade altera tempo até maturação e regeneração de frutos, inclusive plantas naturais. Não altera quantidade da colheita, envelhecimento após maturidade, consumo de sementes, trabalho dos NPCs, colisão ou durabilidade. Acumuladores inteiros opcionais preservam frações e snapshots. O líder pondera fertilidade média da área com distância; NPCs ponderam fertilidade de lote com percurso. Não garante que o melhor solo esteja sempre disponível.

No menu Mundo, botão Fertilidade alterna a camada de visualização com legenda e leitura ao mover o cursor; paleta de base também varia em novos mundos. Cache do renderer distingue seed, dimensão, versão e modo de visualização. Mesma lógica de servidor e /browser.

Valores e cores são iniciais para balanceamento. Sem edição de terreno, irrigação, erosão, nutrientes ou fertilizantes neste incremento. CI, validação visual, desempenho em 64×48, revisão de conflitos e deploy obrigatórios.
