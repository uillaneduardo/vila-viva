# Sistema Universal de Efeitos — Decisão arquitetural aprovada

## Modelo
`EffectDefinition` em `packages/content/src/effects/catalog.ts`: ID, tags, duração/política de vida, modificadores, stacking e **intenção** de evento ao expirar.
`ActiveEffect` em `packages/domain/src/effects.ts`: instância por entidade, origem, início/fim no tick, stacks.
`packages/systems/effects/src/manager.ts`: aplicar, renovar/acumular, remover e expirar por tick lógico, sem DOM ou rede.
`packages/systems/effects/src/resolver.ts`: atributos efetivos e detalhamento da cadeia (`base/add/multiplier/cap/effective/sources`).

## Separação imprescindível
- Efeito não cria NPC, não decide relacionamento nem constrói casa. Expiração de `gestation` emite `reproduction.birth_due`; o sistema `reproduction/population` futuro valida elegibilidade, deduplicação e cria o nascimento, e então aplica `postpartum_recovery`.
- `well_sheltered` é condicional; somente o sistema de habitação o aplica/remove quando existe moradia funcional. Não basta a casa estar no mapa.
- `sad` reduz `moodMax`; humor resolvido menor afeta `workRate` e `socialWillingness` sem regras duplicadas. Base → humor → derivados forma DAG sem realimentação instantânea.
- Modificadores não alteram atributos-base. Capacidades efetivas são consultadas por movimento, trabalho e inventário. Uma fatia inicial do motor já consulta `energy` resolvida; custo de velocidade por tick e capacidade física completa são integrações posteriores.
- Fases de gestação, restrições a trabalhos pesados, impedimentos fisiológicos, cuidado e nascimento idempotente são responsabilidades de sistemas futuros. **Nenhum nascimento acontece atualmente**.

## Semântica de duração e empilhamento
- `timed`: expira quando `tick >= expiresAtTick`, removido uma vez.
- `conditional`: permanece até o sistema dono remover; nenhuma verificação implícita de condições pelo manager.
- `permanent`: sem expiração automática.
- `unique`: evita duplicação; `refresh`: estende para `now+duration`; `stack`: soma até `maxStacks`.
- Modificadores: somar aditivos, multiplicar fatores, aplicar menor cap explícito, clamp não negativo; aplicar humor máximo antes de derivados.
- Resolver ignora efeitos já vencidos, mesmo antes do tick de limpeza. Eventos de expiração não podem ser interpretados como ação de gameplay confirmada.

## Dados iniciais de balanceamento (provisórios)
`sad`, `happy`, `well_sheltered`, `injured`, `gestation`, `postpartum_recovery`. A duração da gestação (40 ticks no protótipo), modificadores e duração de recuperação são **valores experimentais de teste**, não duração biologicamente realista nem decisão final de gameplay.

## Inspetor Modo Deus previsto
Mostrar origem, tipo, duração, stacks, condição dona, valores antes/depois e cadeia causal. Não expor efeitos privados a jogadores sem regra de autorização do servidor.

## Contratos de qualidade
Testar duração, refresh, unique, aplicação combinada, expiração exata, eventos não duplicados, cadeia de humor e retorno a valores base. Arquitetura não deve importar o renderer ou UI. Manter mundo determinístico por tick; nascer/recuperar são etapas separadas auditáveis.

**Limitações atuais:** não existem execução autônoma de ticks, gestação progressiva, nascimento, política de re-aplicação condicional, persistência de efeitos ou suporte de UI para visualizar explicações completas.
