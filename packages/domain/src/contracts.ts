export type Role = "player" | "npc" | "admin";
export type EntityKind = "character" | "resource";
export type ActionId = "entity.inspect" | "movement.move" | "npc.spawn" | "resource.spawn";
export type FailureCode = "UNAUTHORIZED" | "NOT_FOUND" | "INVALID_TARGET" | "INVALID_PAYLOAD" | "OUT_OF_BOUNDS" | "BLOCKED" | "DUPLICATE_COMMAND";
export interface Position { x: number; y: number }
export interface Character { id: string; kind: "character"; name: string; position: Position; health: number; energy: number; ownerId?: string }
export interface Resource { id: string; kind: "resource"; resourceType: string; position: Position; quantity: number; maximum: number }
export type Entity = Character | Resource;
export interface World { id: string; tick: number; width: number; height: number; entities: Entity[]; appliedCommands: string[] }
export interface Command { commandId: string; worldId: string; actorRole: Role; actorId?: string; action: ActionId; targetId?: string; position?: Position; parameters?: Record<string, unknown> }
export type Result =
 | { ok: true; status: "completed"; commandId: string; tick: number; events: ReadonlyArray<{type: string; entityId?: string}> }
 | { ok: false; status: "rejected"; commandId: string; error: FailureCode };
export const inBounds = (world: World, point: Position) =>
 Number.isInteger(point.x) && Number.isInteger(point.y) && point.x >= 0 && point.y >= 0 && point.x < world.width && point.y < world.height;
