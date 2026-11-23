# Catálogo de ações — Vila Viva (proposta G0)

## Papéis
- **Jogador**: possui avatar físico, inventário, saúde/necessidades, posição, alcance, ferramentas e ações sujeitas ao mundo. Não pode criar recursos, entidades ou modificar regras.
- **NPC**: possui as mesmas capacidades físicas fundamentais; ações escolhidas por IA e demandas do mundo, não por comandos de jogador (salvo futuras mecânicas de cooperação).
- **Administrador**: opera externamente à física, como Modo Deus; ações podem alterar simulação, precisam ser validadas, registradas e autorizadas no backend.

## Contrato obrigatório de qualquer ação
`id`, `actorRole`, `actorId`, `targetType`, `targetId|position`, `parameters`, `preconditions`, `cost`, `duration`, `interruptPolicy`, `effects`, `failureCodes`, `events`, `presentation`.
O estado transita: `available → requested → accepted → running → completed`; alternativas: `blocked(reason)`, `failed(reason)`, `cancelled(reason)`.
As pré-condições devem ser revalidadas no início da execução e sempre que o mundo mudar.

## Ações físicas (jogador e NPC)
| ID | Alvo | Condições / custo | Efeito e comportamento | Falhas / interrupção |
|---|---|---|---|---|
| `entity.inspect` | entidade visível | estar visível/descoberta; nenhuma stamina | mostra informações autorizadas; sem alterar mundo | entidade ausente ou fora de visão |
| `movement.move` | célula | terreno navegável, energia, rota | altera posição ao longo do tempo; energia gasta por distância/carga | bloqueio, energia insuficiente, rota impossível; cancelável |
| `resource.harvest` | fonte | descoberta, alcance, vaga, ferramenta, capacidade, energia, quantidade | coleta unidades físicas ao inventário, nunca diretamente ao depósito | exaurida, vaga cheia, ferramenta ausente, interrupção; progresso não concluído é perdido |
| `item.pickup` | item/pilha | proximidade, peso/capacidade, propriedade | move item do chão para inventário | inexistente, sem capacidade; atômica |
| `item.drop` | item no inventário | quantidade disponível, posição válida | cria pilha persistente no chão | reserva/quantidade inválida; atômica |
| `storage.deposit` | depósito | proximidade, possuir item, capacidade/política do depósito | transfere item fisicamente, só então credita ao estoque | cheio, sem item; atômica |
| `storage.withdraw` | depósito | proximidade, autorização, estoque e capacidade | transfere ao inventário do ator | falta de estoque, excesso de peso; atômica |
| `needs.eat` | alimento | possuir ou acessar alimento, tempo de uso | reduz item físico e aumenta saciedade | alimento ausente/indisponível, interrupção |
| `needs.rest` | abrigo/cama ou chão | local adequado, reservas se aplicável | recupera energia/sono durante duração | local ocupado/inseguro; cancelável |
| `construction.deliver` | canteiro | material requerido, proximidade, item disponível | contabiliza material entregue à etapa | etapa indisponível, item errado; atômica |
| `construction.work` | canteiro | etapa ativa, materiais entregues, ferramenta/energia/vaga | executa unidades de trabalho; etapas completas persistem | sem material, exaustão, reserva perdida; parcial não concluída se perde |
| `social.interact` | personagem | proximidade, disponibilidade, consentimento/regras | diálogo/interação breve e estado social | alvo ocupado/ausente |
| `community.read` | quadro | presença física, acesso | consulta demandas/conhecimento local | fora de alcance/indisponível |

**Não assumir todas implementadas no MVP:** cada uma deve possuir teste de contrato antes de ser habilitada.

## Intervenções do administrador
| ID | Alvo | Parâmetros | Confirmação / validações |
|---|---|---|---|
| `world.create` | catálogo | nome, seed, preset, versões de regras | evitar duplicata, quotas |
| `world.pause`, `world.resume` | mundo | nenhuma | registra autor; não altera mundos vizinhos |
| `world.speed.set` | mundo | escala 0/1/2/5/20... | limites e orçamento de CPU |
| `world.clone` | mundo | novo nome, ponto de snapshot | snapshot consistente |
| `world.rules.update` | mundo | diff de parâmetros e versão | compatibilidade de versão, auditoria e confirmação |
| `npc.spawn` | posição | preset, nome/atributos opcionais | terreno válido, limites populacionais |
| `npc.attributes.update` | NPC | campos permitidos e valores | limites, consequências explícitas, auditoria |
| `resource.spawn` | posição | tipo, quantidade, máximo, taxa de regeneração, vagas | terreno válido, schema do preset |
| `resource.adjust` | fonte | quantidade/delta | min 0 / max, auditoria |
| `item.spawn` | posição | tipo, quantidade/peso | limites e conservação explicada como intervenção |
| `building.place` | posição | projeto/blueprint | colisão, pré-requisitos, terreno |
| `building.modify` | estrutura/canteiro | etapa, progresso ou dano | integridade, confirmação |
| `world.event.trigger` | mundo/região | tipo, intensidade, duração, área | schema e confirmação |
| `world.entity.remove` | entidade | id, motivo | confirmação destrutiva, efeitos em inventário/reservas |
| `world.inspect`, `world.metrics`, `world.audit` | mundo/entidade | filtros | acesso somente leitura conforme papel |

## Disponibilidade e feedback
- Menus apresentam ações aplicáveis ao **tipo de seleção**, com estado e motivo de bloqueio. Não mostrar ao jogador ações administrativas.
- Jogador vê progresso, percurso, recursos transportados, custo e falhas.
- Admin vê prévia de alcance/posição, parâmetros, confirmação, resultado, tick aplicado e autoria.
- Ações de sobrevivência podem preemptar trabalhos, mas precisam liberar reservas e preservar itens completos.
- UI jamais atribui êxito antes de receber resultado confirmado do motor.

## Primeira fatia vertical aprovada para construir como experimento técnico
`world.create` interno + `npc.spawn` + `movement.move` + `resource.spawn` + `entity.inspect`, com testes headless, sem banco. Gameplay completo permanece pendente de validação deste documento.
