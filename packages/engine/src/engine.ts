import {expireEffects} from "../../systems/effects/src/manager.ts";
import {resolveAttributes} from "../../systems/effects/src/resolver.ts";
import {baseRegistry,resourcePreset} from "../../content/src/catalog.ts";
import {sceneryPreset} from "../../content/src/scenery.ts";
import {naturalSource} from "../../content/src/natural-sources.ts";
import {foodItem} from "../../content/src/foods.ts";
import {makeZone,canCreateZone,canPlantAt,plantInZone} from "../../systems/farming/src/index.ts";
import {makeNaturalSource,advanceNaturalSources} from "../../systems/nature/src/index.ts";
import {canEnter,orthogonallyAdjacent,canPlaceFootprint} from "../../systems/collision/src/index.ts";
import {buildingBlueprint} from "../../content/src/buildings/registry.ts";
import {createConstructionSite,createCompletedBuilding,currentStage,materialsRemaining,hasMaterials,nearFootprint,acceptMaterial,applyConstructionWork,storageDefinition,storageFree} from "../../systems/construction/src/index.ts";
import {advanceNpcDecisions} from "../../systems/ai/src/index.ts";
import {advanceNeeds,eatFood,updateNeedEffects} from "../../systems/needs/src/index.ts";
import {TOOL_PRESETS,evaluateActionRisk,correctTool} from "../../systems/risk/src/index.ts";
import {clearHouse,pruneBeds,advanceResidences} from "../../systems/housing/src/index.ts";
import {generateCharacterProfile,generateStartingInventory} from "../../content/src/characters.ts";
import {advanceMortality,isCorpse,carriedCorpse,availableGraves,registerBurial} from "../../systems/mortality/src/index.ts";
import {inBounds} from "../../domain/src/contracts.ts";
import type {Command, World, Result, Character, Resource, Position} from "../../domain/src/contracts.ts";
import type {ActivityObserver} from "../../domain/src/activity.ts";
import {advanceLeaderDecisions} from "../../systems/leadership/src/index.ts";
import {orderProduction,productionDefinition,applyProductionWork} from "../../systems/production/src/index.ts";
import {recipeById} from "../../content/src/recipes.ts";
import {isToolItem} from "../../content/src/items.ts";
import {advanceHealth} from "../../systems/health/src/index.ts";

export function createWorld(id: string, width=64, height=48): World {
 if (!id.trim() || !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) throw new Error("Invalid world");
 return {id, width, height, tick:0, entities:[], appliedCommands:[]};
}
export const MAX_CARRY_ITEMS=12;
function rollDrop(world:World,command:Command,channel:string,min:number,max:number){let h=2166136261;for(const ch of [world.seed??world.id,world.tick,command.commandId,channel].join("|")){h=Math.imul(h^ch.charCodeAt(0),16777619);}return min+(h>>>0)%(max-min+1);}
function dropItem(world:World,position:Position,itemId:string,quantity:number){if(quantity<=0)return;const existing=world.entities.find(e=>e.kind==="item"&&e.itemId===itemId&&e.position.x===position.x&&e.position.y===position.y);if(existing?.kind==="item"){existing.quantity+=quantity;return;}world.entities.push({id:"drop:"+position.x+":"+position.y+":"+itemId,kind:"item",position:{...position},itemId,quantity,createdTick:world.tick});}
const reject = (command: Command, error: Extract<Result,{ok:false}>["error"]): Result =>
 ({ok:false,status:"rejected",commandId:command.commandId,error});
export const inventoryLoad=(actor:Character):number=>
 Object.values(actor.inventory??{}).reduce((total,n)=>total+(Number.isSafeInteger(n)&&n>0?n:0),0);
