# ADR — publication independent of persistence (#99)
Status: proposed; instrumentation first. Existing sync default and worker opt-in remain unchanged.

## Decision
Publish completed immutable revisions from the authoritative server, not from disk or browser acknowledgments. A bounded ordered persistence coordinator owns outstanding immutable revisions per timeline; one writer remains exclusive. Track published vs durable revision separately. Final acknowledgment of critical commands requires durable commit; provisional visual state may roll back. On queue saturation or disk failure stop accepting new mutations, report unsaved state and recover/resync with new epoch. Never drop authoritative events. Save/load/switch/export/shutdown are explicit barriers. Preserve current per-revision checkpoint until deterministic replay (#23) and fault tests prove equivalence. No TPS or gameplay changes.

## Baseline
New tickToPublish measures server tick start through synchronous return of broadcaster (not network delivery, browser frame or disk-only duration); clone is measured separately in worker mode. Existing simulation, persistence, projection, publish, tickInterval metrics remain. Windows are bounded; no new public endpoint. Measure only with active observers for actual publication costs. Automated smoke tests validate metric availability in both modes; not a performance claim.

Next: run controlled matrix on identical seeds/world 64x48, 6/50/100/250 NPCs, speed 1/2/4, one/two WS observers, LAN/tunnel; capture sample counts and p50/p95/p99, effective TPS, WS gaps/bytes, frame time, CPU/RAM, clone/serialization and disk latency. Separate warmup, setup and measurement. Compare sync vs existing worker; later compare experimental coordinator under identical load and injected slow I/O. Record hardware, storage, duration and revision. No default switch without crash/queue/barrier tests and agreed recovery budget. No results claimed yet.
