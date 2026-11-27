# SimNext — Abstrações, agenda de design e homologação visual
Data: 26/11/2026. Consolida a discussão de abstrações; proposta para revisão, não autorização de implementação integral. Complementa [SIMNEXT.md](SIMNEXT.md), [SIMNEXT_SCENARIOS.md](SIMNEXT_SCENARIOS.md) e [SIMNEXT_REFERENCES.md](SIMNEXT_REFERENCES.md). A etapa S0 ainda não está concluída. Separar decisões acordadas (simplicidade, conhecimento progressivo, cenários, reutilização do motor/render) de hipóteses de representação e números abaixo.

## 1. Política de abstração
Uma variável só existe se possuir consumidor, consequência observável e teste. Preferir estados discretos, escala normalizada e quantidades inteiras/fixed-point; não simular processos biológicos, psicológicos ou físicos detalhados sem necessidade. Estado persistente (conhecimento, relações, recursos) é distinto de projeção (indicadores, sprites), atributos base são distintos de condições e efeitos derivados. Não duplicar conceitos; cada novo detalhe deve demonstrar que altera uma decisão, requisito, resultado ou observação relevante. A fidelidade é relativa ao experimento. Uma abstração não é afirmação científica sobre seres humanos.
| Fenômeno | Representar | Não simular inicialmente |
|---|---|---|
| Corpo | saúde, saciedade, energia; hidratação/temperatura quando houver recursos e ações | órgãos e biologia celular |
| Personalidade | tendências que modificam escolhas | cérebro, diagnóstico psicológico |
| Motivação | necessidade, interesse por domínio, valor e objetivo | raciocínio verbal completo |
| Pensamento | candidatos viáveis, pontuação, compromisso e motivo | LLM obrigatório |
| Aprendizado | progresso por técnica, pré-requisitos, fonte e tempo | pesquisa científica detalhada |
| Memória | fatos observados, localização, experiências com relevância | gravação integral de cada tick |
| Comunicação | transferência de informação ou proposta entre agentes | linguagem natural e cada frase |
| Emoções | efeitos situacionais com duração | estados psicológicos sem consumidor |
| Relações | afinidade, confiança, respeito dirigidos | grafo completo entre todos |
| Cultura | distribuição de valores, práticas e normas | consenso obrigatório, essência imutável |
| Governo | autoridade, propostas, regras, adesão | instituições completas desde o MVP |
| Economia | inventários, quantidades, produção, consumo, posse/uso | moeda e mercado antes de troca material |
| Ambiente | células, solo, obstáculos, água/calor em abstrações úteis | dinâmica de fluidos, geologia/molecular |
| Construção | footprint, insumos, etapas e trabalho | cálculo estrutural |
| Reprodução | ciclo de vida, compatibilidade, gestação, nascimento e cuidado quando aprovados | fisiologia detalhada |
| Conflito | intenções, ações, risco, consequências, mediação | guerra detalhada antes de interações básicas |
| Espaço | destinos, recursos, requisitos de projeto e marcos futuros | dinâmica orbital detalhada inicialmente |