export function actorForCommand(world:World,command:Pick<Command,"actorRole"|"actorId">):Character|undefined {
 if(!command.actorId)return undefined;
 return world.entities.find((e):e is Character=>e.kind==="character" &&
  (command.actorRole==="npc"?e.id===command.actorId:e.ownerId===command.actorId));
}
export function applyCommand(world: World, command: Command,
 options:{internal?:boolean;onAction?:ActivityObserver}={}): Result {
 if (world.id!==command.worldId || !command.commandId.trim()) return reject(command,"INVALID_PAYLOAD");
 if (!options.internal&&world.appliedCommands.includes(command.commandId)) return reject(command,"DUPLICATE_COMMAND");
 const specification=baseRegistry.actions.get(command.action);
 if(!specification)return reject(command,"INVALID_PAYLOAD");
 if(!specification.roles.includes(command.actorRole))return reject(command,"UNAUTHORIZED");
 const admin=command.actorRole==="admin";
 let eventTargetId=command.targetId;
 const additionalEvents:{type:string;entityId?:string}[]=[];
 let riskActor:Character|undefined;
 let riskActivity:"resource.gather:wood"|"resource.gather:stone"|"resource.gather:iron_ore"|"resource.gather:copper_ore"|
 "construction.work"|"resource.harvest"|"production.work"|undefined;
 if(command.action==="npc.spawn"||command.action==="resource.spawn"||command.action==="obstacle.spawn"){
  if(!admin)return reject(command,"UNAUTHORIZED");
  if(!command.position||!inBounds(world,command.position))return reject(command,"OUT_OF_BOUNDS");
  if(!canEnter(world,command.position))return reject(command,"BLOCKED");
  const prefix=command.action==="npc.spawn"?"npc-":command.action==="obstacle.spawn"?"obstacle-":"resource-";
  const id=prefix+command.commandId;eventTargetId=id;
  if(command.action==="npc.spawn"){
   const name=command.parameters?.name;
   if(name!==undefined&&(typeof name!=="string"||!name.trim()||name.length>64))return reject(command,"INVALID_PAYLOAD");
   const profile=generateCharacterProfile(world.id,command.commandId,world.tick);
   const communityRole=command.parameters?.communityRole;
   if(communityRole!==undefined&&communityRole!=="leader")return reject(command,"INVALID_PAYLOAD");
   if(communityRole==="leader"&&world.entities.some(e=>e.kind==="character"&&e.health>0&&e.communityRole==="leader"))
    return reject(command,"BLOCKED");
   const ownerId=command.parameters?.ownerId;
   if(ownerId!==undefined&&(typeof ownerId!=="string"||!ownerId.trim()))return reject(command,"INVALID_PAYLOAD");
   const character:Character={kind:"character",id,name:typeof name==="string"?name:profile.name,
    traits:profile.traits,attributes:profile.attributes,
    ...(communityRole==="leader"?{communityRole:"leader" as const,leadership:{lastPlanTick:-1,lastReason:"Avaliando necessidades da comunidade"}}:{}),
    position:{...command.position},health:100,energy:100,satiety:100,inventory:typeof ownerId==="string"?{}:generateStartingInventory(world.id,command.commandId,world.tick,profile.traits,MAX_CARRY_ITEMS),equipment:{},injuries:0,
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
 } else if(command.action==="farming.zone.create"){
  if(!admin){
   const actor=actorForCommand(world,command);
   if(!options.internal||command.actorRole!=="npc"||!actor||actor.communityRole!=="leader"||actor.health<=0||actor.ownerId)return reject(command,"UNAUTHORIZED");
  }
  const sourceId=command.parameters?.sourceId,width=command.parameters?.width,height=command.parameters?.height;
  if(typeof sourceId!=="string"||!naturalSource(sourceId)||typeof width!=="number"||typeof height!=="number"||
    !Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>12||height>12||
    !command.position)return reject(command,"INVALID_PAYLOAD");
  if(!inBounds(world,command.position)||!inBounds(world,{x:command.position.x+width-1,y:command.position.y+height-1}))
   return reject(command,"OUT_OF_BOUNDS");
  if(!canCreateZone(world,sourceId,command.position,width,height))return reject(command,"BLOCKED");
  const id="zone-"+command.commandId;eventTargetId=id;
  world.entities.push(makeZone(id,sourceId,command.position,width,height));
 } else if(command.action==="farming.zone.remove"){
  if(!admin)return reject(command,"UNAUTHORIZED");
  const index=world.entities.findIndex(e=>e.id===command.targetId);
  if(index<0)return reject(command,"NOT_FOUND");
  const zone=world.entities[index];
  if(zone.kind!=="planting_zone")return reject(command,"INVALID_TARGET");
  world.entities.splice(index,1);
  for(const e of world.entities)if(e.kind==="resource"&&e.plantedInZoneId===zone.id)delete e.plantedInZoneId;
 } else if(command.action==="farming.plant"){
  if(admin)return reject(command,"UNAUTHORIZED");
  const zone=world.entities.find(e=>e.id===command.targetId);
  if(!zone)return reject(command,"NOT_FOUND");
  if(zone.kind!=="planting_zone")return reject(command,"INVALID_TARGET");
  const species=naturalSource(zone.sourceId),actor=actorForCommand(world,command);
  if(!actor)return reject(command,"UNAUTHORIZED");
  if(!species||!command.position)return reject(command,"INVALID_PAYLOAD");
  if(!inBounds(world,command.position))return reject(command,"OUT_OF_BOUNDS");
  if(!canPlantAt(world,zone,command.position)||!orthogonallyAdjacent(actor.position,command.position)||
   actor.health<=0||actor.energy<=0)return reject(command,"BLOCKED");
  if((actor.inventory?.[species.seedItem]??0)<1)return reject(command,"EXHAUSTED");
  actor.inventory![species.seedItem]--;
  actor.energy=Math.max(0,actor.energy-1);
  const id="plant-"+command.commandId;eventTargetId=id;
  world.entities.push(plantInZone(world,id,zone,command.position));
  additionalEvents.push({type:"farming.planted",entityId:id});
 } else if(command.action==="burial.pickup"){
  if(admin)return reject(command,"UNAUTHORIZED");
  const corpse=world.entities.find(e=>e.id===command.targetId);
  if(!corpse)return reject(command,"NOT_FOUND");
  if(!isCorpse(corpse)||corpse.bodyCarriedBy)return reject(command,"INVALID_TARGET");
  const actor=actorForCommand(world,command);
  if(!actor)return reject(command,"UNAUTHORIZED");
  if(actor.health<=0||actor.energy<=0||carriedCorpse(world,actor.id)||
    !(orthogonallyAdjacent(actor.position,corpse.position)||
      (actor.position.x===corpse.position.x&&actor.position.y===corpse.position.y)))
   return reject(command,"BLOCKED");
  corpse.deathTick??=world.tick;
  corpse.causeOfDeath??=(corpse.satiety??100)===0?"Inanição":"Ferimentos ou saúde esgotada";
  corpse.bodyCarriedBy=actor.id;
  corpse.position={...actor.position};
  actor.energy=Math.max(0,actor.energy-1);
  additionalEvents.push({type:"burial.body_collected",entityId:corpse.id});
 } else if(command.action==="burial.drop"){
  if(admin)return reject(command,"UNAUTHORIZED");
  const actor=actorForCommand(world,command);
  if(!actor)return reject(command,"UNAUTHORIZED");
  const corpse=carriedCorpse(world,actor.id);
  if(!corpse||corpse.id!==command.targetId)return reject(command,"NOT_READY");
  corpse.position={...actor.position};delete corpse.bodyCarriedBy;
  additionalEvents.push({type:"burial.body_released",entityId:corpse.id});
 } else if(command.action==="burial.inter"){
  if(admin)return reject(command,"UNAUTHORIZED");
  const cemetery=world.entities.find(e=>e.id===command.targetId);
  if(!cemetery)return reject(command,"NOT_FOUND");
  if(cemetery.kind!=="construction")return reject(command,"INVALID_TARGET");
  const actor=actorForCommand(world,command);
  if(!actor)return reject(command,"UNAUTHORIZED");
  if(actor.health<=0||actor.energy<=0||!nearFootprint(actor.position,cemetery))
   return reject(command,"BLOCKED");
  if(availableGraves(cemetery)<1)return reject(command,"NOT_READY");
  const corpse=carriedCorpse(world,actor.id);
  if(!corpse)return reject(command,"NOT_READY");
  if(!registerBurial(world,corpse,cemetery))return reject(command,"NOT_READY");
  actor.energy=Math.max(0,actor.energy-1);
  additionalEvents.push({type:"burial.interred",entityId:cemetery.id});
 } else if(command.action==="nature.cut"){
  if(admin)return reject(command,"UNAUTHORIZED");
  const index=world.entities.findIndex(e=>e.id===command.targetId);
  if(index<0)return reject(command,"NOT_FOUND");
  const tree=world.entities[index];
  if(tree.kind!=="resource"||tree.sourceId!=="apple_tree"||
   (tree.life?.stage!=="old"&&tree.life?.stage!=="dead"))return reject(command,"INVALID_TARGET");
  const actor=actorForCommand(world,command);
  if(!actor)return reject(command,"UNAUTHORIZED");
  if(!orthogonallyAdjacent(actor.position,tree.position)||actor.health<=0||actor.energy<=0)
   return reject(command,"BLOCKED");
  dropItem(world,actor.position,"wood",rollDrop(world,command,"cut",3,5));actor.energy=Math.max(0,actor.energy-1);
  world.entities.splice(index,1);
  riskActor=actor;riskActivity="resource.gather:wood";
  additionalEvents.push({type:"nature.tree_cut",entityId:tree.id});
 } else if(command.action==="construction.place"||command.action==="construction.propose"){
  const proposed=command.action==="construction.propose";
  if(proposed){
   if(admin)return reject(command,"UNAUTHORIZED");
   const leader=actorForCommand(world,command);
   if(!leader||leader.communityRole!=="leader"||leader.health<=0)return reject(command,"UNAUTHORIZED");
   if(world.entities.some(e=>e.kind==="construction"&&e.status==="site"))return reject(command,"BLOCKED");
  }else if(!admin)return reject(command,"UNAUTHORIZED");
  const blueprintId=command.parameters?.blueprintId;
  const blueprint=typeof blueprintId==="string"?buildingBlueprint(blueprintId):undefined;
  if(!blueprint||!command.position)return reject(command,"INVALID_PAYLOAD");
  const mode=command.parameters?.mode??"site";
  if((mode!=="site"&&mode!=="completed")||(proposed&&mode!=="site"))return reject(command,"INVALID_PAYLOAD");
  if(!inBounds(world,command.position)||!inBounds(world,{
   x:command.position.x+blueprint.footprint.width-1,y:command.position.y+blueprint.footprint.height-1
  }))return reject(command,"OUT_OF_BOUNDS");
  if(!canPlaceFootprint(world,command.position,blueprint.footprint.width,blueprint.footprint.height)||
   world.entities.some(e=>e.kind==="planting_zone"&&
    command.position!.x<e.position.x+e.footprint.width&&
    command.position!.x+blueprint.footprint.width>e.position.x&&
    command.position!.y<e.position.y+e.footprint.height&&
    command.position!.y+blueprint.footprint.height>e.position.y))
   return reject(command,"BLOCKED");
  const id="construction-"+command.commandId;eventTargetId=id;
  world.entities.push(mode==="completed"?
   createCompletedBuilding(id,command.position,blueprint,world.tick+1):createConstructionSite(id,command.position,blueprint));
  if(mode==="completed")additionalEvents.push({type:"building.completed",entityId:id});
  if(proposed)additionalEvents.push({type:"community.construction_planned",entityId:id});
 } else if(command.action==="production.order"){
  const target=world.entities.find(e=>e.id===command.targetId);
  if(!target)return reject(command,"NOT_FOUND");
  if(target.kind!=="construction"||!productionDefinition(target))return reject(command,"NOT_READY");
  if(!admin){
   const leader=actorForCommand(world,command);
   if(!leader||leader.health<=0||leader.communityRole!=="leader")return reject(command,"UNAUTHORIZED");
  }
  const recipeId=command.parameters?.recipeId,quantity=command.parameters?.quantity??1;
  if(typeof recipeId!=="string"||!recipeById(recipeId)||typeof quantity!=="number"||
   !orderProduction(target,recipeId,quantity))return reject(command,"INVALID_PAYLOAD");
  additionalEvents.push({type:"production.order_created",entityId:target.id});
 } else if(command.action==="production.work"){
  if(admin)return reject(command,"UNAUTHORIZED");
  const target=world.entities.find(e=>e.id===command.targetId);
  if(!target)return reject(command,"NOT_FOUND");
  if(target.kind!=="construction"||!productionDefinition(target))return reject(command,"NOT_READY");
  const actor=actorForCommand(world,command);
  if(!actor)return reject(command,"UNAUTHORIZED");
  if(actor.health<=0||actor.energy<=0||!nearFootprint(actor.position,target))return reject(command,"BLOCKED");
  const output=applyProductionWork(target,correctTool(actor,"production.work")?2:1);
  if(!output)return reject(command,"NOT_READY");
  actor.energy=Math.max(0,actor.energy-1);
  riskActor=actor;riskActivity="production.work";
  if(output.completed)additionalEvents.push({type:"production.batch_finished",entityId:target.id});
 } else if(command.action==="npc.equip"){
  if(admin)return reject(command,"UNAUTHORIZED");
  const actor=actorForCommand(world,command);
  if(!actor||actor.id!==command.targetId)return reject(command,"UNAUTHORIZED");
  if(actor.health<=0)return reject(command,"BLOCKED");
  const tool=command.parameters?.tool;
  if(typeof tool!=="string"||!isToolItem(tool))return reject(command,"INVALID_PAYLOAD");
  if(actor.equipment?.tool===tool)return reject(command,"NOT_READY");
  if((actor.inventory?.[tool]??0)<1)return reject(command,"EXHAUSTED");
  actor.inventory![tool]--;
  if(actor.equipment?.tool)actor.inventory![actor.equipment.tool]=(actor.inventory![actor.equipment.tool]??0)+1;
  actor.equipment={tool};
  additionalEvents.push({type:"npc.tool_equipped",entityId:actor.id});
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
   const amount=debug?command.parameters?.workUnits:Math.min(stage.workUnits-target.workDone,actor&&correctTool(actor,"construction.work")?2:1);
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
 } else if(command.action==="item.pickup"){
  if(admin)return reject(command,"UNAUTHORIZED");
  const item=world.entities.find(e=>e.id===command.targetId);
  if(!item)return reject(command,"NOT_FOUND");
  if(item.kind!=="item")return reject(command,"INVALID_TARGET");
  const actor=actorForCommand(world,command);
  if(!actor)return reject(command,"UNAUTHORIZED");
  if(actor.health<=0||actor.energy<=0||Math.abs(actor.position.x-item.position.x)+Math.abs(actor.position.y-item.position.y)>1)return reject(command,"BLOCKED");
  const amount=Math.min(item.quantity,MAX_CARRY_ITEMS-inventoryLoad(actor));
  if(amount<=0)return reject(command,"INVENTORY_FULL");
  actor.inventory??={};actor.inventory[item.itemId]=(actor.inventory[item.itemId]??0)+amount;item.quantity-=amount;
  if(item.quantity===0)world.entities.splice(world.entities.indexOf(item),1);
 } else if(command.action==="resource.gather"){
  if(admin)return reject(command,"UNAUTHORIZED");
  const source=world.entities.find(e=>e.id===command.targetId);
  if(!source)return reject(command,"NOT_FOUND");
  if(source.kind!=="resource"||source.sourceId||!["wood","stone","iron_ore","copper_ore"].includes(source.resourceType))return reject(command,"INVALID_TARGET");
  const actor=actorForCommand(world,command);
  if(!actor)return reject(command,"UNAUTHORIZED");
  if(!orthogonallyAdjacent(actor.position,source.position)||actor.health<=0||actor.energy<=0)return reject(command,"BLOCKED");
  if(source.quantity<=0)return reject(command,"EXHAUSTED");
  const amount=Math.min(source.quantity,rollDrop(world,command,"resource",1,3)+(correctTool(actor,("resource.gather:"+source.resourceType) as any)?1:0));
  source.quantity-=amount;dropItem(world,actor.position,source.resourceType,amount);
  actor.energy=Math.max(0,actor.energy-1);
  riskActor=actor;riskActivity=("resource.gather:"+source.resourceType) as typeof riskActivity;
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
  for(const body of world.entities)if(body.kind==="character"&&body.bodyCarriedBy===character.id)
   body.position={...character.position};
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
  const take=Math.min(source.quantity,rollDrop(world,command,"food",def.drop.min,def.drop.max));
  source.quantity-=take;
  dropItem(world,actor.position,def.productId,take);
  dropItem(world,actor.position,def.seedItem,rollDrop(world,command,"seed",def.drop.seedMin,def.drop.seedMax));
  actor.energy=Math.max(0,actor.energy-1);
  additionalEvents.push({type:"farming.seeds_collected",entityId:source.id});
  // Vegetables are single-harvest plants. Their plot becomes free immediately after harvest.
  if(def.growthMode==="single_harvest"&&source.quantity===0)
   world.entities.splice(world.entities.indexOf(source),1);
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
  const itemId=command.parameters?.itemId??"apple";
  if(typeof itemId!=="string"||!foodItem(itemId))return reject(command,"INVALID_PAYLOAD");
  if((actor.inventory?.[itemId]??0)<1)return reject(command,"EXHAUSTED");
  if(!eatFood(actor,itemId))return reject(command,"NOT_READY");
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
 advanceMortality(world);
 const expired=options.internal?[]:world.entities.filter(e=>e.kind==="character").flatMap(e=>expireEffects(e,e.id,world.tick));
 const success:Extract<Result,{ok:true}>={ok:true,status:"completed",commandId:command.commandId,tick:world.tick,
  events:[{type:command.action,entityId:eventTargetId},...additionalEvents,...expired.map(e=>({type:e.type,entityId:e.targetId}))]};
 options.onAction?.({tick:world.tick,commandId:command.commandId,action:command.action,actorRole:command.actorRole,
  ...(command.actorId?{actorId:command.actorId}:{}),
  ...(eventTargetId?{targetId:eventTargetId}:{}),
  ...(command.position?{position:{...command.position}}:{}),
  ...(command.parameters?{parameters:{...command.parameters}}:{}),events:success.events});
 return success;
}
/** The only clock progression of living sources. */
export function advanceTick(world:World,onAction?:ActivityObserver){
 world.tick+=1;
 advanceNaturalSources(world);
 advanceNeeds(world);
 advanceHealth(world);
 advanceMortality(world);
 pruneBeds(world);advanceResidences(world);
 advanceNpcDecisions(world,(cmd)=>applyCommand(world,cmd,{internal:true,onAction}));
 advanceLeaderDecisions(world,(cmd)=>applyCommand(world,cmd,{internal:true,onAction}));
 advanceMortality(world);
 return world.entities.filter(e=>e.kind==="character").flatMap(e=>expireEffects(e,e.id,world.tick));
}
