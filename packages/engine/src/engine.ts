import {expireEffects} from "../../systems/effects/src/manager.ts";
import {resolveAttributes} from "../../systems/effects/src/resolver.ts";
import {baseRegistry,resourcePreset} from "../../content/src/catalog.ts";
import {sceneryPreset} from "../../content/src/scenery.ts";
import {naturalSource} from "../../content/src/natural-sources.ts";
import {makeNaturalSource,advanceNaturalSources} from "../../systems/nature/src/index.ts";
import {canEnter,orthogonallyAdjacent,canPlaceFootprint} from "../../systems/collision/src/index.ts";
import {buildingBlueprint} from "../../content/src/buildings/registry.ts";
import {createConstructionSite,createCompletedBuilding,currentStage,materialsRemaining,hasMaterials,nearFootprint,acceptMaterial,applyConstructionWork,storageDefinition,storageFree} from "../../systems/construction/src/index.ts";
import {advanceNpcDecisions} from "../../systems/ai/src/index.ts";
import {advanceNeeds,eatApple,updateNeedEffects} from "../../systems/needs/src/index.ts";
import {TOOL_PRESETS,evaluateActionRisk} from "../../systems/risk/src/index.ts";
import {clearHouse,pruneBeds} from "../../systems/housing/src/index.ts";
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
export function applyCommand(world: World, command: Command,options:{internal?:boolean}={}): Result {
 if (world.id!==command.worldId || !command.commandId.trim()) return reject(command,"INVALID_PAYLOAD");
 if (!options.internal&&world.appliedCommands.includes(command.commandId)) return reject(command,"DUPLICATE_COMMAND");
 const specification=baseRegistry.actions.get(command.action);
 if(!specification)return reject(command,"INVALID_PAYLOAD");
 if(!specification.roles.includes(command.actorRole))return reject(command,"UNAUTHORIZED");
 const admin=command.actorRole==="admin";
 let eventTargetId=command.targetId;
 const additionalEvents:{type:string;entityId?:string}[]=[];
 let riskActor:Character|undefined;
 let riskActivity:"resource.gather:wood"|"resource.gather:stone"|"construction.work"|"resource.harvest"|undefined;
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
   const character:Character={kind:"character",id,name,position:{...command.position},health:100,energy:100,satiety:100,inventory:{},equipment:{},injuries:0,
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
 } else if(command.action==="construction.place"){
  if(!admin)return reject(command,"UNAUTHORIZED");
  const blueprintId=command.parameters?.blueprintId;
  const blueprint=typeof blueprintId==="string"?buildingBlueprint(blueprintId):undefined;
  if(!blueprint||!command.position)return reject(command,"INVALID_PAYLOAD");
  const mode=command.parameters?.mode??"site";
  if(mode!=="site"&&mode!=="completed")return reject(command,"INVALID_PAYLOAD");
  if(!inBounds(world,command.position)||!inBounds(world,{
   x:command.position.x+blueprint.footprint.width-1,y:command.position.y+blueprint.footprint.height-1
  }))return reject(command,"OUT_OF_BOUNDS");
  if(!canPlaceFootprint(world,command.position,blueprint.footprint.width,blueprint.footprint.height))return reject(command,"BLOCKED");
  const id="construction-"+command.commandId;eventTargetId=id;
  world.entities.push(mode==="completed"?
   createCompletedBuilding(id,command.position,blueprint,world.tick+1):createConstructionSite(id,command.position,blueprint));
  if(mode==="completed")additionalEvents.push({type:"building.completed",entityId:id});
 } else if(command.action==="construction.deliver"||command.action==="construction.admin_supply"||
           command.action==="construction.work"||command.action==="construction.admin_work"){
  const target=world.entities.find(e=>e.id===command.targetId);
  if(!target)return reject(command,"NOT_FOUND");
  if(target.kind!=="construction")return reject(command,"INVALID_TARGET");
  if(target.status!=="site")return reject(command,"ALREADY_COMPLETED");
  const debug=command.action.startsWith("construction.admin_");
  if(debug!==admin)return reject(command,"UNAUTHORIZED");
  const actor=debug?undefined:actorForCommand(world,command);
  if(!debug&&(!actor||!nearFootprint(actor.position,target)||actor.health<=0||actor.energy<=0))return reject(command,actor?"BLOCKED":"UNAUTHORIZED");
  if(command.action==="construction.deliver"||command.action==="construction.admin_supply"){
   const materialId=command.parameters?.materialId,amount=command.parameters?.quantity;
   const remaining=typeof materialId==="string"?materialsRemaining(target)[materialId]:undefined;
   if(typeof materialId!=="string"||typeof amount!=="number"||!Number.isSafeInteger(amount)||amount<1||remaining===undefined||amount>remaining)return reject(command,"INVALID_PAYLOAD");
   if(actor&&(actor.inventory?.[materialId]??0)<amount)return reject(command,"EXHAUSTED");
   if(!acceptMaterial(target,materialId,amount))return reject(command,"INVALID_PAYLOAD");
   if(actor){actor.inventory![materialId]-=amount;actor.energy=Math.max(0,actor.energy-1);}
   additionalEvents.push({type:"construction.material_delivered",entityId:target.id});
  } else {
   const stage=currentStage(target);
   if(!stage)return reject(command,"ALREADY_COMPLETED");
   if(!hasMaterials(target))return reject(command,"NOT_READY");
   const amount=debug?command.parameters?.workUnits:1;
   if(typeof amount!=="number"||!Number.isSafeInteger(amount)||amount<1||amount>Math.max(1,stage.workUnits-target.workDone))return reject(command,"INVALID_PAYLOAD");
   const result=applyConstructionWork(target,amount,world.tick+1);
   if(actor){actor.energy=Math.max(0,actor.energy-1);riskActor=actor;riskActivity="construction.work";}
   if(result.stageCompleted)additionalEvents.push({type:"construction.stage_completed",entityId:target.id});
   if(result.buildingCompleted)additionalEvents.push({type:"building.completed",entityId:target.id});
  }
 } else if(command.action==="storage.deposit"||command.action==="storage.withdraw"||command.action==="storage.admin_supply"){
  const target=world.entities.find(e=>e.id===command.targetId);
  if(!target)return reject(command,"NOT_FOUND");
  if(target.kind!=="construction")return reject(command,"INVALID_TARGET");
  const def=storageDefinition(target);
  if(!def)return reject(command,"NOT_READY");
  const debug=command.action==="storage.admin_supply";
  if(debug!==admin)return reject(command,"UNAUTHORIZED");
  const actor=debug?undefined:actorForCommand(world,command);
  if(!debug&&(!actor||actor.health<=0||actor.energy<=0||!nearFootprint(actor.position,target)))return reject(command,actor?"BLOCKED":"UNAUTHORIZED");
  const materialId=command.parameters?.materialId,quantity=command.parameters?.quantity;
  if(typeof materialId!=="string"||!def.accepted.includes(materialId)||
    typeof quantity!=="number"||!Number.isSafeInteger(quantity)||quantity<1)return reject(command,"INVALID_PAYLOAD");
  if(command.action==="storage.withdraw"){
   if((target.stock?.[materialId]??0)<quantity)return reject(command,"EXHAUSTED");
   if(!actor||MAX_CARRY_ITEMS-inventoryLoad(actor)<quantity)return reject(command,"INVENTORY_FULL");
   target.stock![materialId]-=quantity;
   actor.inventory??={};actor.inventory[materialId]=(actor.inventory[materialId]??0)+quantity;
  }else{
   if(storageFree(target)<quantity)return reject(command,"INVENTORY_FULL");
   if(actor&&(actor.inventory?.[materialId]??0)<quantity)return reject(command,"EXHAUSTED");
   target.stock??={};target.stock[materialId]=(target.stock[materialId]??0)+quantity;
   if(actor)actor.inventory![materialId]-=quantity;
  }
  if(actor)actor.energy=Math.max(0,actor.energy-1);
  additionalEvents.push({type:command.action==="storage.withdraw"?"storage.withdrawn":"storage.deposited",entityId:target.id});
 } else if(command.action==="resource.gather"){
  if(admin)return reject(command,"UNAUTHORIZED");
  const source=world.entities.find(e=>e.id===command.targetId);
  if(!source)return reject(command,"NOT_FOUND");
  if(source.kind!=="resource"||source.sourceId||!["wood","stone"].includes(source.resourceType))return reject(command,"INVALID_TARGET");
  const actor=actorForCommand(world,command);
  if(!actor)return reject(command,"UNAUTHORIZED");
  if(!orthogonallyAdjacent(actor.position,source.position)||actor.health<=0||actor.energy<=0)return reject(command,"BLOCKED");
  if(source.quantity<=0)return reject(command,"EXHAUSTED");
  const free=MAX_CARRY_ITEMS-inventoryLoad(actor);
  if(free<=0)return reject(command,"INVENTORY_FULL");
  const amount=Math.min(3,source.quantity,free);
  source.quantity-=amount;actor.inventory??={};
  actor.inventory[source.resourceType]=(actor.inventory[source.resourceType]??0)+amount;
  actor.energy=Math.max(0,actor.energy-1);
  riskActor=actor;riskActivity=source.resourceType==="wood"?"resource.gather:wood":"resource.gather:stone";
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
  riskActor=actor;riskActivity="resource.harvest";
 } else if(command.action==="construction.destroy"||command.action==="construction.remove"){
  if(!admin)return reject(command,"UNAUTHORIZED");
  const index=world.entities.findIndex(e=>e.id===command.targetId);
  if(index<0)return reject(command,"NOT_FOUND");
  const target=world.entities[index];
  if(target.kind!=="construction")return reject(command,"INVALID_TARGET");
  if(command.action==="construction.destroy"){
   if(target.status==="destroyed")return reject(command,"ALREADY_COMPLETED");
   clearHouse(world,target);
   target.status="destroyed";target.availability="unavailable";
   additionalEvents.push({type:"building.destroyed",entityId:target.id});
  }else{
   clearHouse(world,target);
   world.entities.splice(index,1);
   additionalEvents.push({type:"building.removed",entityId:target.id});
  }
 } else if(command.action==="npc.admin_equip"){
  if(!admin)return reject(command,"UNAUTHORIZED");
  const target=world.entities.find(e=>e.id===command.targetId);
  if(!target)return reject(command,"NOT_FOUND");
  if(target.kind!=="character")return reject(command,"INVALID_TARGET");
  const tool=command.parameters?.tool;
  if(tool!==null&&(typeof tool!=="string"||!Object.hasOwn(TOOL_PRESETS,tool)))return reject(command,"INVALID_PAYLOAD");
  target.equipment={...(tool?{tool}:{})};
  additionalEvents.push({type:"npc.equipment_changed",entityId:target.id});
 } else if(command.action==="npc.eat"){
  if(admin)return reject(command,"UNAUTHORIZED");
  const actor=actorForCommand(world,command);
  if(!actor||actor.id!==command.targetId)return reject(command,"UNAUTHORIZED");
  if(actor.health<=0)return reject(command,"BLOCKED");
  if((actor.satiety??100)>=100)return reject(command,"NOT_READY");
  if((actor.inventory?.apple??0)<1)return reject(command,"EXHAUSTED");
  if(!eatApple(actor))return reject(command,"NOT_READY");
  updateNeedEffects(actor,world.tick);
  additionalEvents.push({type:"npc.ate",entityId:actor.id});
 } else if(command.action==="entity.inspect"){
  if(!world.entities.some(e=>e.id===command.targetId))return reject(command,"NOT_FOUND");
  return {ok:true,status:"completed",commandId:command.commandId,tick:world.tick,events:[]};
 } else return reject(command,"INVALID_PAYLOAD");
 if(riskActor&&riskActivity&&evaluateActionRisk(riskActor,riskActivity,world.tick,command.commandId))
  additionalEvents.push({type:"npc.injured",entityId:riskActor.id});
 if(!options.internal){
  world.appliedCommands.push(command.commandId);
  // External actions retain legacy tick accounting. Autonomous NPC actions do not accelerate time.
  world.tick+=1;
 }
 const expired=options.internal?[]:world.entities.filter(e=>e.kind==="character").flatMap(e=>expireEffects(e,e.id,world.tick));
 return {ok:true,status:"completed",commandId:command.commandId,tick:world.tick,
  events:[{type:command.action,entityId:eventTargetId},...additionalEvents,...expired.map(e=>({type:e.type,entityId:e.targetId}))]};
}
/** The only clock progression of living sources. */
export function advanceTick(world:World){
 world.tick+=1;
 advanceNaturalSources(world);
 advanceNeeds(world);
 pruneBeds(world);
 advanceNpcDecisions(world,(cmd)=>applyCommand(world,cmd,{internal:true}));
 return world.entities.filter(e=>e.kind==="character").flatMap(e=>expireEffects(e,e.id,world.tick));
}
