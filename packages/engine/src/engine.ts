import {expireEffects} from "../../systems/effects/src/manager.ts";
import {resolveAttributes} from "../../systems/effects/src/resolver.ts";
import {baseRegistry,resourcePreset} from "../../content/src/catalog.ts";
import {inBounds} from "../../domain/src/contracts.ts";
import type {Command, World, Result, Character, Resource, Position} from "../../domain/src/contracts.ts";

export function createWorld(id: string, width=64, height=48): World {
 if (!id.trim() || !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) throw new Error("Invalid world");
 return {id, width, height, tick:0, entities:[], appliedCommands:[]};
}
const reject = (command: Command, error: Extract<Result,{ok:false}>["error"]): Result =>
 ({ok:false,status:"rejected",commandId:command.commandId,error});
export function applyCommand(world: World, command: Command): Result {
 if (world.id!==command.worldId || !command.commandId.trim()) return reject(command,"INVALID_PAYLOAD");
 if (world.appliedCommands.includes(command.commandId)) return reject(command,"DUPLICATE_COMMAND");
 const specification=baseRegistry.actions.get(command.action);
 if(!specification)return reject(command,"INVALID_PAYLOAD");
 if(!specification.roles.includes(command.actorRole))return reject(command,"UNAUTHORIZED");
 const admin = command.actorRole==="admin";
 if (command.action==="npc.spawn" || command.action==="resource.spawn"){
  if (!admin) return reject(command,"UNAUTHORIZED");
  if (!command.position || !inBounds(world,command.position)) return reject(command,"OUT_OF_BOUNDS");
  const id = command.action==="npc.spawn"?"npc-"+command.commandId:"resource-"+command.commandId;
  if (command.action==="npc.spawn"){
   const name = command.parameters?.name;
   if (typeof name!=="string" || !name.trim() || name.length>64) return reject(command,"INVALID_PAYLOAD");
   const ownerId=command.parameters?.ownerId;
   if(ownerId!==undefined && (typeof ownerId!=="string" || !ownerId.trim()))return reject(command,"INVALID_PAYLOAD");
   const character: Character={kind:"character",id,name,position:{...command.position},health:100,energy:100,...(typeof ownerId==="string"?{ownerId}:{})};
   world.entities.push(character);
  } else {
   const type=command.parameters?.resourceType, quantity=command.parameters?.quantity;
   if(typeof type!=="string" || !resourcePreset(type) || typeof quantity!=="number" || !Number.isSafeInteger(quantity) || quantity<0) return reject(command,"INVALID_PAYLOAD");
   const resource:Resource={kind:"resource",id,resourceType:type,position:{...command.position},quantity,maximum:quantity};
   world.entities.push(resource);
  }
 } else if (command.action==="movement.move"){
  if(command.actorRole==="admin")return reject(command,"UNAUTHORIZED");
  const character=world.entities.find(e=>e.id===command.targetId);
  if(!character)return reject(command,"NOT_FOUND");
  if(character.kind!=="character")return reject(command,"INVALID_TARGET");
  if(!command.actorId || (command.actorRole==="npc" ? command.actorId!==character.id : !character.ownerId || character.ownerId!==command.actorId))return reject(command,"UNAUTHORIZED");
  if(!command.position || !inBounds(world,command.position))return reject(command,"OUT_OF_BOUNDS");
  if(resolveAttributes({...character,attributes:{...character.attributes,energy:character.energy,health:character.health}},world.tick).values.energy<=0 || Math.abs(character.position.x-command.position.x)+Math.abs(character.position.y-command.position.y)!==1)return reject(command,"BLOCKED");
  // Single orthogonal tile per command. No pathfinding or timed movement in this foundational slice.
  character.position={...command.position};
  character.energy=Math.max(0,character.energy-1);
 } else if (command.action==="entity.inspect"){
  if (!world.entities.some(e=>e.id===command.targetId))return reject(command,"NOT_FOUND");
  // Inspection is read-only: do not advance world tick or create an event.
  return {ok:true,status:"completed",commandId:command.commandId,tick:world.tick,events:[]};
 } else return reject(command,"INVALID_PAYLOAD");
 world.appliedCommands.push(command.commandId);
 world.tick+=1;
 const expired=world.entities.filter(e=>e.kind==="character").flatMap(e=>expireEffects(e,e.id,world.tick));
 // Effect expiry emits event *intents*. The reproduction subsystem must validate and consume birth_due.
 return {ok:true,status:"completed",commandId:command.commandId,tick:world.tick,events:[{type:command.action,entityId:command.targetId??world.entities.at(-1)?.id},...expired.map(e=>({type:e.type,entityId:e.targetId}))]};
}
