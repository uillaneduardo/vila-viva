# MVP — Casa Comunitária e ciclo familiar (issue #19)

Status: **requisitos de produto registrados e especificação proposta, não implementação**. Valores numéricos apresentados são propostas de balanceamento ajustáveis por regras versionadas.

## 1. Objetivo jogável
Uma casa completa oferece abrigo, descanso, humor, encontro social e capacidade de família, e faz diferença material na sobrevivência e no crescimento populacional. A casa **não** contém lógica de reprodução: ela fornece capacidades consultáveis por sistemas independentes.

## 2. Casa Comunitária: blueprint de conteúdo
- ID: `building.community_house`, versão 1.
- Etapas: fundação → estrutura → telhado → acabamento.
- Proposta inicial de materiais/unidades de trabalho: ver `packages/content/src/buildings/community-house.ts`.
- A conclusão habilita 6 vagas adultas, até 2 vagas adicionais de dependentes e capacidade de convivência; valores configuráveis e sujeitos a revisão.
- Moradores precisam de vínculo de residência/ocupação válido. Construção inacabada NÃO fornece abrigo, bônus de humor ou elegibilidade familiar.
- A conclusão não garante ocupação automática: sistema de habitação atribui/reserva vagas, verifica lotação e registra alterações.
- Casa pode ter durabilidade, manutenção, danos e perda temporária de funcionalidade em fase posterior. O contrato de disponibilidade já deve suportar `available | unavailable | destroyed`.

## 3. Relações sociais
- Relação dirigida A→B e B→A, armazenada independentemente: familiaridade, confiança, afinidade, interesse afetivo e último contato.
- Encontro exige proximidade, disponibilidade e necessidades básicas atendidas; pode incrementar familiaridade/afinidade de maneira limitada por intervalo. Humor e conforto modulam oportunidade/resultado, não forçam interesse.
- Relacionamento formado apenas quando **ambos** adultos vivos/aptos manifestam interesse recíproco suficiente, sem vínculo familiar próximo e respeitando limites de parceria.
- Ações sociais devem dar feedback de sucesso/indisponibilidade, sem expor valores íntimos no cliente de jogador indiscriminadamente. Admin tem visão de diagnóstico.
- Término ou perda de relacionamento não remove filho nem obrigações de cuidado.

## 4. Reprodução e ciclo de vida
- Condições mínimas verificadas pelo sistema: dois adultos elegíveis, parceria ativa e recíproca, capacidade gestacional explícita de um dos parceiros, nenhuma gestação ativa na pessoa gestante, parentesco impeditivo ausente, abrigo residencial válido, capacidade para dependente, limiar de segurança/saúde/alimento, intervalo entre nascimentos e limite populacional.
- Elegibilidade mútua autoriza apenas **decisão autônoma de planejamento familiar** do NPC, não nascimento instantâneo. Pode haver um intervalo/cooldown e avaliação de intenção individual.
- Gestação é estado temporal com `startedTick`, `expectedBirthTick`, `stage` e `pregnantCharacterId`. Duração em ticks do mundo definida por regras e não por FPS/renderização.
- Ao nascer, cria NPC dependente persistente com idade 0, `guardians[]` e `householdId`. Ocupa vaga infantil, requer alimento, segurança, cuidado e supervisão; não executa trabalho nem reprodução.
- Período pós-parto inicia após o nascimento, tem duração definida, exige cuidados e restringe atividades pesadas. Alterações temporárias cessam ao final. Responsáveis e outros moradores podem cuidar da criança.
- Infância e adolescência são estágios de ciclo de vida; mudança para adulto requer idade mínima do mundo, e não apenas passagem de tempo de UI.
- Ausência de moradia, alimento ou saúde suficiente bloqueia **novos** eventos de concepção, sem apagar gravidez ou crianças já existentes.

## 5. Debuffs e modificadores
Não mudar atributos-base da entidade. Cada efeito tem ID, origem, início/fim e modificadores aplicados pelos consumidores de capacidade.
- Gestação inicial: ajuste leve de stamina/descanso (configurável).
- Gestação intermediária: velocidade, ritmo de trabalho e carga reduzidos moderadamente.
- Gestação avançada: redução adicional de velocidade/carga, proibição temporária de atividades pesadas e prioridade de descanso/segurança.
- Pós-parto: redução de carga e trabalho intenso, prioridade de recuperação e cuidado, com validade temporal.
- Exemplo de perfil **proposto**: segunda fase move×0,90, work×0,85, carga×0,85; fase avançada move×0,75, work×0,65, carga×0,60; pós-parto move×0,90, work×0,70, carga×0,50. Nenhum desses números é regra consolidada.
- Bloqueios são por classe de atividade (`heavy_labor`, `hazardous`), não por nomes de tela. Atividade leve permanece disponível quando possível.
- O movimento usa velocidade efetiva; o inventário usa capacidade efetiva com política explícita para carga já transportada; o trabalho usa produtividade efetiva; o AI scheduler altera prioridades e descansa, sem nunca sobrescrever o status da gestação.

## 6. Integridade e casos-limite
- Verificar mortalidade, interrupções, separação, esgotamento, impossibilidade de acesso à casa, ausência de leito, lotação, expiração de reserva, nascimento com responsável ausente, e mundo pausado.
- O recém-nascido não pode herdar automaticamente tarefas dos adultos.
- Não apagar criança ao destruir casa: cria demanda de realocação emergencial.
- Regras determinísticas por seed e tick, eventos idempotentes, sem nascimento duplicado em reconexões/snapshots.
- O motor reconstrói estado e modificadores após carregamento; cargas e eventos não são aplicados duas vezes.
- Se ninguém atender a criança, há necessidade de socorro/cuidado e consequências graduais explicitadas, não travamento da IA.

