# Abundância procedural dos recursos iniciais (#116)

A mesma seed, dimensão e versão do gerador reproduzem o mesmo mundo. Seeds diferentes alteram posição, número de fontes e quantidade de cada fonte. O gerador é compartilhado pelo servidor e pela rota /browser.

| Fonte | Quantidade de fontes (24×16) | Quantidade inicial por fonte |
|---|---:|---:|
| Madeira | 1–5 | 80–240 |
| Pedra | 1–4 | 80–240 |
| Ferro | 1–3 | 60–220 |
| Cobre | 1–3 | 60–220 |
| Macieira madura | 1–7 | 8–30 frutos |

Em mapas maiores, o limite superior de cada categoria recebe bônus de 0 a 3 pela dimensão (log2 da área em relação a 24×16). O mínimo é sempre uma fonte por categoria. A primeira madeira, pedra e macieira são posicionadas a no máximo oito células Manhattan da âncora comunitária. Isso reduz distâncias iniciais, mas não garante caminho livre nem sobrevivência em todos os mundos. Recursos adicionais usam o mapa inteiro. O pomar inicial continua livre, quatro habitantes (um líder) são preservados e não há sobreposição. Não há recursos novos fora do catálogo atual.

Mundos salvos não são modificados. Regenerar uma seed de versão anterior produz um mundo diferente porque o algoritmo de geração mudou. A abundância não é ajustada posteriormente pela IA e não representa garantia de equilíbrio alimentar.

Validação: testes de repetibilidade, variação de contagem/quantidade por categoria, quatro tamanhos, limites, posicionamento, integração real e runtime /browser. Antes do merge verificar CI e compatibilidade com PR #115.
