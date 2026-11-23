import {expireEffects} from "../../systems/effects/src/manager.ts";
import {resolveAttributes} from "../../systems/effects/src/resolver.ts";
import {baseRegistry,resourcePreset} from "../../content/src/catalog.ts";
import {sceneryPreset} from "../../content/src/scenery.ts";
import {naturalSource} from "../../content/src/natural-sources.ts";
import {makeNaturalSource,advanceNaturalSources} from "../../systems/nature/src/index.ts";
import {canEnter,orthogonallyAdjacent} from "../../systems/collision/src/index.ts";
import {inBounds} from "../../domain/src/contracts.ts";
import type {Command, World, Result, Character, Resource, Position} from "../../domain/src/contracts.ts";

export function createWorld(id: string, width=64, height=48): World {
 if (!id.trim() || !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) throw new Error("Invalid world");
 return {id, width, height, tick:0, entities:[], appliedCommands:[]};
}
export const MAX_CARRY_ITEMS=12;
const reject = (command: Command, error: Extract<Result,{ok:false}>["error"]): Result =>
 ({ok:false,status:"rejected",commandId:command.commandId,error});
export const inventoryLoad=(actor:Character):number=>
 Object.values(actor.inventory??{}).reduce((total,n)=>total+(Number.isSafeInteger(n)&&n>0?n:0),0);
