import type {WorldCommand, WorldEvent, WorldState} from "../../core/src/index.ts";

export interface SystemContext {
  readonly world: WorldState;
  readonly commands: readonly WorldCommand[];
  emit(event: Omit<WorldEvent, "tick">): void;
  setCounter(key: string, value: number): void;
}

export interface WorldSystem {
  readonly id: string;
  readonly order: number;
  update(context: SystemContext): void;
}

export interface TickResult {
  readonly world: WorldState;
  readonly events: readonly WorldEvent[];
}

/** Deterministic immutable-per-tick executor. No timers or I/O. */
export class SimulationEngine {
  private readonly systems: readonly WorldSystem[];
  constructor(systems: readonly WorldSystem[]) {
    const ids = new Set<string>();
    for (const system of systems) {
      if (!system.id.trim() || ids.has(system.id)) throw new Error("Duplicate or empty system id");
      if (!Number.isSafeInteger(system.order)) throw new Error("System order must be an integer");
      ids.add(system.id);
    }
    this.systems = [...systems].sort((a,b)=>a.order-b.order || a.id.localeCompare(b.id));
  }

  step(previous: WorldState, commands: readonly WorldCommand[] = []): TickResult {
    if (!Number.isSafeInteger(previous.tick + 1)) throw new Error("tick overflow");
    const tick = previous.tick + 1;
    const counters: Record<string,number> = {...previous.counters};
    const events: WorldEvent[] = [];
    for (const system of this.systems) {
      system.update({
        world: Object.freeze({...previous, tick, counters: Object.freeze({...counters})}),
        commands,
        emit: event => events.push(Object.freeze({tick, ...event})),
        setCounter: (key,value) => {
          if (!key.trim() || !Number.isFinite(value)) throw new Error("Invalid counter");
          counters[key] = value;
        }
      });
    }
    return {world:Object.freeze({...previous, tick, counters:Object.freeze(counters)}),events:Object.freeze(events)};
  }
}
