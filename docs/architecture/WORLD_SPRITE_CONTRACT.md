# Contrato visual de mundo — revisão 1

O motor de simulação é autoritativo. O renderer Canvas 2D apenas projeta dados e posições interpoladas; não escolhe profissões, tarefas, colisões ou inventários.

## NPCs
- Identidade visual estável por NPC; profissão persistente distinta de traços, papel comunitário e tarefa.
- Direções N/S/L/O no espaço do mapa, a partir da trajetória visual; conservar última direção no repouso.
- Atlas atual: células 96×96, pivô (48,66), transparência, sem suavização. Estados existentes: idle, moving, working, resting. Não substituir a identidade entre estados.
- Próxima revisão: camadas de corpo, vestimenta por profissão, ferramentas e objetos; mesmo pivô em todos os frames; sequências por ação e direção com duração explícita, pausa congelando fase; fallback na mesma identidade. IDs de ação estáveis, sem depender de tradução.
- Profissões a implementar pela liderança: agricultor, coletor, lenhador, minerador, construtor, artesão, cozinheiro, transportador, coveiro; líder e generalista. Emergências de sobrevivência têm precedência e não trocam a profissão.
- Animações previstas: caminhada, repouso, sono, morte, comer, transportar, plantar, colher, cortar, minerar, construir, desmontar, fabricar, cozinhar, sepultar; uma sequência por ação e direção, componível com cada profissão.

## Construções
- Footprint vem do blueprint/entidade; seleção e canteiro usam exatamente a área lógica. Enquanto os atlases legados forem quadrados, ajustar proporcionalmente dentro do footprint sem deformar.
- Novo atlas artístico deve declarar dimensões e pivô próprios para o footprint real, em unidades de tile (96 px/tile no padrão fonte); estágios stage:0, stage:1 etc seguem o número e a ordem do blueprint, completed e destroyed são obrigatórios. Níveis usam variantes de mesmo footprint, sem alterar colisões.
- Cemitério: área 3×3; lápides são derivadas dos registros de sepultamento, não de sprites de minério. Capacidade por nível 12/24/48.
- Não gerar recursos, edifícios ou NPCs fictícios no renderer.
- Esta revisão corrige o legado; novos atlases com ciclos completos e atribuição persistente de profissão são entregas distintas.