## 2. Indivíduo — vocabulário e atributos candidatos
Atributo = capacidade; estado/necessidade = condição atual; traço = tendência de decisão; interesse = domínio atraente; valor = princípio considerado importante; objetivo = estado desejado; conhecimento = técnica adquirida; habilidade = eficiência prática; profissão = função, não identidade total. Escalas 0–100 propostas para novos dados, não migrar cegamente os atributos existentes (usar adaptador e normalização explícita).
| Atributo base candidato | Consumidor |
|---|---|
| Força | carga/esforço/extração |
| Agilidade | deslocamento e execução |
| Resistência | gasto energético e esforço prolongado |
| Constituição | saúde máxima/recuperação |
| Destreza | precisão/qualidade manual, se houver regra distinta de agilidade |
| Percepção | alcance de observação e alvos conhecidos |
| Inteligência/aprendizado | taxa de estudo, não valor humano |
| Memória | retenção de observações, não decay automático de técnicas |
| Concentração | eficiência de atividades prolongadas, se não duplicar compromisso |
| Comunicação | taxa/efetividade de ensino e interação |
MVP: reaproveitar strength, agility, endurance e atributos derivados existentes; adicionar uma capacidade de aprendizado e interesse/curiosidade com efeitos explícitos. Constituição, percepção, destreza, memória, concentração e comunicação são candidatos a aprovação, não obrigação de dez atributos novos. Saúde é estado, não capacidade; fome usa saciedade invertida; energia e descanso não são contados duas vezes. Hidratação, conforto e satisfação social são extensões somente com fontes, recuperação, limiares e consequências reais.
Traços candidatos: curiosidade, ambição, sociabilidade, prudência, agressividade, empatia, disciplina, adaptabilidade, generosidade, paciência; podem ser tags com modificadores limitados antes de vetores contínuos. Valores candidatos: autonomia, igualdade, ordem, tradição, progresso, segurança, prosperidade, preservação, compaixão, poder. Interesses por domínio (agricultura, materiais, construção, ciências, artes, política, comércio, medicina etc.) com intensidades. Evitar tripla contagem (curiosidade/ciência/progresso): curiosidade altera frequência de exploração, interesse escolhe domínio, valor pesa consequência. Traços não impõem conduta. Formação/alteração por seed e experiências será especificada; MVP mantém traços e interesses estáveis.
Memória operacional limitada: fonte/posição/tick/confiança/relevância para fatos; eventos relevantes para relações. Relações direcionais (afinidade, confiança, respeito) com baseline neutra e atualização por eventos reais, não julgamento moral global. Cultura é distribuição de valores/práticas; distinguir política do líder de crenças individuais. Sociedade tem membros, patrimônio, regras, autoridade, território de uso/posse quando implementado; não existe apenas por proximidade.

## 3. Conhecimento — conceito e contrato implementável
Catálogo DAG com KnowledgeDefinition {id,domain,cost,requires[], studyConditions?}. CharacterKnowledge {progressById, fractionalRemainder?}. Requisitos ficam declarados em ações/receitas/blueprints/reconhecimento; lista de desbloqueios é projeção reversa derivada, não segunda fonte de verdade. Estado adquirido se progresso >= custo e todos pré-requisitos adquiridos. Custos incrementais: A100, B exige A e +150, C exige B e +200; total de dependências únicas A+B+C=450. Validar ciclos, referências, custos, seeds e circularidade material (ex. oficina para aprender técnica que é necessária para construir a oficina). Progresso inteiro/fixed-point limitado, independente por técnica, não moeda gastável.
Fontes: estudo próprio (teto custo), prática relacionada (somente técnicas habilitadas para aprendizado por ação que não exige a mesma técnica ainda bloqueada), observação (teto demonstrado), leitura (teto registrado), ensino (teto do tutor). Aprendizado é ação real com tempo efetivo, custo, acesso e interrupção. Fórmula proposta: delta = floor(tempoEfetivo × capacidadeAprendizado × taxaFonte + resto), manter resto determinístico; novoProgresso = max(atual,min(custo,tetoFonte,atual+delta)). Estudo próprio teto=custo. Taxas ilustrativas relativas 1, 1.5, 2, 3, 4; balancear antes de homologação; professor e livro não concedem pontos ilimitados. Não exigir aleatoriedade de descoberta: conclusão decorre de custo/requisitos. Interromper por sobrevivência, preservar progresso confirmado. A prática pode melhorar habilidade independentemente de conhecimento; não confundir.
Registro físico KnowledgeRecord {id,authorId,createdTick,title,contentById,version,carrier/location}; fonte com pontos por técnica limitados ao conhecimento realmente possuído pelo autor. Escrever é ação com material e trabalho; cópia reproduz conteúdo, não pontos de aprendizado infinitos. Ler requer acesso, tempo, alfabetização se configurada e pré-requisitos; ordem topológica para leitura de várias técnicas. Não subtrai do registro. Livro parcial B70 não concede B150; aprendiz B90 não retrocede. Vários registros não somam duplicatas, maior teto prevalece. Ensino: dois agentes vivos, comunicação/alcance, acordo ou atividade conjunta, compromisso/reserva, progresso efetivo, professor não perde conhecimento; fim quando teto, interrupção ou conclusão. Observação e prática são extensões posteriores; começar com estudo e leitura. Livro, inscrição e arquivo digital são suportes diferentes para o mesmo contrato; armazenamento e transporte físicos por ID, não misturar registros únicos com estoque fungível sem contrato.
Conhecimento da sociedade é projeção de detentores vivos e registros acessíveis; não desbloqueia todos automaticamente. Se morrer último detentor sem fonte, técnica pode ser perdida. Para validar gerações antes de reprodução, usar um novo aprendiz explícito; não simular nascimento fictício. Aprendiz pode estudar novos conhecimentos após leitura. Persistir catálogo/versão, progresso, fonte e registros; migração explícita.

