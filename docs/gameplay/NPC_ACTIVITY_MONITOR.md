# Oturo — Monitor lateral de atividades dos habitantes

## Objetivo
Monitor de observação para o Modo Deus: coluna pequena à esquerda, independente do inspetor contextual à direita e das ferramentas do mapa.

## Comportamento
- `packages/ui/src/npc-activity-monitor.js` consome somente a projeção já retornada por `GET /api/world`. Não cria tarefas nem novos timers de rede.
- Exibe todos os NPCs não controlados pelo jogador, ordenados por nome, com **nome e atividade atual/mais recente**. Habitantes falecidos aparecem até serem removidos do mundo, sem confundir com atividades em execução.
- Ao clicar na linha, o elemento semântico HTML `details/summary` expande **abaixo daquele NPC** a relação dos últimos 8 registros de decisão da IA, em ordem de tick decrescente: tick, atividade e motivo.
- Histórico individual tem limite de altura e `overflow-y:auto`; lista geral também tem rolagem independente. O cabeçalho oferece recolher/expandir o monitor inteiro.
- Cada atualização reaproveita os nós do DOM por ID, atualiza somente o texto alterado e o histórico quando necessário. Preserva expansão e posições das barras de rolagem entre os polls de 650ms usados na UI principal. Carregar outro snapshot/linha do tempo limpa entradas anteriores.
- Visual respeita tokens/vidro do workspace atual; não substitui o inspetor contextual. Em telas menores permanece compacta e recolhível.
- Sem estado mutável no domínio para controlar UI e sem duplicar cálculo das decisões no frontend. O catálogo de IA permanece no motor.
- Testes de projeção, ordenação, mortes, exclusão de jogador, atualização estável de DOM, expansão, rolagem, reset de timeline, compatibilidade da interface e integração com decisões reais.

## Escopo deliberado
O resumo e a expansão referem-se ao **histórico de decisões mantido pela IA do NPC** (atualmente limitado a 8 transições), não ao journal completo de comandos aceitos. Para auditoria exaustiva de ações/ticks, permanece a exportação JSONL em Mundo. Não são adicionados eventos artificiais a cada deslocamento só para a UI.
