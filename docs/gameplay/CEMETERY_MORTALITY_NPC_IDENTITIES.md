# Oturo — Cemitério, corpo não bloqueante e identidade de NPCs

## Contratos e arquitetura
- **Blueprint versionado** `building.cemetery` é um terreno demarcado de 3×3 com 12 vagas. Pode ser criado pronto em Construir (Modo Deus) ou demarcado via um canteiro de uma etapa (3 pedras, 6 de trabalho); utiliza o registro padrão de construções. O cemitério concluído é atravessável, mas não pode receber outra construção sobre sua área.
- **Mortalidade** `packages/systems/mortality`: aplica `deathTick` e `causeOfDeath` uma única vez, libera cama, administra cadáveres visíveis, corpo carregado por outro NPC, espaço de sepultura, e efeito ambiental condicional. Sem mudanças de gameplay no renderizador.
- **Corpo** continua sendo um personagem com `health=0`, nome e identificador preservados até o sepultamento. Não possui colisão. O mapa o representa por símbolo temporário `☠`; durante transporte físico desaparece do chão e acompanha o carregador na simulação.
- **Mal-estar**: qualquer personagem vivo a distância Manhattan <=4 de um cadáver no chão ganha `corpse_exposure`, efeito condicional `mood -15`, `workRate ×0.85`, `socialWillingness ×0.8`. Não empilha por número de cadáveres; termina ao sair do raio, recolher o corpo ou concluir o enterro.
- **Ações**: `burial.pickup` exige proximidade física, energia e nenhum outro corpo em transporte; `burial.inter` exige cemitério pronto acessível com vaga e grava `{npcId,name,deathTick,burialTick,cause}`; só então remove o falecido do mundo. `burial.drop` recoloca o corpo no chão se faltar destino. Todas compartilham o motor de validações e não avançam ticks artificiais para NPCs.
- **IA**: depois de fome/descanso urgente, trabalho funerário tem preferência sobre plantio, construção e abastecimento. Busca corpos e cemitérios acessíveis por BFS; o primeiro NPC que recolhe um corpo impede disputas posteriores. Falta de cemitério mantém corpo e debuff no mundo; cemitério cheio não aceita enterrados adicionais. Transportador morto solta o corpo.
- **Memorial**: o inspetor do cemitério mostra vagas totais, disponíveis e nomes sepultados. Após a remoção da própria construção, os registros em memória dela também são descartados. Persistência histórica independente é melhoria futura.
- **NPCs gerados**: `packages/content/src/characters.ts` concentra primeiro/sobrenome, traços e ajustes de atributos primários. Semente de geração reproduzível `worldId|commandId|tick` fornece nome por padrão, 2 traços distintos e valores iniciais de força, resistência, agilidade e sociabilidade (restritos a 4–20). Nome explícito da API permanece permitido para testes e personagens pré-nomeados. Traços modificam atributos na criação; futuras árvores de personalidade podem reutilizar esses IDs sem alterar o motor.
- **UI**: Modo Deus usa o catálogo para listar o cemitério com outras construções; renderização do terreno e túmulos é geométrica temporária. Caveira indica morte; inspetor mostra causa e tick de morte, traços e painel memorial. Contador mostra vivos e falecidos.

## Cenário de homologação
1. Criar um cemitério **Concluída**, confirmar 12 vagas, área sem colisão e zero nomes.
2. Gerar vários NPCs pelo pincel **Habitante** e inspecionar seus nomes, traços e atributos gerados.
3. Deixar um NPC morrer por fome ou acidente (com o tempo). Antes de haver cemitério, o corpo ☠ fica no mapa, pode ser atravessado e reduz o humor/produtividade dos habitantes próximos.
4. Criar o cemitério e observar os trabalhadores recolherem e transportarem o falecido até uma célula adjacente. Após sepultamento o corpo desaparece e o memorial registra o nome.
5. Com o cemitério cheio, cadáveres continuam visíveis; debuff deixa de existir quando não há mais corpos no chão.

## Limites
- A área não simula sepulturas físicas internas, deslocamento de restos, cerimônias, parentesco, luto prolongado, religiões, custos funerários nem diferencia mortes por causas clínicas detalhadas. O primeiro ciclo mede efeito ambiental e logística funerária.
- Não há persistência permanente do memorial; a vNext continua em memória e reinicia em deploy/container. Uma futura tabela de eventos históricos deve registrar sepultamentos independentemente de edifícios.
- O Modo Deus ainda está exposto sem autenticação por decisão de homologação.  