## 4. Árvore inicial de conhecimento — proposta de catálogo
Custos apenas ilustrativos; não são balanceamento final. Ações listadas são intenções de conteúdo, não IDs de código garantidos. Domínios futuros: sobrevivência, agricultura, materiais, engenharia, energia, medicina, comunicação, organização social, ciências, computação, artes, exploração.
| ID conceitual | Custo adicional | Pré-requisito | Capacidade/ação habilitada |
|---|---:|---|---|
| nature.plants | 50 | — | identificar espécies conhecidas |
| survival.gather | 40 | — | colher/coletar alimento reconhecido |
| agriculture.basic | 100 | nature.plants | plantar e cultivar em zona adequada |
| agriculture.advanced | 150 | agriculture.basic | cultivar espécie/técnica adicional definida |
| agriculture.irrigation | 200 | agriculture.advanced | construir/usar irrigação quando houver água e infraestrutura |
| materials.minerals | 70 | — | reconhecer minérios |
| materials.mining | 120 | materials.minerals | extrair minério com condições físicas |
| energy.fire | 80 | — | produzir/manter fogo quando sistema existir |
| energy.heat | 100 | energy.fire | cozinhar/processar materiais compatíveis |
| materials.metallurgy | 250 | energy.heat, materials.mining | produzir lingotes com insumos e instalações |
| materials.forging | 200 | materials.metallurgy | fabricar ferramenta metálica |
| engineering.mechanics | 350 | materials.forging | produzir componentes e máquinas definidos |
| communication.literacy | a definir | comunicação inicial | ler/escrever registros (se escrita separada, definir rota sem dependência circular) |
| survival.shelter | a definir | — | construir abrigo rudimentar |
No cenário mínimo, conceder coleta, abrigo, identificação de plantas, alfabetização se necessária e cultivo básico aos fundadores; impedir que requisitos novos tornem mundo existente inviável. A técnica avançada deve ter uma ação concreta distinguível (ex. cultivar espécie já suportada, mas não acessível sem técnica no cenário SimNext). Irrigação/energia/fogo só quando mecanismo existir; não fingir habilitação funcional.
Cinco efeitos de conhecimento: ação, receita, projeto, reconhecimento, modificador de técnica (com consumidor explícito). Conhecimento sozinho não produz recursos, qualidade, capacidade industrial nem edifícios. Separar conhecimento para propor/planejar e para executar. Grafo visível no inspetor individual e visão comunitária (detentores/registros), com adquirido/em progresso/estudável/bloqueado, custos, pré-requisitos, fonte e ações. UI é read-only, salvo comandos explícitos válidos.

