export type Role = "player" | "npc" | "admin";
export type EntityKind = "character" | "resource" | "obstacle";
export type ActionId = "entity.inspect" | "movement.move" | "npc.spawn" | "resource.spawn" | "resource.harvest" | "obstacle.spawn";
export type FailureCode = "UNAUTHORIZED" | "NOT_FOUND" | "INVALID_TARGET" | "INVALID_PAYLOAD" | "OUT_OF_BOUNDS" | "BLOCKED" | "DUPLICATE_COMMAND" | "EXHAUSTED" | "INVENTORY_FULL";
export interface Position { x: number; y: number }
import type {ActiveEffect,AttributeId} from "./effects.ts";
export type NaturalStage = "seedling" | "young" | "mature" | "old" | "dead";
export type Inventory = Record<string,number>;
export interface Character { id: string; kind: "character"; name: string; position: Position; health: number; energy: number; ownerId?: string; inventory?: Inventory; attributes?: Partial<Record<AttributeId,number>>; effects?: ActiveEffect[] }
export interface NaturalLife { ageTicks:number; stage:NaturalStage; health:number; productionProgress:number }
export interface Resource { id: string; kind: "resource"; resourceType: string; position: Position; quantity: number; maximum: number; sourceId?:string; productId?:string; life?:NaturalLife }
export interface Obstacle { id:string; kind:"obstacle"; obstacleType:string; position:Position; blocksMovement:boolean }
export type Entity = Character | Resource | Obstacle;
export interface World { id: string; tick: number; width: number; height: number; entities: Entity[]; appliedCommands: string[] }
export interface Command { commandId: string; worldId: string; actorRole: Role; actorId?: string; action: ActionId; targetId?: string; position?: Position; parameters?: Record<string, unknown> }
export type Result =
 | { ok: true; status: "completed"; commandId: string; tick: number; events: ReadonlyArray<{type: string; entityId?: string}> }
 | { ok: false; status: "rejected"; commandId: string; error: FailureCode };
export const inBounds = (world: World, point: Position) =>
 Number.isInteger(point.x) && Number.isInteger(point.y) && point.x >= 0 && point.y >= 0 && point.x < world.width && point.y < world.height;
