# Vila Viva — telas, seleção, painéis e fluxos (proposta G0)

## Regra principal
**Mapa é a superfície de interação**, não um dashboard cheio de botões. Menus revelam ações conforme seleção e contexto.

## Jogador — páginas
1. **Mundo**: mapa topdown com seleção, câmera/zoom, minimapa opcional, HUD compacto de saúde/energia/fome, localização e tarefa ativa.
2. **Personagem**: atributos, necessidades, equipamento, inventário por peso e habilidades; gestão do próprio personagem.
3. **Comunidade**: demandas, projetos públicos, descobertas conhecidas e relações; algumas consultas exigem presença física no quadro.
4. **Histórico**: decisões/ações próprias e alertas relevantes, sem dados internos privados de todos os NPCs.

### Contexto selecionado
- Terreno vazio: caminhar até aqui (se alcançável), detalhes do terreno.
- NPC: nome/atividade visível, interagir/conversar se próximo, informações públicas.
- Fonte: tipo/quantidade observável, coletar (se condições permitem), rota e vagas.
- Item/pilha: pegar (se perto e houver capacidade), inspecionar.
- Depósito: abrir estoque permitido; depositar/retirar conforme distância/capacidade.
- Canteiro: requisitos por etapa, entregar material, trabalhar; apresentar falta de material e progresso.
- Abrigo/cama: descansar/dormir se vaga e permissão.
- Nenhuma seleção: instruções discretas; nenhum painel permanente tapando o mapa no mobile.

## Admin — páginas
1. **Mundos**: catálogo, criar/clonar, abrir, pausar, restaurar (com confirmação), estado e últimas alterações.
2. **Observatório**: mapa grande, ferramentas compactas à esquerda, inspetor contextual à direita e timeline recolhível embaixo.
3. **Entidades**: NPCs, objetos, pilhas, fontes, construções com busca/filtro e foco no mapa.
4. **Regras e eventos**: presets parametrizáveis, editor versionado, prévia e confirmação.
5. **Estatísticas e auditoria**: gráficos, decisão atual dos NPCs, causas de bloqueio, comandos com autor/tick/resultado.

### Fluxo de ferramenta admin
Selecionar `Adicionar fonte` → preset (ex. pomar) → quantidade inicial/máxima/regeneração/vagas → prévia translúcida no mapa → escolher tile válido → confirmar → feedback de processamento → evento de criação e inspetor da entidade.

### Fluxo de inspeção NPC
Selecionar NPC → atributos vitais + atividade → intenção/objetivo atual + motivo → inventário e carga → destino/rota → histórico e bloqueios → ações administrativas permitidas. Mostrar diferença entre observação e alteração.

## Estados compartilhados
Sem seleção; selecionado; fora de alcance; disponível; desabilitado com motivo; solicitado; em movimento; executando; concluído; erro; cancelado; offline/ressincronizando.

## Desktop e mobile
Desktop: mapa dominante, inspetor lateral recolhível, ação contextual próxima da seleção quando útil. Mobile: mapa ocupa tela, toolbar compacta, inspetor em bottom sheet, alvos touch >=44px, arrastar e pinçar zoom; evitar controles sobrepostos e botões recriados por updates.

## Critérios de homologação visual
- Ferramentas localizáveis, ações contextualizadas, feedback de pré-condições, fluxo de confirmação e desfazer/cancelar onde permitido.
- Jogador não vê Modo Deus; admin não precisa controlar avatar.
- Seleção e foco persistem entre updates; menus não piscam nem capturam indevidamente toques.
- Sem inventar estados 'em tempo real' quando não há backend.

## Extensão MVP — casa, vínculos e ciclo familiar
**Inspetor de construção:** blueprint, etapa, materiais exigidos/entregues, trabalho restante, estado de conclusão, vagas adultas/dependentes, conforto, moradores e atividades de convivência.

**Inspetor NPC (admin):** fase de vida, necessidades, humor e fontes, vínculos dirigidos, parceria, moradia, família, etapa de gestação/recuperação, modificadores e razões de bloqueio de atividades. Mudanças demográficas são eventos do sistema e não botões arbitrários de gravidez.

**Jogador:** casa apresenta descanso, conforto, residentes públicos, vagas e interações permitidas; perfil próprio mostra modificadores, necessidades e tarefas. Dados sensíveis de NPCs não precisam ser públicos para jogadores.

**Estatísticas admin:** ocupação, capacidade familiar, interações, nascimentos, cuidados pendentes, bloqueios e efeitos de bem-estar. Estados `planejado` permanecem explícitos até existir execução real.