## 5. Interação e decisão
Contrato semântico ActionDefinition {id,targetKinds,requirements,conditions,cost,expectedOutcomes}; execução específica validada pelo motor, não função genérica que aceita efeitos arbitrários. Requisitos: conhecimento, equipamento, insumo, permissão, posição, acesso, estado. canPerform(actor, action, target) retorna elegibilidade e razões; IA e executor compartilham validações, executor revalida. Ação gera mudanças e eventos; não alterar mundo por UI. Estudar, ler, escrever, ensinar, plantar, colher, mover, negociar seguem mesmo formato; atores e alvos adequados.
Utility AI proposta U = necessidade + interesse + valor + objetivo + benefício social percebido - custo - risco, com componentes normalizados, pesos configuráveis e não duplicados. Primeiro filtrar viabilidade, priorizar emergência quando houver ação válida, manter compromissos/reservas enquanto razoável, depois comparar candidatos e registrar motivo. Não congelar NPC se a ação de sobrevivência não for possível; selecionar alternativa válida/replanejar. Estudo compete com trabalho e descanso. Percepção limitada inicialmente ao alcance/entidades acessíveis; refinar memória de mundo depois. Relações e política entram depois do núcleo; não exigir conhecimento social sofisticado para o estudo.

## 6. Agenda conceitual — ordem para desenvolver ideias e fechar lacunas
As etapas são discussões, não autorizações de implementação. Cada uma produz regras, exemplos normais/limites, contrato e critério de aceitação, com registro do que foi aprovado/adiado.
| Etapa | Perguntas e sugestões | Entrega |
|---|---|---|
| D1 Mundo, tempo e escala | unidade de tile/tick, idade/dia, propriedade, recurso renovável/finito; começar 24x16, não simular física completa | contrato do mundo e escala |
| D2 Indivíduo | quais atributos têm consumidores distintos? separar capacidade, estado e derivado; reutilizar existentes | tabela atributo → ação/efeito |
| D3 Necessidades e ciclo de vida | fome, energia, saúde, descanso, recuperação; depois hidratação, envelhecimento, reprodução; limiares e morte | ciclos e prioridades |
| D4 Ações e capacidades | alvo, requisitos, custo, duração, interrupção, resultado, reservas; conhecimento vs habilidade | contrato de interação |
| D5 Conhecimento e catálogo | nós iniciais, dependências, custo, ação liberada, inicialização e prevenção de circularidade | catálogo pequeno versionado |
| D6 Aprendizado e transmissão | como estudar, praticar, registrar, ler, ensinar, limites, acesso, taxas e perda; começar estudo/leitura | regras e fixtures fundador/aprendiz |
| D7 Personalidade e interesses | tags vs intensidades, seed, formação, evitar dupla contagem, escolha de domínio | perfil e pesos de motivação |
| D8 Decisão, percepção e memória | candidatos, pontuação, urgência, compromisso, campo perceptivo, memória limitada e explicação | algoritmo mínimo e cenários de teste |
| D9 Economia e tecnologia | inventário, propriedade, receitas, logística, materiais, produção e progressão; conhecimento não cria recurso | cadeia de cultivo/metalurgia |
| D10 Sociedade e relações | membros, liderança, valores, autoridade, confiança, comunicação, ensino, mediação; violência só depois | regras de relações e encontro |
| D11 Experimentos e observabilidade | parâmetros, seeds, condições de parada, métricas, logs, intervenção e replay | Scenario/Run/Observation |
| D12 Escala e expansão | múltiplas comunidades, gerações reais, tecnologia avançada/espacial, desempenho e abstração de escala | roadmap longo e limites |
Dependência para V1: D1–D6 mínimas, D7–D8 versão reduzida (interesse fixo + seleção existente), D11 mínimo (preset/seed/log). D9–D10 e D12 completas não bloqueiam V1. Revisitar D1–D8 quando a primeira fatia revelar lacunas. Nenhuma obrigação de completar todo catálogo antes da primeira homologação.

