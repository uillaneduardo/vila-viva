# Loops essenciais de gameplay — propostas G0

## Sobrevivência (jogador/NPC)
`perceber necessidade → encontrar recurso/abrigo conhecido → avaliar acesso → deslocar → executar comer/descansar → recuperar atributos → reavaliar prioridades`.
- Saúde pode chegar a 0; estado `dead` termina as ações e libera reservas. Morte não é removida silenciosamente.
- Fome/sono têm severidade; tarefas de baixa prioridade não devem manter o ator parado até morrer.
- Reavaliar objetivos se rota/fonte/vaga desaparecer, sem loops infinitos. Backoff e motivo de falha visíveis.
- Jogador offline: política não irreversível precisa ser definida antes de implementar.

## Logística de recursos
`descobrir fonte → selecionar/reservar vaga → caminhar → coletar lote → inventário físico → procurar depósito viável → caminhar → reservar espaço → entregar → atualizar estoque`.
- Estoque não cresce na coleta.
- Carga tem peso, afeta velocidade e stamina.
- Entregas separadas permitem coletor e carregador diferentes.
- Depósito cheio não elimina itens. Pilhas largadas continuam no mundo.
- Fontes exauridas permanecem no mapa e se regeneram de acordo com o relógio do mundo.

## Construção comunitária
`identificar demanda → propor projeto → selecionar terreno → criar canteiro → entregar materiais da etapa → realizar unidades de trabalho → concluir etapa → liberar próxima etapa → inaugurar`.
- Primeira obra: casa comunitária; etapas fundação, estrutura, telhado, acabamento.
- Materiais são movimentados fisicamente.
- Construir sem materiais não gera progresso; trabalho interrompido perde apenas unidade parcial.
- Apenas uma obra ativa inicialmente (regra configurável/versionada no futuro).

## Modo Deus
`escolher categoria de ferramenta → preset e parâmetros → visualizar prévia no mapa → apontar posição/alvo → confirmar → comando autenticado → validação do motor → aplicação no tick → evento auditável → atualização sincronizada player/admin`.
- Ações destrutivas e mudanças de regras exigem confirmação extra.
- Admin observa decisão e efeito em NPCs sem forçar um comportamento programado pelo evento.

## Fluxo mínimo de integração
O backend autoritativo aceita comandos, processa em tick e retorna `accepted/rejected`; a aplicação posterior retorna `completed/failed` por evento sequenciado. O frontend mostra `pending` e não modifica o estado autoritativo diretamente.
