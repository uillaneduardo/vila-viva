# Sobrevivência, ferimentos, equipamentos, descanso e demolição — Oturo vNext

## Situação
Primeira implementação incremental de sobrevivência acima das prioridades produtivas do NPC. Reutiliza o motor de ticks, efeitos condicionais, atributos, construções e pathfinding existentes. Sem IA generativa.

## Necessidades e decisão
- Saciedade inicial **100**; perde **2 a cada 8 ticks**. Ao cair para 45 ou menos, alimentar-se prevalece sobre construção e coleta para estoque.
- NPC consome **1 maçã física** do inventário para recuperar **35** pontos de saciedade. Se não carregar, busca maçãs primeiro em depósito concluído, depois em macieira com frutos, usando caminho e colisões normais. Não nasce alimento artificial.
- Efeitos condicionais: `well_fed` quando satiedade >=75 (humor +5, produtividade ×1.10); `hungry` entre 11 e 35 (produtividade ×0.8, velocidade ×0.9); `starving` de 0 a 10 (produtividade ×0.5, velocidade ×0.7). Resolver universal, fontes e expiração sem alterar atributos base.
- Saciedade 0 causa -2 de saúde a cada 8 ticks. Saúde 0 impede trabalho, movimento e decisões. Personagem jogador desabilitado nesta fase não recebe planejamento autônomo nem perde saciedade até o jogo habilitar suas próprias ações.
- Sem comida acessível o NPC registra o motivo; não teleporta nem produz maçã.

## Energia, camas e Casa Comunitária
- Descanso passa a ser planejado quando energia <=20 ou saúde <=35. O descanso tenta continuar até energia >=80 e recuperação de saúde adequada.
- Casa Comunitária funcional oferece **6 camas reserváveis**, descanso +14 energia por ciclo de decisão (mais parcela por resistência). No chão o ganho é **3** (mais parcela por resistência). São ciclos de IA a cada 3 ticks, não por segundo.
- A reserva precede o percurso, exige vaga e é renovada durante viagem. Apenas 1 reserva por NPC e 6 reservas por casa. Expira depois de 180 ticks sem renovação ou libera na alta/óbito/inacessibilidade/destruição/remoção.
- NPC precisa estar adjacente à Casa Comunitária que reservou para dormir (interior ainda não existe no grid). Só nessa condição aplica `well_sheltered` (humor +10). Efeito removido ao sair do repouso, perder a reserva ou perder a casa. Construção não fornece buffs globalmente apenas por existir.
- Descansar bem alimentado pode recuperar saúde gradualmente; sem comida não cura automaticamente fome.
- O inspetor da casa mostra total, reservadas e nomes das pessoas que reservaram cama.

## Ferimentos e ferramentas
- Ações físicas de trabalho, extração de madeira/pedra e colheita fazem um teste de risco **após sucesso do comando**, com resultado determinístico a partir do tick, id, ação e commandId.
- Chances base por ação: madeira 7,5%, pedra 12%, obra 6,5%, colheita 2%; agility/endurance efetivos reduzem riscos. Ferramenta correta reduz risco da ação a 18% do original.
- Ferramentas de homologação: `axe` para madeira, `pickaxe` para pedra e `hammer` para construção. `npc.admin_equip` é intervenção de Modo Deus, não fabrica/comercializa equipamento. Sistema de fabricação/posse será etapa posterior.
- Ferimento causa dano entre 6 e 16 e aplica `injured` por 30 ticks (velocidade ×0.65, trabalho ×0.7). Históricos podem mostrar bloqueios por atributo; debuffs afetam ciclos produtivos/velocidade.
- Não existe acidente instantâneo por caminhar, proteção de equipamentos nem tipos de lesão graduados nesta versão.

## Destruir e remover construção
- **Destruir** (`construction.destroy`) marca `status=destroyed`, `availability=unavailable`, deixa um obstáculo sólido representado por ruínas, desliga serviços, camas e capacidade de armazenamento, cancela reservas e retira buffs condicionais.
- **Remover** (`construction.remove`) apaga a entidade e libera todo seu footprint. Materiais, estoque, recursos e reservas ligados à entidade são descartados **sem reembolso**. Confirmação de ação destrutiva na UI do Modo Deus.
- Ambos os comandos são admin-only, idempotência por commandId, testados no motor e disponíveis no inspetor em projetos, edifícios funcionais e ruínas (ruínas só permitem remover).
- Ruínas mantêm material armazenado inacessível até remoção, mas nenhum NPC pode utilizar o edifício. Recuperação de salvados e reconstrução futura em outro fluxo.

## Responsabilidades
- `systems/needs`: só saciedade, alimentação e sincronização dos buffs/debuffs de fome.
- `systems/risk`: tabela de atividades perigosas, aptidão, ferramenta e rolagem determinística.
- `systems/housing`: vagas, reservas, validade e vinculação de `well_sheltered` somente durante descanso em casa funcional.
- `systems/ai`: sobrevivência > descanso > logística > produção; explicações e rotas no histórico. Não aplica comandos de estoque diretamente.
- `engine`: valida riscos depois de ações físicas executadas, controla equipamento de teste e comandos de demolição; ações de NPC não aceleram ticks.
- `content`: parâmetros de balanceamento e definições de efeitos, cama e ferramentas; `renderer` mostra ruínas/estado, não determina disponibilidade.

## Limites e próximos passos
Sistema ainda em memória, sem persistência por reinicialização Docker; comportamento repetível no tick. Falta: equipamentos físicos e manufatura, propriedades de saúde detalhadas, doenças, interiores/camas desenhadas, água, nutrição alternativa, resgate de estoque em ruínas e monitoramento populacional. Checar balanceamento com cenários grandes e múltiplos NPCs.
