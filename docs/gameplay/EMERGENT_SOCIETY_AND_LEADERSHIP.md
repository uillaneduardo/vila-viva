# Oturo — Sociedade emergente, valores pessoais e liderança

**Status:** proposta conceitual para homologação (2026-11-26). Não altera comportamento vigente.
**Escopo:** gameplay, simulação social e decisões autônomas; não redefine renderização nem contratos de ações físicas.
**Documentos relacionados:** [WORLD_PERSISTENCE_AND_LEADERSHIP](WORLD_PERSISTENCE_AND_LEADERSHIP.md), [ECONOMY_PRODUCTION_TRAITS](ECONOMY_PRODUCTION_TRAITS.md), [CORE_LOOPS](CORE_LOOPS.md), [HOUSING_FAMILY_MVP](HOUSING_FAMILY_MVP.md), [FAMILY_BALANCING_DECISIONS](FAMILY_BALANCING_DECISIONS.md), [DEPOT_AND_NPC_AI](DEPOT_AND_NPC_AI.md).

## 1. Visão e objetivo
Oturo evolui de sobrevivência/logística para uma sociedade emergente. O mundo oferece condições, riscos e oportunidades; a comunidade possui necessidades e objetivos coletivos; o líder orienta prioridades; cada NPC decide segundo necessidades, valores, personalidade, vínculos, conhecimento, habilidades e oportunidades. A sociedade emerge dessas decisões, não de um roteiro único. Não existe pontuação universal de vitória; o Modo Deus observa e modifica condições por comandos explícitos. Sobreviver é a base, não o único propósito. NPCs podem aspirar a conforto, família, reconhecimento, domínio de uma profissão, descoberta, beleza, cooperação ou liderança. Necessidades não formam hierarquia absolutamente rígida, mas emergências fisiológicas e segurança imediata possuem salvaguardas.

## 2. Indicadores coletivos
Cada indicador possui valor bruto, denominador, valor normalizado 0–100, tendência, confiança/cobertura, tick de atualização e explicação. Valores abaixo são critérios iniciais; pesos/limiares são hipóteses configuráveis, não balanceamento aprovado. Quando um domínio ainda não existe no motor, expor 'não medido', nunca zero fictício.
| Indicador | Evidências observáveis | Decisões que pode alimentar |
|---|---|---|
| Sobrevivência | Saúde, saciedade, descanso, água quando disponível, dias de reserva | Coleta, cultivo, abastecimento |
| Bem-estar | Humor, conforto real, descanso, satisfação individual | Moradias, lazer, refeições |
| Segurança | Riscos locais, acesso a abrigo, integridade de estruturas | Proteção, manutenção |
| Infraestrutura | Cobertura de serviços e capacidade funcional versus demanda | Construir, reparar, melhorar |
| Prosperidade | Estoques úteis, excedente sustentável, diversidade produtiva, gargalos | Produção, logística, comércio futuro |
| Beleza | Vegetação, conservação, limpeza, decoração ponderada pela exposição | Jardinagem, ornamentação, limpeza |
| Tecnologia | Técnicas comprovadas e acessíveis, ferramentas, conhecimento compartilhado | Pesquisa, oficinas, experimentação |
| Coesão social | Confiança, ajuda recíproca, conflitos, isolamento | Encontros, mediação, cooperação |
| Educação | Habilidades, acesso a aprendizagem e transmissão de conhecimento | Aprender, ensinar, formar especialistas |
| Sustentabilidade | Taxa de renovação/extração, fertilidade, pressão sobre fontes | Replantio, conservação |
| Legitimidade | Distribuição de confiança e aceitação da liderança | Diálogo, revisão de políticas, sucessão futura |

Medir cobertura efetiva e distribuição, não apenas totais ou médias: exibir proporção de NPCs com carências e piores condições. Evitar recompensas por duplicar edifícios inúteis, inflar estoque, decorar áreas inacessíveis ou explorar recursos sem renovação. Construções só contribuem quando funcionais e atendem demanda; tecnologia só quando há conhecimento/condições reais. Indicadores são projeções derivadas; não criam recursos, necessidades ou bônus por si. Causas locais afetam indivíduos (p. ex. beleza percebida no trajeto), não uma média global onisciente.