## 7. Responsabilidade de cada subsistema
| Módulo | Possui o estado e aplica regras | Publica/consome |
|---|---|---|
| `systems/construction` | etapas, materiais entregues, trabalho, conclusão | `building.completed` |
| `systems/housing` | residentes, ocupação, vagas, conforto e abrigo | `housing.resident_assigned`, `housing.availability_changed` |
| `systems/social` | vínculos dirigidos, encontros, parceria recíproca | `social.interaction_completed`, `social.relationship_changed` |
| `systems/mood` | humor efetivo por conforto, necessidades e relações | `mood.updated` |
| `systems/reproduction` | intenção conjunta, elegibilidade, concepção e nascimentos | `reproduction.pregnancy_started`, `population.birth_requested` |
| `systems/lifecycle` | idade, fase gestacional/pós-parto, crescimento, cuidado | `lifecycle.stage_changed`, `lifecycle.recovery_finished` |
| `systems/modifiers` | composição de efeitos temporários e expiração | consultas de valores efetivos |
| `systems/needs` | necessidades vitais, descanso e cuidado infantil | `needs.critical`, `needs.satisfied` |
| `systems/population` | criação/idempotência de pessoas, parentesco e limites | `population.birth_completed` |
| `systems/ai` | escolha de atividade, planejamento e recuperação de bloqueios | solicita comandos físicos |
| `systems/movement` / `inventory` / `work` | execução física com capacidades efetivas | consomem modificadores |
| `content/buildings` | definições e balanceamento, sem efeitos colaterais | consultado por sistemas |

## 8. Eventos e transições fundamentais
`construction.completed → housing.available → residents.assigned → mood.comfort_applied → social.encounters → social.partnership_active → reproduction.eligible → pregnancy.started → lifecycle.gestation_progress → population.birth_completed → lifecycle.postpartum → lifecycle.recovered`.

São eventos separados. Cada etapa confere seu próprio contrato; eventos publicados **não obrigam** o próximo sistema a aceitar a transição.

## 9. MVP de observabilidade / interfaces
- **Admin:** Casa → etapas/materiais, ocupação adulta e infantil, conforto/humor, encontros e residentes; NPC → idade, fase de vida, relacionamentos, gestação/cuidado, modificadores vigentes, atividade e motivo de bloqueio; Estatísticas → famílias, nascimentos, capacidade de moradia, satisfação, mortalidade e recuperação.
- **Jogador:** Casa → capacidade/vagas acessíveis, conforto e interação contextual; Personagem → humor, necessidades e modificadores próprios; Relações → informações públicas e interações apropriadas; sem controles para impor gestação ou relacionamento a NPC.
- Ambos devem receber transições derivadas da simulação autoritativa, com animações visuais dissociadas dos ticks. Mostrar status `planejado` para ações ainda não implementadas.

## 10. Critérios de aceitação (testes)
1. Casa sem todos materiais/trabalho não libera moradia nem bônus.
2. Casa completa cria vagas e, quando ocupada, altera humor e encontros.
3. Afeto unilateral não forma parceria; relação mútua entre adultos elegíveis pode formar parceria.
4. Sem abrigo/vaga, sem concepção; casa concluída sem atribuição residencial também não autoriza.
5. Gestação aplica restrições temporárias por fase; sistemas diferentes leem os mesmos modificadores.
6. Terminado pós-parto, atributos efetivos retornam à base (respeitando outras condições ativas).
7. Nascimento cria exatamente um dependente por evento e reserva vaga, mesmo após replay.
8. Criança não trabalha nem pode iniciar parceria/reprodução.
9. Destruir/desabilitar casa cria demanda de reassentamento, não apaga familiares.
10. Casos de fome, morte e lotação geram ações/alertas explicáveis; NPCs não ficam em loops sem progresso.

## 11. Dependências e sequência
`domain/events → content/blueprint → inventory & movement → construction → housing → mood/social → lifecycle/reproduction → modifiers → AI/care → observability`. A infraestrutura necessária (worker, persistência, identidade e sincronização) acompanha a integração real; o primeiro protótipo de regra pode ser testado headless.

**Escopo explícito:** este documento e o blueprint são apenas especificação e conteúdo de referência; nenhum estado de gravidez, afeto, moradia ou parto está sendo executado pelo motor atual.

## Sistema Universal de Efeitos — decisão consolidada
A gestação e o resguardo serão instâncias de efeitos com duração, fonte, modificadores e evento de expiração. A expiração de `gestation` emite **intenção** `reproduction.birth_due`, a ser validada pelo sistema de reprodução/população; não cria bebê diretamente. O nascimento validado poderá aplicar `postpartum_recovery`. Os sistemas de movimento, trabalho, inventário e IA consomem atributos efetivos sem implementar casos exclusivos de gravidez. Tristeza limita o humor e propaga consequências a produtividade e socialização. A moradia funcional pode manter o efeito condicional `well_sheltered`. Contratos e comportamento inicial implementados em `packages/systems/effects/`. Veja [EFFECT_SYSTEM.md](../architecture/EFFECT_SYSTEM.md).