export function actorForCommand(world:World,command:Pick<Command,"actorRole"|"actorId">):Character|undefined {
 if(!command.actorId)return undefined;
 return world.entities.find((e):e is Character=>e.kind==="character" &&
  (command.actorRole==="npc"?e.id===command.actorId:e.ownerId===command.actorId));
}
export function applyCommand(world: World, command: Command): Result {
 if (world.id!==command.worldId || !command.commandId.trim()) return reject(command,"INVALID_PAYLOAD");
 if (world.appliedCommands.includes(command.commandId)) return reject(command,"DUPLICATE_COMMAND");
 const specification=baseRegistry.actions.get(command.action);
 if(!specification)return reject(command,"INVALID_PAYLOAD");
 if(!specification.roles.includes(command.actorRole))return reject(command,"UNAUTHORIZED");
 const admin=command.actorRole==="admin";
 let eventTargetId=command.targetId;
 if(command.action==="npc.spawn"||command.action==="resource.spawn"||command.action==="obstacle.spawn"){
  if(!admin)return reject(command,"UNAUTHORIZED");
  if(!command.position||!inBounds(world,command.position))return reject(command,"OUT_OF_BOUNDS");
  if(!canEnter(world,command.position))return reject(command,"BLOCKED");
  const prefix=command.action==="npc.spawn"?"npc-":command.action==="obstacle.spawn"?"obstacle-":"resource-";
  const id=prefix+command.commandId;eventTargetId=id;
  if(command.action==="npc.spawn"){
   const name=command.parameters?.name;
   if(typeof name!=="string"||!name.trim()||name.length>64)return reject(command,"INVALID_PAYLOAD");
   const ownerId=command.parameters?.ownerId;
   if(ownerId!==undefined&&(typeof ownerId!=="string"||!ownerId.trim()))return reject(command,"INVALID_PAYLOAD");
   const character:Character={kind:"character",id,name,position:{...command.position},health:100,energy:100,inventory:{},
    ...(typeof ownerId==="string"?{ownerId}:{})};
   world.entities.push(character);
  } else if(command.action==="obstacle.spawn"){
   const kind=command.parameters?.obstacleType;
   if(typeof kind!=="string")return reject(command,"INVALID_PAYLOAD");
   const def=sceneryPreset(kind);
   if(!def)return reject(command,"INVALID_PAYLOAD");
   world.entities.push({id,kind:"obstacle",obstacleType:def.id,position:{...command.position},blocksMovement:def.blocksMovement});
  } else {
   const type=command.parameters?.resourceType,quantity=command.parameters?.quantity;
   if(typeof type!=="string"||!resourcePreset(type)||typeof quantity!=="number"||!Number.isSafeInteger(quantity)||quantity<0)return reject(command,"INVALID_PAYLOAD");
   if(type==="food"){
    const sourceId=command.parameters?.sourceId??"apple_tree";
    const age=command.parameters?.ageTicks??0;
    const def=typeof sourceId==="string"?naturalSource(sourceId):undefined;
    if(!def||def.resourceType!==type||!Number.isSafeInteger(age)||typeof age!=="number"||age<0||age>def.stages.dead||quantity>def.production.capacity)return reject(command,"INVALID_PAYLOAD");
    world.entities.push(makeNaturalSource(id,command.position,sourceId as string,age as number,quantity));
   } else {
    const resource:Resource={kind:"resource",id,resourceType:type,position:{...command.position},quantity,maximum:quantity};
    world.entities.push(resource);
   }
  }
 } else if(command.action==="movement.move"){
  if(admin)return reject(command,"UNAUTHORIZED");
  const character=world.entities.find(e=>e.id===command.targetId);
  if(!character)return reject(command,"NOT_FOUND");
  if(character.kind!=="character")return reject(command,"INVALID_TARGET");
  const actor=actorForCommand(world,command);
  if(!actor||actor.id!==character.id)return reject(command,"UNAUTHORIZED");
  if(!command.position||!inBounds(world,command.position))return reject(command,"OUT_OF_BOUNDS");
  if(character.health<=0||resolveAttributes({...character,attributes:{...character.attributes,energy:character.energy,health:character.health}},world.tick).values.energy<=0 ||
    !orthogonallyAdjacent(character.position,command.position)||!canEnter(world,command.position,character.id))return reject(command,"BLOCKED");
  character.position={...command.position};character.energy=Math.max(0,character.energy-1);
 } else if(command.action==="resource.harvest"){
  if(admin)return reject(command,"UNAUTHORIZED");
  const source=world.entities.find(e=>e.id===command.targetId);
  if(!source)return reject(command,"NOT_FOUND");
  if(source.kind!=="resource"||!source.sourceId||!source.life)return reject(command,"INVALID_TARGET");
  const def=naturalSource(source.sourceId);
  if(!def)return reject(command,"INVALID_TARGET");
  const actor=actorForCommand(world,command);
  if(!actor)return reject(command,"UNAUTHORIZED");
  if(!orthogonallyAdjacent(actor.position,source.position)||actor.health<=0||actor.energy<=0)return reject(command,"BLOCKED");
  if(source.life.stage==="dead"||source.quantity<=0)return reject(command,"EXHAUSTED");
  const free=MAX_CARRY_ITEMS-inventoryLoad(actor);
  if(free<=0)return reject(command,"INVENTORY_FULL");
  const take=Math.min(def.production.harvestBatch,source.quantity,free);
  source.quantity-=take;
  actor.inventory??={};actor.inventory[def.productId]=(actor.inventory[def.productId]??0)+take;
  actor.energy=Math.max(0,actor.energy-1);
 } else if(command.action==="entity.inspect"){
  if(!world.entities.some(e=>e.id===command.targetId))return reject(command,"NOT_FOUND");
  return {ok:true,status:"completed",commandId:command.commandId,tick:world.tick,events:[]};
 } else return reject(command,"INVALID_PAYLOAD");
 world.appliedCommands.push(command.commandId);
 // Legacy immediate command tick remains technical debt. Nature only advances via advanceTick.
 world.tick+=1;
 const expired=world.entities.filter(e=>e.kind==="character").flatMap(e=>expireEffects(e,e.id,world.tick));
 return {ok:true,status:"completed",commandId:command.commandId,tick:world.tick,
  events:[{type:command.action,entityId:eventTargetId},...expired.map(e=>({type:e.type,entityId:e.targetId}))]};
}
/** The only clock progression of living sources. */
export function advanceTick(world:World){
 world.tick+=1;
 advanceNaturalSources(world);
 return world.entities.filter(e=>e.kind==="character").flatMap(e=>expireEffects(e,e.id,world.tick));
}