## 3. Modelo individual
Separar (a) necessidades/estado dinâmico: saúde, saciedade, energia, segurança, humor, conforto, socialização; (b) traços: tendências estáveis, extensíveis ao catálogo de characters já existente; (c) valores: pesos relativos por domínio (família, cooperação, progresso, beleza, autonomia, ordem, conforto, sustentabilidade, ambição); (d) aptidões/habilidades e ocupação atribuída; (e) objetivos pessoais persistentes, com progresso, pré-condições, prazo opcional, satisfação e motivo de revisão; (f) memória e relacionamentos direcionais; (g) percepção: fatos conhecidos, origem, idade e confiabilidade.
Traço não é habilidade, profissão ou regra absoluta. Ex.: curioso valoriza descoberta; cuidador valoriza família; ambicioso busca reconhecimento; independente resiste a imposições; ordeiro prefere previsibilidade; pacificador evita confronto; impulsivo reage mais intensamente; esteta valoriza ambiente. NPC pode ter vários traços compatíveis e pesos graduais. Inicialização determinística por seed; mudanças de valores lentas e motivadas por experiência. Objetivos concretos competem entre si e podem ser satisfeitos, substituídos ou abandonados por motivo auditável. A ocupação designada pelo líder influencia trabalho e identidade visual de profissão; não apaga personalidade, não substitui capacidades físicas, não confere ferramenta nem força execução. A aceitação da mudança pode ser negociada; preservar identidade e sprite enquanto a mudança não for efetivada pelo motor.

## 4. Liderança
Líder continua sendo um NPC com estado pessoal, valores e vínculos. Acrescentar traço de orientação de liderança (perfil inicial, extensível e não exclusivo) que altera pesos dos objetivos coletivos, e um eixo independente de estilo de autoridade (participativo ↔ centralizador), além de competência de planejamento e legitimidade adquirida.
| Orientação | Ênfase provável | Risco de excesso |
|---|---|---|
| Protetora | Saúde, comida, abrigo, segurança | Menor investimento em inovação |
| Desenvolvimentista | Infraestrutura, produção, expansão | Sobrecarga, consumo de recursos |
| Inovadora | Tecnologia, educação, ferramentas | Negligenciar necessidades presentes |
| Humanista | Bem-estar, família, coesão | Menos excedente em certas condições |
| Estética/ecológica | Beleza e sustentabilidade | Custo de oportunidade produtivo |
| Equilibrada | Distribuir atenção conforme carências | Progresso menos concentrado |
Esses perfis são vetores de pesos, não classes que bloqueiam ações. O estilo de autoridade não implica automaticamente violência nem garante obediência; transparência, resultados e respeito influenciam aceitação.

O líder consulta diagnóstico conhecido, necessidades urgentes, custos, dependências, estoque, trabalhadores e capacidades. Prioriza objetivos viáveis; propõe projetos, ordens de produção e ocupações usando contratos existentes, sem manipular estado dos demais. Publica no quadro comunitário objetivo, motivo, prioridade, tarefas e revisão. NPCs descobrem essas propostas por meios disponíveis. Manter limite atual de uma obra comunitária ativa até revisão específica. Emergências têm precedência e ordens inviáveis entram em estado bloqueado com motivo. Revisão em cadência de simulação (intervalo existente como ponto de partida) ou por evento relevante; evitar oscilações com histerese e compromisso mínimo. Não é necessário LLM: política determinística é padrão; adaptador de líder externo opcional respeitaria os mesmos comandos, conhecimento e validação.

## 5. Decisão autônoma e adesão
Pipeline: perceber → atualizar necessidades e crenças → gerar candidatos viáveis → proteger emergências → calcular utilidade → escolher/assumir compromisso → reservar recursos → executar comandos físicos validados → perceber resultado → reavaliar.
Usar Utility AI sobre geradores/planos existentes (sequências simples ou máquinas de estado); não reconstruir pathfinding, inventário, construção ou produção. Pré-condições físicas, permissões, reservas, alcance, saúde, ausência de conhecimento/acesso e segurança são restrições, não pesos negociáveis.
Exemplo conceitual em escala normalizada: utilidade = necessidade pessoal + progresso de objetivo pessoal + benefício coletivo percebido × adesão + afinidade/aptidão + incentivo social − esforço − risco − custo de troca. Coeficientes calibráveis por domínio; fatores limitados e explicáveis. Urgência crítica usa faixa separada; NPC vivo não deve morrer porque beleza recebeu peso excessivo. Antes de interromper tarefa não crítica, exigir vantagem mínima ou evento invalidante; liberar reservas e preservar contabilidade física.
Adesão à proposta combina confiança no líder, concordância de valores, percepção de justiça, relação pessoal, pressão social e resultados recentes. Não equivale a legitimidade média. NPC pode aceitar, adiar, negociar, recusar, sugerir alternativa ou iniciar ação pessoal dentro das permissões. Desobedecer não cria recursos nem autoriza editar mundo. Se não houver alternativa viável, descansar/socializar/explorar com finalidade quando disponível, ou aguardar com motivo e backoff; não ficar recomputando em loop.

