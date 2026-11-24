export type Role = "player" | "npc" | "admin";
export type EntityKind = "character" | "resource" | "obstacle" | "construction";
export type ActionId = "construction.upgrade" | "construction.upgrade_cancel" | "storage.temporary.create" | "storage.temporary.remove" | "item.drop" | "mine.extract" | "item.pickup" | "entity.inspect" | "movement.move" | "npc.spawn" | "resource.spawn" | "resource.harvest" | "obstacle.spawn" | "construction.place" | "construction.deliver" | "construction.work" | "construction.admin_supply" | "construction.admin_work" | "resource.gather" | "storage.deposit" | "storage.withdraw" | "storage.admin_supply" | "construction.remove" | "construction.destroy" | "npc.admin_equip" | "npc.eat" | "farming.zone.create" | "farming.plant" | "nature.cut" | "burial.pickup" | "burial.inter" | "burial.drop" | "construction.propose" | "production.order" | "production.work" | "npc.equip";
export type FailureCode = "UNAUTHORIZED" | "NOT_FOUND" | "INVALID_TARGET" | "INVALID_PAYLOAD" | "OUT_OF_BOUNDS" | "BLOCKED" | "DUPLICATE_COMMAND" | "EXHAUSTED" | "INVENTORY_FULL" | "NOT_READY" | "ALREADY_COMPLETED";
export interface Position { x: number; y: number }
/** Visual record of an accepted cell move, not a reservation or future gameplay action. */
export interface MovementSegment { from:Position; to:Position; startTick:number; endTick:number }
import type {ActiveEffect,AttributeId} from "./effects.ts";
export type NaturalStage = "seedling" | "young" | "mature" | "old" | "dead";
export type Inventory = Record<string,number>;
export interface Character { id: string; kind: "character"; name: string; position: Position; health: number; energy: number; ownerId?: string; inventory?: Inventory; ai?:NpcDecisionState; attributes?: Partial<Record<AttributeId,number>>; effects?: ActiveEffect[];
 /** Logical indoor occupancy; exterior position is reserved for exit. */
 sleepingInId?:string;
 homeId?:string; satiety?:number; equipment?:{tool?:string}; injuries?:number;
 nextMoveTick?:number; movementSegment?:MovementSegment;
 traits?:string[]; deathTick?:number; causeOfDeath?:string; bodyCarriedBy?:string;
 communityRole?:"leader"; leadership?:{lastPlanTick:number;lastBlueprintId?:string;lastReason:string;lastSiteId?:string;
 lastProductionTick?:number;lastRecipeId?:string;productionReason?:string}; }
/** A bounded planting intent; no inventory or physical occupancy is reserved. */
export interface PlantingCommitment {zoneId:string;position:Position;startedTick:number;lastProgressTick:number}
export interface NpcDecisionState {
 activity:string|null; reason:string; targetId?:string; route:Position[];
 lastDecisionTick:number; history:Array<{tick:number;activity:string;reason:string;targetId?:string}>;
 resting?:boolean;
 plantingCommitment?:PlantingCommitment;
}
export interface NaturalLife { ageTicks:number; stage:NaturalStage; health:number; productionProgress:number }
export interface Resource { id: string; kind: "resource"; resourceType: string; position: Position; quantity: number; maximum: number; sourceId?:string; productId?:string; life?:NaturalLife; plantedInZoneId?:string }
export interface FarmingZone { id:string; kind:"planting_zone"; sourceId:string; position:Position; footprint:{width:number;height:number} }
export interface Obstacle { id:string; kind:"obstacle"; obstacleType:string; position:Position; blocksMovement:boolean }
export interface Construction {
 id:string; kind:"construction"; blueprintId:string; blueprintVersion:number;
 position:Position; footprint:{width:number;height:number};
 status:"site"|"completed"|"destroyed"; availability:"unavailable"|"available";
 stageIndex:number; delivered:Inventory; workDone:number; completedTick?:number;
 /** Absent level means legacy level 1; active improvement retains current capabilities. */
 level?:number; upgrade?:{targetLevel:number;startedTick:number};
 residents?:string[]; mineRemaining?:Inventory; lastMiningTick?:number; stock?:Inventory; bedReservations?:Record<string,{expiresTick:number}>;
 productionOrders?:Array<{recipeId:string;quantity:number;workDone:number}>;
 burials?:{npcId:string;name:string;deathTick:number;burialTick:number;cause:string}[];
}
export interface GroundItem {id:string;kind:"item";position:Position;itemId:string;quantity:number;createdTick:number}
export type Entity = GroundItem | Character | Resource | Obstacle | Construction | FarmingZone;
export interface World { id: string; tick: number; width: number; height: number; entities: Entity[]; appliedCommands: string[]; seed?:string }
export interface Command { commandId: string; worldId: string; actorRole: Role; actorId?: string; action: ActionId; targetId?: string; position?: Position; parameters?: Record<string, unknown> }
export type Result =
 | { ok: true; status: "completed"; commandId: string; tick: number; events: ReadonlyArray<{type: string; entityId?: string}> }
 | { ok: false; status: "rejected"; commandId: string; error: FailureCode };
export const inBounds = (world: World, point: Position) =>
 Number.isInteger(point.x) && Number.isInteger(point.y) && point.x >= 0 && point.y >= 0 && point.x < world.width && point.y < world.height;