## 7. Auditoria estática de reutilização visual (main observada 26/11)
[Browser runtime](BROWSER_RUNTIME.md): /browser usa motor existente em Web Worker, scheduler 4 TPS em 1x, velocidades 0/1/2/4, API local compatível, bundle esbuild no Docker; sem sincronização servidor, saves em memória da sessão, export/import JSON, throttling em background. [Runtime](../../apps/browser-runtime/src/runtime.ts) chama createWorld, bootstrapSeededWorld, applyCommand, advanceTick e projectWorldView; world/new aceita tamanhos 24x16,32x24,48x32,64x48 e seed. [Views](../../apps/browser-runtime/src/views.ts) produz catálogo, inspect, economia e projeção; [UI compartilhada](../../apps/shared-ui/app.js) escolhe browserMode por pathname, usa Scene + adaptadores motion/tick/layered, SpriteLibrary, inspetor, monitor de atividade. [Sprite contract](WORLD_SPRITE_CONTRACT.md): identidade persistente, direção, pivô e footprint; arte nova completa não é pré-requisito para conhecimento. [Testes existentes](../../tests/browser-runtime.test.mts) verificam runtime, isolamento, seed e export/import; não provam comportamento visual real nem paridade integral servidor/worker. [Snapshot](../../packages/protocol/src/world-snapshot.ts) valida esquema; adicionar conhecimento/registros exige migração e roundtrip. npm test usa Node >=22.18; CI/deploy devem ser conferidos quando implementar. Não executamos aplicação nesta auditoria.
Reutilizar renderer por contrato/projeção, não por acesso a entidades internas. Novas ações intelectuais podem usar idle/working existente, label e ícone de atividade (estudando/lendo/escrevendo) com fallback da mesma identidade, sem exigir atlas novo. Registro pode usar representação de item/ícone no inspetor e posição se no chão, sem sprite dedicado. NPC não muda aparência por estudo; sem posição simulada pelo renderer. Não introduzir efeitos em Canvas para simular progresso.
Rota recomendada: /browser com preset experimental opt-in (ex. selector SimNext V1 ou query explicitamente implementada), worker atual e UI existente; / e /admin intactos. Não supor que query já existe. Não criar runtime paralelo nem rota nova até necessidade; opção de isolação por feature flag e schema. Modo observador read-only por padrão; modo Deus explícito, comandos auditáveis.

## 8. Fatias visualmente homologáveis
V0 — cenário de controle: preset/seed determinístico no navegador, iniciar pausado, mundo 24x16, 2–4 NPCs e recursos/depósito/abrigo já suportados; confirmar seleção, câmera, movimento, HUD, fps/UPS e export/import, comparar baseline. Não é nova mecânica; valida reaproveitamento.
V1 — primeira experiência SimNext: 2 NPCs (fundador e aprendiz, sem reprodução ainda), interesse fixo distinto, comida/abrigo suficientes para permitir estudo, A básico inicial fundador, B avançado a estudar, C próximo conhecimento opcional; uma ação real do catálogo existente condicionada a B apenas no preset experimental. Ações: estudar B, registrar A/B em suporte físico, ler A/B, executar ação habilitada. Aprendiz começa sem A ou com progresso parcial, lê A antes de B; conhecimento inicial de sobrevivência em ambos. Não exigir sistema de água/fogo, metalurgia, economia nova, relações ou novas animações para esta fatia. Criar fonte de escrita/registro com custo material compatível (ex. suporte de madeira/papel abstrato definido e concedido no cenário; validar material). V1a estudo + requisito; V1b registro + leitura + novo aprendiz/remoção do fundador. V1c escolha espontânea via interesse simples (shadow scoring e posterior ativação); o modo controlado pode disparar comandos explicitamente para testes, sem fingir autonomia.
V2 — integração de cultivo e cadeia real: agricultura avançada aplica técnica/espécie com efeito concreto; ensino entre dois, estudo autônomo, competição com trabalho, interrupção por fome, indicador de conhecimento. V3 — expansão: 5–10 NPCs, metalurgia e oficina existentes, liderança considera disponibilidade de técnica. V4 — dois assentamentos, pertencimento, troca, relações e mediação sem combate obrigatório.
Visual mínimo V1: inspetor com aba Conhecimento (por NPC: progresso, técnica, pré-requisito, origem, ações liberadas), atividade e motivo, registro com autor/conteúdo, painel/linha do tempo de estudo, descoberta, escrita, leitura e ação; status do cenário e seed. UI usa catálogo e inspectView, atualizações sob demanda/cadência; não mandar grafo completo a cada tick. Renderer recebe somente entidade/atividade/posição/visualKey necessários. Usar sprite atual e fallback; evitar alteração geral da interface.
Trabalho técnico: (1) fixtures e cenário mínimo, (2) catálogo + progressão pura e testes, (3) contrato de requisitos e ações no engine, (4) integração com snapshot e catálogos/projeções, (5) escolha de atividade mínima, (6) integração UI/worker e bundle, (7) testes de navegador reais e headless, (8) CI/revisão/homologação isolada. Etapas 2–3 e layout do inspetor podem ser preparadas em paralelo se contrato estável, sem escrever campos duplicados.