## 6. Relações, conflitos e consequências
Relação dirigida A→B: confiança, afinidade, respeito, ressentimento, medo (futuro) e memória de eventos recentes. Separar relação pessoal com líder da aceitação de uma política. Eventos concretos (ajuda, injustiça percebida, promessa cumprida, falha, competição, insulto, mediação) atualizam vínculos com intensidade limitada, duração e decaimento. Divergência não é automaticamente inimizade.
Escalada proposta: discordância → reclamação/conversa → recusa/atrito → discussão → rivalidade/hostilidade → confronto físico opcional futuro, sujeito a salvaguardas e novos contratos de saúde/segurança. Exigir gatilho, histórico/tensão, oportunidade, contexto e cooldown; traços modulam probabilidade, nunca geram agressão gratuita. Mediação, desculpas, ajuda, mudança de política e tempo podem reduzir tensão. Conflito consome tempo, afeta humor, cooperação e confiança, podendo gerar afastamento. Futuro: grupos de afinidade, reivindicações, sucessão ou eleição, abandono/migração. Não implementar combate, punição, facções ou eleição sem homologação separada.
Usar grafo social esparso (vínculos observados/relevantes), evitar comparações de todos os pares a cada tick.

## 7. Exemplo emergente
Líder inovador propõe oficina enquanto alimento está estável. NPC curioso aceita pesquisar/fabricar; cuidador prioriza moradia e família; trabalhador independente recusa carga excessiva e sugere conserto. A produção cresce, mas a cobertura de moradia piora; reclamações reduzem confiança se não houver resposta. Líder revê metas ou insiste; as relações e o trabalho mudam com fatos observados. Se reservas de comida atingirem emergência, a sobrevivência prevalece para ambos. Outro líder protetor, na mesma seed, tenderá a alocar recursos de outra forma, mantendo as mesmas leis físicas.

## 8. Arquitetura e observabilidade
Módulos conceituais (nomes a confirmar no código): indicadores/projeções, personalidade/valores, objetivos pessoais, percepção, política de liderança, decisão por utilidade, relacionamentos e eventos sociais. Motor autoritativo puro e compartilhável com /browser; renderizador só consome projeções e eventos; não decidir no sprite/UI. Mesmo estado + seed + sequência de comandos/ticks produz mesmo resultado, com RNG explícito e desempate estável. Sem tempo de parede ou aleatoriedade não rastreada. Avaliação pessoal escalonada por NPC, indicadores agregados por eventos/cadência, cache de candidatos e caminhos; perfis de CPU/UPS e equivalência navegador/servidor antes de ampliar.
Persistir somente estado necessário: valores, objetivos, vínculos, memória relevante, política, compromissos e RNG. Projeções podem ser reconstruídas; eventos versionados e logs limitados/rotacionados; integrar com persistência sem bloquear renderização. Migração compatível de snapshots antigos com defaults determinísticos e validação de import/export; não mascarar INVALID_WORLD. Observabilidade: painel Mundo com indicadores, tendências, cobertura e causas; inspetor do líder com orientação, pesos, plano e aprovação; inspetor NPC com necessidades, traços, valores, metas, ocupação, relação, ação atual, candidatos e componentes de pontuação; linha do tempo social com razões e consequências. Telemetria não altera decisões.
Dados ainda inexistentes no motor ficam desativados/não medidos; UI não simula capacidade inexistente.

## 9. Roadmap e critérios de aceitação
1. Inventariar contratos atuais, traços, necessidades, ocupação, relações e liderança; baseline de CPU/UPS e casos de fome/ociosidade; registrar decisões de migração.
2. Indicadores derivados de domínios existentes + painel observável; testes de cobertura, ausência de dados e ausência de inflação artificial.
3. Valores/objetivos pessoais e orientação do líder em modo observação (shadow scoring), sem substituir IA; validar seed, snapshots e razões.
4. Utilidade e adesão em feature flag; integrar tarefas, profissão e emergências preservando logística; teste de recusa, alternativa, compromisso e falta de caminho/recursos; evitar starvation e oscilação.
5. Relações e interações sociais não violentas; testar direção, gatilho, mediação, decaimento e ausência de eventos duplicados; efeitos sobre decisão.
6. Expandir beleza, lazer, educação, tecnologia e economia conforme sistemas físicos reais; sucessão, facções, migração e confronto físico apenas após desenho próprio e aprovação.
Critérios transversais: mesmos inputs geram replay equivalente; salvar/carregar e alternar execução não apaga relações/metas nem duplica eventos; não criar recursos; prioridades críticas continuam operantes; líderes diferentes produzem tendências distintas em testes controlados sem roteiro fixo; NPCs com valores diferentes escolhem alternativas distintas quando viáveis; nenhum novo domínio exige alterar motor gráfico; orçamento de desempenho definido a partir do baseline e regressões medidas (inclusive mapa 64×48). Feature flags permitem homologação incremental. Não declarar implementação concluída com base apenas nesta proposta.

## 10. Decisões abertas
Homologar catálogo inicial de indicadores, traços, objetivos, orientações e estilos; limites de autonomia e atribuição de ocupação; pesos, escalas, cadências e limiares; regras de sucessão; permissões de projetos pessoais; nível de violência; papel de água, lazer, educação e pesquisa; metas de desempenho e migração de contratos. O presente documento recomenda escolhas iniciais, mas não substitui decisões aprovadas nos documentos existentes.
