# Rustic Graphics Pack v1 (incremento inicial)
Issue #112. Pack opcional `rustic`, selecionável em Mundo (Modo Deus/browser) ou na barra superior do jogador; também `?visualPack=rustic`. Preferência local, troca em execução sem reiniciar a simulação. Default anterior preservado.
 
## Contrato e autoria
Artes originais geradas para Oturo por ChatGPT/ImageGen, 26/11/2026; recortes com alfa binário, paleta reduzida a 20 cores e até 32 px de lado, incorporados em SVGs locais autocontidos. Não são assets de terceiros. Atlas horizontal 96×96 por estado, pivôs e ordem herdados do pack simple. UI semântica via registry e tema rustic-dark; SVG fallback para IDs não cobertos.
 
## Cobertura
- Casas comunitária/familiar, depósito e oficina: arte concluída; canteiros e ruínas preservados.
- Personagem: estado idle; moving/working/resting mantêm desenho anterior. Não há ciclo direcional novo.
- UI: 7 artes (casa, depósito, oficina, NPC, madeira, maçã, pedra) reutilizadas em IDs semânticos.
- Árvores, terrenos, profissões completas, níveis avançados, painéis decorativos e demais imagens: fallback simple; pendentes de recorte/validação e PR posterior.
 
## Gate
CI, revisão de conflitos com PRs concorrentes, QA visual /browser e /admin, benchmark em mapa 64×48, deploy e rollback conforme infraestrutura. Não alterar gameplay, persistência do mundo ou colisões. Não considerar este incremento um pack completo.

## Segundo incremento
Ver [expansão do pack](RUSTIC_GRAPHICS_EXPANSION.md) (#120) para a cobertura posterior. A lista acima registra o incremento inicial.
