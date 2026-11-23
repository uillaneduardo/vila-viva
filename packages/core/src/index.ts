/** The domain model is independent from storage, transport and UI. */
export interface WorldState {
  readonly id: string;
  readonly seed: number;
  readonly tick: number;
  readonly counters: Readonly<Record<string, number>>;
}

export interface WorldCommand {
  readonly id: string;
  readonly kind: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface WorldEvent {
  readonly tick: number;
  readonly type: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export function createWorld(id: string, seed: number): WorldState {
  if (!id.trim()) throw new Error("world id required");
  if (!Number.isSafeInteger(seed)) throw new Error("seed must be a safe integer");
  return Object.freeze({id, seed, tick: 0, counters: Object.freeze({})});
}