## 9. Checklist de homologação
- Mesmo seed + versão + comandos/ticks produz estado equivalente; mundo do servidor não sofre alteração; preset legado mantém comportamento.
- Personagem visível, identidade e direção preservadas; pause congela progresso e movimento; 1/2/4x muda tempo de parede, não custo lógico; nenhuma ação por frame.
- Fundador estuda e completa B; UI atualiza motivo e progresso; tentativa sem B falha com motivo; após B, executa ação com custo real. Sem insumo/alcance, continua bloqueada.
- Livro/documento físico com ID, autor e conteúdo; aprendiz com pré-requisitos adequados aprende por leitura, não recebe mais que fonte; releitura/cópia não gera pontos extras; interrupção preserva progresso; remoção do fundador não apaga registro.
- Export/import de mundo novo e antigo, versão/seed, registros e progresso; falha inválida controlada e nenhuma perda de dados; sem contornar INVALID_WORLD.
- Testes unitários de catálogo, limites, taxas, pré-requisitos; integração engine; paridade por sequência de ticks entre headless e browser; teste de UI em Chromium real (seleção, progresso, ação, pause, save/export/import e console sem erros); observar offline após assets quando suportado.
- Medir p50/p95 tick, UPS, FPS, memória, tamanho de mensagens e latência; comparar baseline com mesmo seed e população. Meta numérica só após coleta, sem prometer 60 FPS/hardware.
- Não declarar homologado apenas por build verde, screenshot estático ou execução de teste unitário. Registrar commit, navegador/dispositivo, cenário, seeds, resultados e regressões. Não fazer merge/deploy antes dos gates acordados.

## 10. Decisões abertas
Aprovar D1–D6 antes da primeira fatia, especialmente unidade de tempo, atributos mínimos, ação concreta B, suporte de registro e requisitos de leitura. Taxas e valores são propostas; esquema de snapshot, migração, modo experimental e API de cenário precisam de revisão técnica. Não ampliar escopo até validar V1. Não houve código, testes executados, merge ou deploy nesta atualização de documentação.

## 11. Revisão da ordem de trabalho
A direção posterior registrada em [SIMNEXT_OBSERVER_AND_SESSIONS.md](SIMNEXT_OBSERVER_AND_SESSIONS.md) prevalece: definir renderizador e sessões primeiro; completar concepção e arquitetura de código antes de implementar os novos sistemas; validar headless e só então levantar necessidades visuais e integrar. V0 pode validar infraestrutura atual de forma isolada após aprovação; V1–V4 não são autorização de implementação antecipada. D1–D12 permanecem agenda conceitual.
