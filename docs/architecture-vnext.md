# Vila Viva — arquitetura vNext

Estado: arquitetura proposta; execução em branch isolada `architecture/vnext-foundation`. Issue: #15.

## Limites
- Motor de simulação sem DOM, Canvas, REST, WebSocket, Cloudflare e banco de dados.
- Um escritor autoritativo por mundo; tick lógico fixo; visão do navegador como projeção.
- Comandos chegam do gateway validados (identidade, permissões, schema, idempotência), e são aplicados **no limite do tick**.
- Sistemas são registrados por configuração; não importam uns aos outros; efeitos e eventos tipados formalizam mudanças.
- Persistência futura: PostgreSQL, snapshot+log transacional, versões de schema e rollback.
- WebSocket futuro: snapshot completo inicial, deltas ordenados por world/tick/sequence, resync e reconexão.
- God Mode: frontend separado, autorização no servidor e auditoria, Cloudflare Access como camada adicional.
- Ticks lógicos e FPS/render independentes; interpolação de movimento exclusivamente na UI.

## Desenvolvimento incremental
E1 foundation -> E2 persistência+sistemas -> E3 gateway/WS -> E4 jogador/admin -> E5 homologação/rollout.

## Regras
Pacotes de domínio não podem depender de UI/infra. Todos os sistemas devem ter IDs estáveis, sem mutações de estado compartilhado fora do contexto controlado. Contratos precisam ser versionados. Testes determinísticos por seed e sequência de comandos obrigatórios.

## Legado
Não apagar main, nem volumes Docker, nem snapshots JSON. O mundo antigo não será implicitamente migrado; criar importador explícito após estabilizar esquema vNext.

## Primeiro incremento
Protótipo mínimo de execução em `packages/core` e `packages/engine` com interfaces de mundo, comandos, eventos e execução determinística.
