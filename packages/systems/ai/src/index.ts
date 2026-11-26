import {soilAt} from "../../../content/src/soil.js";
import type {World,Character,Entity,Resource,Construction,Command,Result,Position} from "../../../domain/src/contracts.ts";
import {canEnter,blockingEntity} from "../../collision/src/index.ts";
import {routeToEntity,routeCost} from "../../pathfinding/src/index.ts";
import {materialsRemaining,hasMaterials,storageDefinition,storageFree} from "../../construction/src/index.ts";
import {bedsIn,reservationCount,reserveBed,reservedHouse,releaseBed,enterHouse,exitHouse,sleepRecovery} from "../../housing/src/index.ts";
import {EAT_THRESHOLD} from "../../needs/src/index.ts";
import {FOOD_ITEMS} from "../../../content/src/foods.ts";
import {naturalSource} from "../../../content/src/natural-sources.ts";
import {availablePlots} from "../../farming/src/index.ts";
import type {FarmingZone} from "../../../domain/src/contracts.ts";
import {resolveAttributes} from "../../effects/src/resolver.ts";
import {visibleCorpses,carriedCorpse,availableGraves} from "../../mortality/src/index.ts";
import {affinityFor} from "../../../content/src/characters.ts";
import type {WorkDomain} from "../../../content/src/characters.ts";
import {activeOrder,productionDefinition,stockMissing,canWorkProduction} from "../../production/src/index.ts";
import {RECIPES} from "../../../content/src/recipes.ts";
import {TEMPORARY_STORAGE,canCreateTemporaryStorage,isTemporaryStorage} from "../../storage/src/temporary.ts";
import {ITEMS} from "../../../content/src/items.ts";
import {activeHaulingClaim,haulingAvailable,isHaulingAction} from "./hauling-claims.ts";

export const NPC_ACTION_INTERVAL=3;
export const NPC_REST_THRESHOLD=20;
export const NPC_REST_RECOVER_TO=80;
export const NPC_REST_GAIN=4; // resting outside a house, tuned by endurance; beds recover faster
const CARRY_LIMIT=12;
const FOOD_RESERVE_SATIETY=35;
type ActionHandler=(command:Command)=>Result;
type Task={
 target:Entity; route:Position[]; activity:string; reason:string;
 action:Command["action"]; parameters?:Record<string,unknown>; position?:Position; targetId?:string;
 domain?:WorkDomain; extractionPickup?:boolean; constructionDestinationId?:string
};
const load=(npc:Character)=>Object.values(npc.inventory??{}).reduce((total,value)=>total+Math.max(0,value),0);
const resources=(world:World):Resource[]=>
 world.entities.filter((e):e is Resource=>e.kind==="resource"&&e.quantity>0);
const depots=(world:World):Construction[]=>
 world.entities.filter((e):e is Construction=>e.kind==="construction"&&!!storageDefinition(e));
const sites=(world:World):Construction[]=>
 world.entities.filter((e):e is Construction=>e.kind==="construction"&&(e.status==="site"||!!e.upgrade));

function selectTask(world:World,npc:Character,targets:Entity[],activity:string,reason:string,
 action:Command["action"],parameters?:(e:Entity)=>Record<string,unknown>|undefined):Task|null {
 const reachable=targets.map(target=>{
  let params=parameters?.(target);
  if(isHaulingAction(action)&&target.kind==="construction"&&typeof params?.materialId==="string"&&typeof params.quantity==="number"){
   const urgent=npc.health<=35||npc.energy<=NPC_REST_THRESHOLD||(npc.satiety??100)<=EAT_THRESHOLD;
   const quantity=urgent?params.quantity:Math.min(params.quantity,haulingAvailable(world,npc,target,action,params.materialId));
   if(quantity<=0)return null;
   params={...params,quantity};
  }
  const route=routeToEntity(world,npc.position,target,npc.id,action==="nature.cut");
  return route?{target,route,parameters:params}:null;
 }).filter((item):item is NonNullable<typeof item>=>!!item);
 reachable.sort((a,b)=>routeCost(world,a.route,npc.id)-routeCost(world,b.route,npc.id)||a.target.id.localeCompare(b.target.id));
 const chosen=reachable[0];
 return chosen?{...chosen,activity,reason,action}:null;
}
const acceptedBy=(depot:Construction,item:string):boolean=>!!storageDefinition(depot)?.accepted.includes(item);
const stocked=(depot:Construction,item:string):number=>depot.stock?.[item]??0;
function reachablePlots(world:World,npc:Character,zone:FarmingZone,respectClaims=true){
 return availablePlots(world,zone).filter(position=>!respectClaims||!reservedPlot(world,npc,zone,position)).map(position=>{
  const target:Resource={id:zone.id+":plot:"+position.x+":"+position.y,kind:"resource",
   resourceType:"food",position,quantity:0,maximum:0};
  const route=routeToEntity(world,npc.position,target,npc.id);
  return route?{position,route,target}:null;
 }).filter((x):x is {position:Position;route:Position[];target:Resource}=>!!x)
 .sort((a,b)=>routeCost(world,a.route,npc.id)-routeCost(world,b.route,npc.id)+(soilAt(world,b.position.x,b.position.y).rate-soilAt(world,a.position.x,a.position.y).rate)*.06||a.position.y-b.position.y||a.position.x-b.position.x);
}
// Commit only to a concrete planting cell; survival and urgent deliveries retain priority.
const PLANTING_STALL_TICKS=24;
function reservedPlot(world:World,npc:Character,zone:FarmingZone,position:Position):boolean{
 return world.entities.some(e=>e.kind==="character"&&e.id!==npc.id&&e.health>0&&
  e.ai?.plantingCommitment?.zoneId===zone.id&&
  e.ai.plantingCommitment.position.x===position.x&&e.ai.plantingCommitment.position.y===position.y&&
  world.tick-e.ai.plantingCommitment.lastProgressTick<PLANTING_STALL_TICKS);
}
function committedPlanting(world:World,npc:Character):Task|null{
 const intent=npc.ai?.plantingCommitment;
 if(!intent)return null;
 const zone=world.entities.find((e):e is FarmingZone=>e.kind==="planting_zone"&&e.id===intent.zoneId);
 const species=zone&&naturalSource(zone.sourceId);
 if(zone&&species&&(npc.inventory?.[species.seedItem]??0)>0&&
   world.tick-intent.lastProgressTick<PLANTING_STALL_TICKS){
  const choice=reachablePlots(world,npc,zone).find(p=>p.position.x===intent.position.x&&p.position.y===intent.position.y);
  if(choice)return {...choice,targetId:zone.id,activity:"Plantando",
   reason:"Concluir plantio de "+species.label+" no lote escolhido",action:"farming.plant",domain:"farming"};
 }
 delete npc.ai!.plantingCommitment;
 return null;
}
/** Farming tasks require a reachable plot before procuring seeds. */
function plantingTask(world:World,npc:Character):Task|null {
 const zones=world.entities.filter((e):e is FarmingZone=>e.kind==="planting_zone");
 const free=CARRY_LIMIT-load(npc),warehouses=depots(world);
 for(const zone of zones){
  const species=naturalSource(zone.sourceId);
  if(!species)continue;
  const choices=reachablePlots(world,npc,zone);
  if(!choices.length){
   const deadTrees=world.entities.filter((e):e is Resource=>e.kind==="resource"&&
    e.plantedInZoneId===zone.id&&e.sourceId==="apple_tree"&&
    (e.life?.stage==="old"||e.life?.stage==="dead"));
   {
    const clear=selectTask(world,npc,deadTrees,"Renovando pomar",
     "Macieira envelhecida: aproveitar madeira e liberar espaço","nature.cut");
    if(clear)return {...clear,domain:"farming"};
   }
   continue;
  }
  if((npc.inventory?.[species.seedItem]??0)>0){
   return {...choices[0],targetId:zone.id,activity:"Plantando",
    reason:"Zona de "+species.label+": usando 1 "+species.seedItem+" do inventário",
    action:"farming.plant",domain:"farming"};
  }
  if(free>0){
   const seedTask=selectTask(world,npc,warehouses.filter(d=>stocked(d,species.seedItem)>0),
    "Buscando sementes","Zona com vaga; retirar "+species.seedItem+" de depósito",
    "storage.withdraw",target=>({materialId:species.seedItem,
     quantity:Math.min(3,free,stocked(target as Construction,species.seedItem))}));
   if(seedTask)return {...seedTask,domain:"farming"};
  }
  // Apple trees can start a new orchard using seeds obtained during a real fruit harvest.
  if(free>=species.seedsPerHarvest+species.production.harvestBatch){
   const seedSource=selectTask(world,npc,resources(world).filter(r=>r.sourceId===zone.sourceId),
    "Obtendo sementes","Falta "+species.seedItem+"; colher a planta-mãe",
    "resource.harvest");
   if(seedSource)return {...seedSource,domain:"farming"};
  }
 }
 return null;
}

/** Funeral assistance is a real navigational job, above farming and construction. */
function burialTask(world:World,npc:Character):Task|null {
 const cemeteries=world.entities.filter((e):e is Construction=>e.kind==="construction"&&availableGraves(e)>0);
 const carrying=carriedCorpse(world,npc.id);
 if(!cemeteries.length){
  if(carrying)return {target:carrying,route:[{...npc.position}],activity:"Devolvendo corpo",
   reason:"Não há cemitério com vaga; o corpo permanece visível para posterior sepultamento",
   action:"burial.drop"};
  return null;
 }
 if(carrying){
  return selectTask(world,npc,cemeteries,"Sepultando",
   "Transportando "+carrying.name+" para um cemitério com vaga","burial.inter");
 }
 const corpses=visibleCorpses(world).filter(e=>!e.ownerId);
 return selectTask(world,npc,corpses,"Recolhendo falecido",
  "Sepultamento prioritário: corpo visível causa mal-estar no entorno","burial.pickup");
}
/** Task proposals are deliberately side-effect free; command execution remains authoritative. */
function taskWithDomain(task:Task|null):Task|null {
 if(!task)return null;
 if(task.domain)return task;
 const a=task.action,e=task.target;
 task.domain=a==="farming.plant"||a==="resource.harvest"?"farming":
  a==="construction.work"||a==="construction.deliver"?"building":
  a==="production.work"?"crafting":a==="resource.gather"?
   (e.kind==="resource"&&e.resourceType==="wood"?"woodcutting":"mining"):"hauling";
 return task;
}
function choosePreferred(npc:Character,tasks:Array<Task|null>):Task|null{
 const candidates=tasks.map(taskWithDomain).filter((t):t is Task=>!!t);
 candidates.sort((a,b)=>{
  const rank=(t:Task)=>affinityFor(npc,t.domain??"hauling")*10-
   Math.max(0,t.route.length-1)*.16+
   (t.action==="construction.work"||t.action==="production.work"?1.5:0);
  return rank(b)-rank(a)||a.target.id.localeCompare(b.target.id);
 });
 return candidates[0]??null;
}
function temporaryCargo(world:World,npc:Character,item:string,quantity:number,adjacentOnly=false):Task|null {
 const existing=selectTask(world,npc,depots(world).filter(d=>isTemporaryStorage(d)&&acceptedBy(d,item)&&storageFree(d)>0),"Armazenando temporariamente","Depósito temporário disponível","storage.deposit",d=>({materialId:item,quantity:Math.min(quantity,storageFree(d as Construction))}));
 if(existing&&(!adjacentOnly||existing.route.length===1))return existing;
 const position=[{x:npc.position.x+1,y:npc.position.y},{x:npc.position.x,y:npc.position.y+1},{x:npc.position.x-1,y:npc.position.y},{x:npc.position.x,y:npc.position.y-1}].find(p=>canCreateTemporaryStorage(world,p));
 return position?{target:npc,route:[{...npc.position}],position,activity:"Criando depósito temporário",reason:"Sem armazenamento convencional viável",action:"storage.temporary.create",parameters:{materialId:item,quantity:Math.min(quantity,TEMPORARY_STORAGE.storage!.capacity)},domain:"hauling"}:null;
}
function storedCargo(world:World,npc:Character):Task|null {
 const inventory=npc.inventory??{},warehouses=depots(world).filter(d=>d.blueprintId==="building.depot");
 let fallback:Task|null=null;
 for(const [item,quantity] of Object.entries(inventory)){
  if(quantity<=0||!ITEMS[item])continue;
  // Keep a small personal food reserve; surplus remains available for collective storage.
  const reserve=Object.hasOwn(FOOD_ITEMS,item)?Math.min(quantity,Math.ceil(FOOD_RESERVE_SATIETY/FOOD_ITEMS[item as keyof typeof FOOD_ITEMS].satiety)):0;
  if(quantity<=reserve)continue;
  // Keep seeds needed by an existing plot in hand until planting has been attempted.
  if(ITEMS[item].category==="seed"&&world.entities.some(e=>e.kind==="planting_zone"&&
    naturalSource(e.sourceId)?.seedItem===item&&reachablePlots(world,npc,e,false).length>0)&&load(npc)<CARRY_LIMIT)continue;
  const task=selectTask(world,npc,warehouses.filter(d=>acceptedBy(d,item)&&storageFree(d)>0),
   "Armazenando recursos","Armazenar "+quantity+" "+ITEMS[item].label+
   " com transporte físico","storage.deposit",
   d=>({materialId:item,quantity:Math.min(quantity-reserve,storageFree(d as Construction))}));
  if(task)return {...task,domain:"hauling"};
  if(!fallback&&load(npc)>=CARRY_LIMIT)fallback=temporaryCargo(world,npc,item,quantity-reserve);
 }
 return fallback;
}
function productionTask(world:World,npc:Character):Task|null {
 const workshops=world.entities.filter((e):e is Construction=>e.kind==="construction"&&!!productionDefinition(e));
 const free=CARRY_LIMIT-load(npc);
 for(const workshop of workshops){
  const order=activeOrder(workshop),recipe=order?RECIPES[order.recipeId]:undefined;
  if(recipe){
   const missing=stockMissing(workshop,recipe.id);
   for(const [item,needed] of Object.entries(missing)){
    if(needed<1)continue;
    if((npc.inventory?.[item]??0)>0){
     const delivery=selectTask(world,npc,[workshop],"Entregando à oficina",
      "A receita "+recipe.label+" exige "+item,"storage.deposit",
      ()=>({materialId:item,quantity:Math.min(needed,npc.inventory?.[item]??0,storageFree(workshop))}));
     if(delivery?.parameters?.quantity)return {...delivery,domain:"hauling"};
    }
    if(free>0){
     const supply=selectTask(world,npc,depots(world).filter(d=>d.id!==workshop.id&&stocked(d,item)>0),
      "Retirando insumos","Buscar "+item+" para "+recipe.label,"storage.withdraw",
      target=>({materialId:item,quantity:Math.min(needed,free,stocked(target as Construction,item))}));
     if(supply)return {...supply,domain:"hauling"};
     const mines=resources(world).filter(r=>!r.sourceId&&r.resourceType===item);
     if(mines.length){
      const gather=selectTask(world,npc,mines,"Extraindo para fabricação",
       "Oficina precisa de "+item,"resource.gather");
      if(gather)return taskWithDomain(gather);
     }
    }
   }
   if(canWorkProduction(workshop)){
    const craft=selectTask(world,npc,[workshop],"Fabricando",
     "Trabalhar "+recipe.workUnits+" unidades em "+recipe.label+" para obter "+
      Object.keys(recipe.outputs).join(", "),"production.work");
    if(craft)return {...craft,domain:"crafting"};
   }
  }
  // Transfer finished products to the regular depot once a recipe has completed.
  const outputIds=Object.keys(workshop.stock??{}).filter(item=>
   (workshop.stock?.[item]??0)>0&&ITEMS[item]&&
   ["equipment","processed"].includes(ITEMS[item].category));
  if(free>0&&depots(world).some(d=>d.id!==workshop.id&&storageFree(d)>0)){
   for(const item of outputIds){
    const take=selectTask(world,npc,[workshop],"Distribuindo produção",
     "Levar "+item+" da oficina ao depósito","storage.withdraw",
     ()=>({materialId:item,quantity:Math.min(3,free,stocked(workshop,item))}));
    if(take)return {...take,domain:"hauling"};
   }
  }
 }
 return null;
}
function desiredTool(npc:Character):string|null{
 if(npc.equipment?.tool)return null;
 const preferences=[["axe","woodcutting"],["pickaxe","mining"],["hammer","building"]] as const;
 const ranked=preferences.map(([item,domain])=>({item,score:affinityFor(npc,domain)}))
  .sort((a,b)=>b.score-a.score);
 return ranked[0].item;
}
function equipmentTask(world:World,npc:Character):Task|null{
 const preferred=desiredTool(npc);
 if(!preferred)return null;
 const available=(id:string)=>(npc.inventory?.[id]??0)>0||depots(world).some(d=>stocked(d,id)>0);
 const item=[preferred,"axe","pickaxe","hammer"].find(available);
 if(!item)return null;
 if((npc.inventory?.[item]??0)>0)return {target:npc,route:[{...npc.position}],
  activity:"Equipando",reason:"Afinidade por "+item+"; usar equipamento físico",
  action:"npc.equip",targetId:npc.id,parameters:{tool:item},domain:"hauling"};
 const free=CARRY_LIMIT-load(npc);if(!free)return null;
 const source=selectTask(world,npc,depots(world).filter(d=>stocked(d,item)>0),
  "Buscando equipamento","Retirar "+item+" para atividade preferida","storage.withdraw",
  ()=>({materialId:item,quantity:1}));
 return source?{...source,domain:"hauling"}:null;
}
/** Pair a real withdrawal with reachable outstanding construction demand. */
function constructionWithdrawal(world:World,npc:Character,site:Construction,item:string,limit:number,warehouses:Construction[]):Task|null{
 const demand=haulingAvailable(world,npc,site,"construction.deliver",item);
 const quantity=Math.min(demand,limit);
 if(quantity<=0)return null;
 const candidates=warehouses.filter(d=>d.id!==site.id&&stocked(d,item)>0).map(d=>{
  const task=selectTask(world,npc,[d],"Buscando material","Levar "+item+" ao canteiro","storage.withdraw",
   ()=>({materialId:item,quantity:Math.min(quantity,stocked(d,item))}));
  if(!task)return null;
  const from=task.route.at(-1)!;
  const onward=routeToEntity(world,from,site,npc.id);
  if(!onward)return null;
  return {task:{...task,constructionDestinationId:site.id},cost:routeCost(world,task.route,npc.id)+routeCost(world,onward,npc.id)};
 }).filter((x):x is NonNullable<typeof x>=>!!x);
 candidates.sort((a,b)=>a.cost-b.cost||a.task.target.id.localeCompare(b.task.target.id));
 return candidates[0]?.task??null;
}
function committedConstructionHaul(world:World,npc:Character):Task|null{
 const claim=activeHaulingClaim(world,npc);
 if(!claim)return null;
 const cancel=()=>{delete npc.ai!.haulingClaim;return null;};
 if(claim.action==="storage.withdraw"&&claim.constructionDestinationId){
  const site=sites(world).find(s=>s.id===claim.constructionDestinationId);
  const source=depots(world).find(d=>d.id===claim.targetId);
  if(!site||!source)return cancel();
  const task=constructionWithdrawal(world,npc,site,claim.itemId,Math.min(claim.quantity,CARRY_LIMIT-load(npc)),[source]);
  return task?{...task,domain:"hauling"}:cancel();
 }
 if(claim.action==="construction.deliver"){
  const site=sites(world).find(s=>s.id===claim.targetId);
  if(!site)return cancel();
  const quantity=Math.min(claim.quantity,npc.inventory?.[claim.itemId]??0,haulingAvailable(world,npc,site,"construction.deliver",claim.itemId));
  if(quantity<=0)return cancel();
  const task=selectTask(world,npc,[site],"Entregando materiais","Canteiro requer "+claim.itemId,"construction.deliver",()=>({materialId:claim.itemId,quantity}));
  return task?{...task,domain:"hauling"}:cancel();
 }
 return null;
}
function constructionTasks(world:World,npc:Character):{deliver:Task|null;work:Task|null;source:Task|null}{
 const projects=sites(world),warehouses=depots(world);
 const inventory=npc.inventory??{},free=CARRY_LIMIT-load(npc);
 let deliver:Task|null=null,work:Task|null=null,source:Task|null=null;
 for(const site of projects){
  const missing=materialsRemaining(site);
  for(const [item,physicalAmount] of Object.entries(missing)){
   const amount=Math.min(physicalAmount,haulingAvailable(world,npc,site,"construction.deliver",item));
   if(amount<=0)continue;
   if((inventory[item]??0)>0&&!deliver)
    deliver=selectTask(world,npc,[site],"Entregando materiais",
     "Canteiro requer "+item,"construction.deliver",
     ()=>({materialId:item,quantity:Math.min(amount,inventory[item])}));
   if(free>0&&!source){
    source=constructionWithdrawal(world,npc,site,item,Math.min(amount,free),warehouses);
    if(!source)source=selectTask(world,npc,resources(world).filter(r=>!r.sourceId&&r.resourceType===item),
     "Coletando material","Canteiro demanda "+item,"resource.gather");
   }
  }
  if(hasMaterials(site)&&!work)
   work=selectTask(world,npc,[site],"Construindo",
    "Materiais entregues; avançar etapa de obra","construction.work");
 }
 return {deliver:taskWithDomain(deliver),work:taskWithDomain(work),source:taskWithDomain(source)};
}
function stockpileTask(world:World,npc:Character):Task|null {
 const free=CARRY_LIMIT-load(npc),warehouses=depots(world).filter(d=>d.blueprintId==="building.depot");
 if(free<3||warehouses.every(d=>storageFree(d)===0))return null;
 const candidates=resources(world).filter(r=>warehouses.some(d=>
  acceptedBy(d,r.sourceId?r.productId??"":r.resourceType)&&
  storageFree(d)>=3)&&(!r.sourceId||free>=(naturalSource(r.sourceId)?.seedsPerHarvest??0)+1));
 const tasks=candidates.map(r=>selectTask(world,npc,[r],
  "Buscando recursos","Abastecer depósito com "+(r.productId??r.resourceType),
  r.sourceId?"resource.harvest":"resource.gather"));
 return choosePreferred(npc,tasks);
}
/** Dead wood is a physical resource even outside cultivated zones. */
function deadwoodTask(world:World,npc:Character):Task|null{
 const trees=world.entities.filter((e):e is Resource=>e.kind==="resource"&&
  e.sourceId==="apple_tree"&&e.life?.stage==="dead");
 const task=selectTask(world,npc,trees,"Cortando madeira seca","Remover macieira morta e recuperar madeira","nature.cut");
 return task?{...task,domain:"woodcutting"}:null;
}
const adjacentCells=(npc:Character)=>[{x:npc.position.x+1,y:npc.position.y},{x:npc.position.x-1,y:npc.position.y},{x:npc.position.x,y:npc.position.y+1},{x:npc.position.x,y:npc.position.y-1}];
function idleStep(world:World,npc:Character,execute:ActionHandler):boolean{
 if(world.tick<(npc.nextMoveTick??0))return true;
 const cells=adjacentCells(npc).filter(p=>canEnter(world,p,npc.id));
 if(!cells.length){
  const blockers=adjacentCells(npc).map(p=>blockingEntity(world,p,npc.id)).filter(Boolean);
  record(npc,world,"Bloqueado","Sem saída livre; "+(blockers.map(e=>e!.kind+":"+e!.id).join(", ")||"limites do mapa"));
  return true;
 }
 if((npc.satiety??100)<=EAT_THRESHOLD||npc.energy<=40)return false;
 // Occasional deterministic exploration, not constant walking around the depot.
 if(world.tick%12!==0)return false;
 const warehouses=depots(world);
 const distance=(p:Position)=>warehouses.length?Math.min(...warehouses.map(d=>Math.abs(p.x-d.position.x)+Math.abs(p.y-d.position.y))):0;
 cells.sort((a,b)=>distance(b)-distance(a)||a.y-b.y||a.x-b.x);
 const next=cells[Math.floor(world.tick/12)%cells.length===0?cells.length-1:0];
 const result=execute({worldId:world.id,commandId:"ai-idle-"+world.tick+"-"+npc.id,actorRole:"npc",actorId:npc.id,action:"movement.move",targetId:npc.id,position:next});
 if(result.ok){record(npc,world,"Explorando","Sem tarefa produtiva disponível; explorar o entorno",undefined,[next]);return true;}
 return false;
}
// Keep physical extraction and pickup distinct; an intent only delays discretionary hauling.
const EXTRACTION_STALL_TICKS=24;
function committedExtraction(world:World,npc:Character):Task|null{
 const intent=npc.ai?.extractionCommitment;
 if(!intent)return null;
 const cancel=()=>{delete npc.ai!.extractionCommitment;return null;};
 if(world.tick-intent.lastProgressTick>=EXTRACTION_STALL_TICKS||
    npc.energy<=NPC_REST_THRESHOLD+4||npc.health<=35||(npc.satiety??100)<=EAT_THRESHOLD)return cancel();
 const target=world.entities.find(e=>e.id===intent.targetId);
 if(intent.action==="mine.extract"){
  if(target?.kind!=="construction"||target.blueprintId!=="building.mine"||
   !storageDefinition(target)||storageFree(target)<=0||(target.mineRemaining?.[intent.itemId]??0)<=0)return cancel();
  const task=selectTask(world,npc,[target],"Operando mina","Continuar extração no estoque local","mine.extract",()=>({materialId:intent.itemId}));
  return task?{...task,domain:"mining"}:cancel();
 }
 if(target?.kind!=="resource"||target.sourceId||target.resourceType!==intent.itemId)return cancel();
 const free=CARRY_LIMIT-load(npc);
 if(free<=0)return cancel();
 // Only continue a batch when a real conventional destination can take the load.
 const carried=npc.inventory?.[intent.itemId]??0;
 const destination=selectTask(world,npc,depots(world).filter(d=>d.blueprintId==="building.depot"&&
  acceptedBy(d,intent.itemId)&&storageFree(d)>carried),"Armazenando recursos","Destino de extração","storage.deposit");
 if(!destination||npc.energy<=NPC_REST_THRESHOLD+Math.max(0,destination.route.length-1)+2)return cancel();
 // Collect physical output locally before extracting again, including the final depleted-source output.
 const near=Math.abs(npc.position.x-target.position.x)+Math.abs(npc.position.y-target.position.y)<=1;
 if(near){
  const pile=world.entities.filter(e=>e.kind==="item"&&e.itemId===intent.itemId&&
   Math.abs(e.position.x-npc.position.x)+Math.abs(e.position.y-npc.position.y)<=1);
  const pickup=selectTask(world,npc,pile,"Recolhendo itens","Acumular carga da extração","item.pickup");
  if(pickup)return {...pickup,domain:"hauling",extractionPickup:true};
 }
 if(target.quantity<=0||free<3||storageFree(destination.target as Construction)-carried<3)return cancel();
 const task=selectTask(world,npc,[target],"Buscando recursos","Abastecer depósito com "+intent.itemId,"resource.gather");
 return task?taskWithDomain(task):cancel();
}
function choose(world:World,npc:Character):Task|null{
 const funeral=burialTask(world,npc);
 if(funeral)return funeral;
 const committedHaul=committedConstructionHaul(world,npc);if(committedHaul)return committedHaul;
 const construction=constructionTasks(world,npc);
 // Urgent delivery is followed through before any new collection.
 if(construction.deliver)return construction.deliver;
 const production=productionTask(world,npc);
 if(production?.action==="storage.deposit")return production;
 const equipment=equipmentTask(world,npc);
 if(equipment)return equipment;
 // Clear a dead tree underfoot before discretionary storage; survival is handled earlier.
 const underfoot=world.entities.filter(e=>e.kind==="resource"&&e.sourceId==="apple_tree"&&e.life?.stage==="dead"&&e.position.x===npc.position.x&&e.position.y===npc.position.y);
 const clearing=selectTask(world,npc,underfoot,"Cortando madeira seca","Liberar a célula ocupada por macieira morta","nature.cut");
 if(clearing)return {...clearing,domain:"woodcutting"};
 const committed=committedPlanting(world,npc);if(committed)return committed;
 const extraction=committedExtraction(world,npc);if(extraction)return extraction;
 const cargo=storedCargo(world,npc);
 if(cargo)return cargo;
 const pickup=groundTask(world,npc);if(pickup)return pickup;
 if(load(npc)<CARRY_LIMIT){
  const permanent=depots(world).filter(d=>d.blueprintId==="building.depot"&&storageFree(d)>0);
  const temporary=depots(world).filter(isTemporaryStorage);
  for(const area of temporary){
   const item=Object.keys(area.stock??{}).find(k=>(area.stock?.[k]??0)>0&&permanent.some(d=>acceptedBy(d,k)&&routeToEntity(world,area.position,d,npc.id)));
   if(item){const task=selectTask(world,npc,[area],"Consolidando estoque","Transferir carga temporária ao depósito convencional","storage.withdraw",()=>({materialId:item,quantity:Math.min(CARRY_LIMIT-load(npc),area.stock![item],Math.max(...permanent.filter(d=>acceptedBy(d,item)).map(storageFree)))}));if(task)return task;}
  }

 }
 if(load(npc)<CARRY_LIMIT&&depots(world).some(d=>d.blueprintId==="building.depot"&&storageFree(d)>0)){
  const mineStock=selectTask(world,npc,depots(world).filter(d=>d.blueprintId==="building.mine"&&Object.values(d.stock??{}).some(n=>n>0)),"Transportando minério","Retirar produção da mina","storage.withdraw",e=>{const d=e as Construction;const item=Object.keys(d.stock??{}).find(k=>(d.stock?.[k]??0)>0)!;return {materialId:item,quantity:Math.min(CARRY_LIMIT-load(npc),d.stock![item])};});if(mineStock)return mineStock;
 }
 // Annual crops cannot regrow after expiry; rescue ripe crops before new projects.
 const free=CARRY_LIMIT-load(npc);
 const ripe=selectTask(world,npc,resources(world).filter(r=>{
  const def=r.sourceId?naturalSource(r.sourceId):undefined;
  return def?.growthMode==="single_harvest"&&r.life?.stage==="old"&&free>def.seedsPerHarvest;
 }),"Colhendo safra","Colher cultura envelhecida antes de perder a safra","resource.harvest");
 if(ripe)return {...ripe,domain:"farming"};
 // New work is chosen by affinities; no trait can bypass survival or valid physical actions.
 const deadwood=deadwoodTask(world,npc);if(deadwood)return deadwood;
 const farming=plantingTask(world,npc);
 const mine=selectTask(world,npc,world.entities.filter(e=>e.kind==="construction"&&e.blueprintId==="building.mine"&&storageFree(e)>0&&Object.values(e.mineRemaining??{}).some(n=>n>0)),"Operando mina","Extrair depósito subterrâneo finito","mine.extract",e=>({materialId:Object.keys((e as Construction).mineRemaining??{}).find(k=>((e as Construction).mineRemaining?.[k]??0)>0)}));
 const demanded=choosePreferred(npc,[mine?{...mine,domain:"mining"}:null,farming,construction.work,production,construction.source,equipment]);
 if(demanded)return demanded;
 // Empty areas need no hauling capacity. Keep one nearby spare if all permanent storage is full.
 const temporary=depots(world).filter(isTemporaryStorage);
 const empty=temporary.filter(d=>Object.values(d.stock??{}).every(n=>n===0));
 const permanent=depots(world).filter(d=>d.blueprintId==="building.depot");
 const spare=permanent.some(d=>storageFree(d)>0)?undefined:empty.slice().sort((a,b)=>a.id.localeCompare(b.id))[0]?.id;
 const cleanup=selectTask(world,npc,empty.filter(d=>d.id!==spare),"Removendo depósito temporário",
  "Área vazia sem necessidade imediata de armazenamento","storage.temporary.remove");
 return cleanup??stockpileTask(world,npc);
}
function record(npc:Character,world:World,activity:string|null,reason:string,targetId?:string,route:Position[]=[]){
 npc.ai??={activity:null,reason:"",route:[],lastDecisionTick:world.tick,history:[]};
 const ai=npc.ai;
 if(ai.activity!==activity||ai.targetId!==targetId||ai.reason!==reason){
  ai.history.push({tick:world.tick,activity:activity??"Aguardando",reason,...(targetId?{targetId}:{})});
  if(ai.history.length>8)ai.history.splice(0,ai.history.length-8);
 }
 ai.activity=activity;ai.reason=reason;ai.targetId=targetId;ai.route=route;ai.lastDecisionTick=world.tick;
}

/** Survival outranks construction, with real fruit consumption and no created food. */
function groundTask(world:World,npc:Character,foodOnly=false):Task|null {
 if(load(npc)>=CARRY_LIMIT)return null;
 const items=world.entities.filter(e=>e.kind==="item"&&(!foodOnly||Object.hasOwn(FOOD_ITEMS,e.itemId)));
 return selectTask(world,npc,items,"Recolhendo itens","Recolher recursos físicos no chão","item.pickup");
}
function foodTask(world:World,npc:Character):Task|null {
 const warehouses=depots(world),free=CARRY_LIMIT-load(npc);
 const ground=groundTask(world,npc,true);if(ground)return ground;
 if(free>0){
  for(const food of Object.values(FOOD_ITEMS)){
   const stored=selectTask(world,npc,warehouses.filter(d=>stocked(d,food.id)>0),
    "Buscando alimento","Saciedade baixa; procurar "+food.label+" no depósito",
    "storage.withdraw",target=>({materialId:food.id,quantity:Math.min(2,free,stocked(target as Construction,food.id))}));
   if(stored)return stored;
  }
 }
 const edibleSources=resources(world).filter(r=>{
  const def=r.sourceId?naturalSource(r.sourceId):undefined;
  return !!def&&Object.hasOwn(FOOD_ITEMS,def.productId)&&r.life?.stage!=="dead";
 });
 const harvest=selectTask(world,npc,free>0?edibleSources:[],
  "Colhendo alimento","Saciedade baixa; colher alimento pronto para consumo","resource.harvest");
 if(harvest)return harvest;
 // Free capacity only when a reachable food source can benefit.
 const reachable=edibleSources.filter(r=>routeToEntity(world,npc.position,r,npc.id));
 const required=Math.min(...reachable.map(()=>1),...(world.entities.some(e=>e.kind==="item"&&Object.hasOwn(FOOD_ITEMS,e.itemId)&&routeToEntity(world,npc.position,e,npc.id))?[1]:[]),
  ...(warehouses.some(d=>Object.keys(FOOD_ITEMS).some(id=>stocked(d,id)>0)&&routeToEntity(world,npc.position,d,npc.id))?[1]:[]));
 if(free>=required||!Number.isFinite(required))return null;
 for(const [item,amount] of Object.entries(npc.inventory??{})){
  if(amount<=0||Object.hasOwn(FOOD_ITEMS,item))continue;
  const task=selectTask(world,npc,warehouses.filter(d=>acceptedBy(d,item)&&storageFree(d)>0),
   "Liberando espaço para alimento","Preciso comer; liberar capacidade para coleta",
   "storage.deposit",target=>({materialId:item,quantity:Math.min(amount,storageFree(target as Construction),required-free)}));
  if(task&&(npc.satiety??100)>10)return task;
  if(task&&task.route.length===1)return task;
 }
 // Emergency: a physical drop is preferable to dying with a full inventory.
 // Seeds, tools and medicine are retained preferentially, but no item is destroyed.
 if((npc.satiety??100)<=10){
  const rank=(item:string)=>({raw:0,processed:1,seed:2,medicine:3,equipment:4}[ITEMS[item]?.category]??5);
  const cargo=Object.entries(npc.inventory??{}).filter(([item,amount])=>amount>0&&Object.hasOwn(ITEMS,item)&&!Object.hasOwn(FOOD_ITEMS,item))
   .sort((a,b)=>rank(a[0])-rank(b[0])||b[1]-a[1]||a[0].localeCompare(b[0]));
  if(cargo.length){const temporary=temporaryCargo(world,npc,cargo[0][0],Math.min(cargo[0][1],required-free),true);if(temporary)return temporary;}
  if(cargo.length)return {target:npc,route:[{...npc.position}],activity:"Liberando espaço para alimento",
   reason:"Fome crítica: deixar carga física no chão para obter alimento",action:"item.drop",
   parameters:{materialId:cargo[0][0],quantity:Math.min(cargo[0][1],required-free)}};
 }
 return null;
}
function rest(world:World,npc:Character,execute:ActionHandler):boolean {
 const ai=npc.ai;
 const needsRest=!!ai?.resting||npc.energy<=NPC_REST_THRESHOLD||npc.health<=35;
 if(!needsRest)return false;
 npc.ai??={activity:null,reason:"",route:[],lastDecisionTick:world.tick,history:[]};
 npc.ai.resting=true;
 // Continue resting until both energy and injury recovery goals are met.
 if(npc.energy>=NPC_REST_RECOVER_TO&&(npc.health>=65||(npc.satiety??100)<=25)){
  npc.ai.resting=false;releaseBed(world,npc);return false;
 }
 let house=reservedHouse(world,npc);
 let route=house?routeToEntity(world,npc.position,house,npc.id):null;
 if(house&&!route){releaseBed(world,npc);house=undefined;}
 if(!house){
  const candidates=world.entities.filter((e):e is Construction=>e.kind==="construction"&&
   bedsIn(e)>0&&reservationCount(e)<bedsIn(e)&&(e.blueprintId!=="building.family_house"||e.residents?.includes(npc.id)));
  const reachable=candidates.map(target=>({target,route:routeToEntity(world,npc.position,target,npc.id)}))
   .filter((entry):entry is {target:Construction;route:Position[]}=>!!entry.route)
   .sort((a,b)=>Number(b.target.id===npc.homeId)-Number(a.target.id===npc.homeId)||routeCost(world,a.route,npc.id)-routeCost(world,b.route,npc.id)||a.target.id.localeCompare(b.target.id));
  for(const entry of reachable){
   if(reserveBed(world,npc,entry.target)){house=entry.target;route=entry.route;break;}
  }
 }
 if(house&&route&&route.length>1&&npc.energy<=0){
  releaseBed(world,npc);house=undefined;route=null;
 }
 if(house&&route&&route.length>1){
  if(world.tick<(npc.nextMoveTick??0)){reserveBed(world,npc,house);return true;}
  const next=route[1];
  const result=execute({worldId:world.id,commandId:"ai-sleep-"+world.tick+"-"+npc.id,
   actorRole:"npc",actorId:npc.id,action:"movement.move",targetId:npc.id,position:next});
  if(result.ok){
   reserveBed(world,npc,house); // renew TTL while travelling
   record(npc,world,"Indo dormir","Cama reservada na "+house.id+"; energia "+npc.energy,house.id,route.slice(1));
  }else{
   releaseBed(world,npc);
   record(npc,world,"Bloqueado","Rota para a cama bloqueada; tentará outra reserva",house.id);
  }
  return true;
 }
 if(house)reserveBed(world,npc,house);
 const sheltered=!!house&&enterHouse(world,npc,house);
 const gain=sleepRecovery(world,npc,sheltered?house:undefined);
 npc.energy=Math.min(100,npc.energy+gain);
 // Healing is owned by systems/health; never double-apply during rest.
 record(npc,world,sheltered?"Dormindo":"Descansando",
  sheltered?"Cama reservada; recuperação +"+gain+" energia por ciclo":
   "Sem cama acessível; recuperação lenta +"+gain+" energia por ciclo",house?.id);
 return true;
}
/** Presentation only: describe the selected task while travelling, never claim work already happened. */
export function travelActivity(action:Command["action"],activity:string,resourceType?:string):string {
 if(action==="resource.gather"){
  if(resourceType==="wood")return "Indo coletar madeira";
  if(resourceType==="stone")return "Indo minerar pedra";
  if(resourceType==="iron"||resourceType==="iron_ore")return "Indo minerar ferro";
  if(resourceType==="copper"||resourceType==="copper_ore")return "Indo minerar cobre";
  return "Indo extrair recursos";
 }
 if(action==="storage.deposit"){
  if(activity==="Entregando à oficina")return "Carregando para a oficina";
  if(activity==="Armazenando temporariamente")return "Carregando para depósito temporário";
  if(activity==="Liberando espaço para alimento")return "Indo liberar espaço para alimento";
  return "Carregando para o depósito";
 }
 const labels:Record<string,string>={
  "Operando mina":"Indo minerar","Plantando":"Indo plantar","Renovando pomar":"Indo renovar pomar",
  "Obtendo sementes":"Indo colher sementes","Colhendo safra":"Indo colher safra",
  "Colhendo alimento":"Indo colher alimento","Buscando recursos":"Indo colher recursos",
  "Construindo":"Indo construir","Fabricando":"Indo fabricar",
  "Entregando materiais":"Carregando materiais para a obra","Retirando insumos":"Indo buscar insumos",
  "Distribuindo produção":"Indo buscar produção","Transportando minério":"Indo buscar minério na mina",
  "Consolidando estoque":"Indo recolher estoque temporário","Removendo depósito temporário":"Indo remover depósito temporário",
  "Cortando madeira seca":"Indo cortar madeira seca","Recolhendo itens":"Indo recolher itens",
  "Sepultando":"Transportando falecido ao cemitério","Recolhendo falecido":"Indo recolher falecido"
 };
 return labels[activity]??activity;
}
function executeTask(world:World,npc:Character,task:Task,execute:ActionHandler):void {
 const claim=activeHaulingClaim(world,npc);
 if(isHaulingAction(task.action)&&task.target.kind==="construction"&&typeof task.parameters?.materialId==="string"&&typeof task.parameters.quantity==="number"&&task.parameters.quantity>0&&npc.health>35&&npc.energy>NPC_REST_THRESHOLD&&(npc.satiety??100)>EAT_THRESHOLD){
  npc.ai??={activity:null,reason:"",route:[],lastDecisionTick:world.tick,history:[]};
  const same=claim?.targetId===task.target.id&&claim.action===task.action&&claim.itemId===task.parameters.materialId&&claim.constructionDestinationId===task.constructionDestinationId;
  npc.ai.haulingClaim={targetId:task.target.id,action:task.action,itemId:task.parameters.materialId,quantity:task.parameters.quantity,lastProgressTick:same?claim.lastProgressTick:world.tick,...(task.constructionDestinationId?{constructionDestinationId:task.constructionDestinationId}:{})};
 }else if(npc.ai)delete npc.ai.haulingClaim;
 const extracting=task.action==="resource.gather"||task.action==="mine.extract";
 if(extracting){
  const itemId=task.action==="resource.gather"&&task.target.kind==="resource"?task.target.resourceType:task.parameters?.materialId;
  if(typeof itemId==="string"&&["wood","stone","iron_ore","copper_ore"].includes(itemId)){
   npc.ai??={activity:null,reason:"",route:[],lastDecisionTick:world.tick,history:[]};
   const old=npc.ai.extractionCommitment;
   if(!old||old.targetId!==task.target.id||old.action!==task.action||old.itemId!==itemId)
    npc.ai.extractionCommitment={targetId:task.target.id,action:task.action as "resource.gather"|"mine.extract",itemId,startedTick:world.tick,lastProgressTick:world.tick};
  }
 }else if(!task.extractionPickup&&npc.ai)delete npc.ai.extractionCommitment;
 if(task.action==="farming.plant"&&task.targetId&&task.position){
  npc.ai??={activity:null,reason:"",route:[],lastDecisionTick:world.tick,history:[]};
  const old=npc.ai.plantingCommitment;
  if(!old||old.zoneId!==task.targetId||old.position.x!==task.position.x||old.position.y!==task.position.y)
   npc.ai.plantingCommitment={zoneId:task.targetId,position:{...task.position},startedTick:world.tick,lastProgressTick:world.tick};
 }else if(npc.ai)delete npc.ai.plantingCommitment;
 const effective=resolveAttributes({...npc,attributes:{...npc.attributes,energy:npc.energy,health:npc.health}},world.tick).values;
 const cycle=Math.floor(world.tick/NPC_ACTION_INTERVAL);
 const travel=travelActivity(task.action,task.activity,task.target.kind==="resource"?task.target.resourceType:undefined);
 if(task.route.length>1&&world.tick<(npc.nextMoveTick??0)){
  record(npc,world,travel,task.reason+"; travessia lenta",task.targetId??task.target.id,task.route.slice(1));return;
 }
 if(task.route.length>1&&effective.movementSpeed<.8&&cycle%2===1){
  record(npc,world,travel,task.reason+"; recuperando fôlego",task.targetId??task.target.id,task.route.slice(1));
  return;
 }
 if(task.action==="construction.work"&&effective.workRate<.7&&cycle%2===1){
  record(npc,world,"Trabalho lento","Fadiga ou debuffs diminuem produtividade",task.target.id,task.route);
  return;
 }
 if(task.route.length>1){
  const next=task.route[1];
  const result=execute({commandId:"ai-"+world.tick+"-"+npc.id,worldId:world.id,actorRole:"npc",
   actorId:npc.id,action:"movement.move",targetId:npc.id,position:next});
  if(result.ok){if(npc.ai?.haulingClaim)npc.ai.haulingClaim.lastProgressTick=world.tick;if(npc.ai?.extractionCommitment)npc.ai.extractionCommitment.lastProgressTick=world.tick;if(npc.ai?.plantingCommitment)npc.ai.plantingCommitment.lastProgressTick=world.tick;record(npc,world,travel,task.reason,task.targetId??task.target.id,task.route.slice(1));}
  else {if(npc.ai)delete npc.ai.haulingClaim;record(npc,world,"Bloqueado","Caminho mudou ("+result.error+"); recalculará no próximo ciclo",task.targetId??task.target.id);}
  return;
 }
 const result=execute({commandId:"ai-"+world.tick+"-"+npc.id,worldId:world.id,
  actorRole:"npc",actorId:npc.id,action:task.action,targetId:task.targetId??task.target.id,
  position:task.position,parameters:task.parameters});
 if(npc.ai){
  const completed=npc.ai.haulingClaim;
  delete npc.ai.haulingClaim;
  if(result.ok&&completed?.action==="storage.withdraw"&&completed.constructionDestinationId){
   const site=sites(world).find(s=>s.id===completed.constructionDestinationId);
   const quantity=site?Math.min(completed.quantity,npc.inventory?.[completed.itemId]??0,haulingAvailable(world,npc,site,"construction.deliver",completed.itemId)):0;
   if(site&&quantity>0)npc.ai.haulingClaim={targetId:site.id,action:"construction.deliver",itemId:completed.itemId,quantity,lastProgressTick:world.tick};
  }
  delete npc.ai.plantingCommitment;
  if(npc.ai.extractionCommitment){
   if(result.ok)npc.ai.extractionCommitment.lastProgressTick=world.tick;
   else delete npc.ai.extractionCommitment;
  }
 }
 record(npc,world,result.ok?task.activity:"Bloqueado",
  result.ok?task.reason:"Ação rejeitada ("+result.error+"); nova decisão no próximo ciclo",task.targetId??task.target.id);
}
export function advanceNpcDecisions(world:World,execute:ActionHandler):void {
 if(world.tick%NPC_ACTION_INTERVAL!==0)return;
 const characters=world.entities.filter((e):e is Character=>e.kind==="character"&&!e.ownerId);
 for(const npc of characters){
  if(npc.ai?.haulingClaim&&!activeHaulingClaim(world,npc))delete npc.ai.haulingClaim;
  if(npc.ai&&(npc.health<=35||npc.energy<=NPC_REST_THRESHOLD||npc.ai.resting||npc.sleepingInId||(npc.satiety??100)<=EAT_THRESHOLD)){delete npc.ai.plantingCommitment;delete npc.ai.extractionCommitment;delete npc.ai.haulingClaim;}
  if(npc.health<=0){
   releaseBed(world,npc);
   record(npc,world,null,"Sem condições de agir: saúde zero");continue;
  }
  // Leave before planning any outdoor task. If exits are occupied, retry next decision.
  if(npc.sleepingInId&&(!reservedHouse(world,npc)||(npc.satiety??100)<=EAT_THRESHOLD||npc.health<=35&&npc.energy>0&&(npc.satiety??100)<65||npc.energy>=NPC_REST_RECOVER_TO&&(npc.health>=65||(npc.satiety??100)<=25))){
   if(!exitHouse(world,npc)){
    // Eating carried food requires no exterior cell. Do not release the bed or plan outdoor work.
    const edible=(npc.satiety??100)<65?Object.values(FOOD_ITEMS).find(food=>(npc.inventory?.[food.id]??0)>0):undefined;
    if(edible){
     const result=execute({commandId:"ai-indoor-eat-"+world.tick+"-"+npc.id,worldId:world.id,actorRole:"npc",actorId:npc.id,action:"npc.eat",targetId:npc.id,parameters:{itemId:edible.id}});
     if(result.ok){record(npc,world,"Alimentando-se","Consumiu "+edible.label+" dentro da casa",npc.sleepingInId);continue;}
    }
    const shelter=reservedHouse(world,npc);
    if(shelter&&shelter.id===npc.sleepingInId)reserveBed(world,npc,shelter);
    record(npc,world,"Aguardando saída","Entrada ocupada; aguardando célula livre",npc.sleepingInId);continue;
   }
   releaseBed(world,npc);if(npc.ai)npc.ai.resting=false;
  }
  // Survival comes first. Hunger interrupts travel, work, and even sleep.
  if((npc.satiety??100)<=EAT_THRESHOLD){
   const edible=Object.values(FOOD_ITEMS).find(food=>(npc.inventory?.[food.id]??0)>0);
   if(edible){
    releaseBed(world,npc);
    const result=execute({commandId:"ai-eat-"+world.tick+"-"+npc.id,worldId:world.id,
     actorRole:"npc",actorId:npc.id,action:"npc.eat",targetId:npc.id,parameters:{itemId:edible.id}});
    record(npc,world,result.ok?"Alimentando-se":"Aguardando alimento",
     result.ok?"Consumiu "+edible.label+" do próprio inventário":"Não conseguiu se alimentar ("+(result.ok?"":result.error)+")");
    continue;
   }
   const task=npc.energy>0?foodTask(world,npc):null;
   if(task){releaseBed(world,npc);npc.ai&&(npc.ai.resting=false);executeTask(world,npc,task,execute);continue;}
  }
  // An injured NPC needs nutrition to recover; do not wait for severe hunger.
  if(npc.health<=35&&npc.energy>0&&(npc.satiety??100)>EAT_THRESHOLD&&(npc.satiety??100)<65){
   const edible=Object.values(FOOD_ITEMS).find(food=>(npc.inventory?.[food.id]??0)>0);
   if(edible){
    releaseBed(world,npc);
    const result=execute({commandId:"ai-recovery-eat-"+world.tick+"-"+npc.id,worldId:world.id,actorRole:"npc",actorId:npc.id,action:"npc.eat",targetId:npc.id,parameters:{itemId:edible.id}});
    record(npc,world,result.ok?"Alimentando-se":"Aguardando alimento","Nutrição para recuperar saúde");continue;
   }
   const task=foodTask(world,npc);
   if(task){releaseBed(world,npc);executeTask(world,npc,task,execute);continue;}
  }
  if(rest(world,npc,execute))continue;
  if((npc.satiety??100)<=10){
   record(npc,world,null,"Fome crítica: sem alimento acessível; trabalho não essencial suspenso");
   continue;
  }
  const task=choose(world,npc);
  if(!task){
   if(npc.ai){delete npc.ai.plantingCommitment;delete npc.ai.extractionCommitment;delete npc.ai.haulingClaim;}
   if(idleStep(world,npc,execute))continue;
   record(npc,world,null,(npc.satiety??100)<=EAT_THRESHOLD?
    "Com fome e sem alimento acessível; aguardando fonte ou estoque":
    "Sem objetivo executável: falta estoque, fonte acessível ou depósito disponível");
   continue;
  }
  releaseBed(world,npc); // no conditional shelter buff outside actual sleep
  executeTask(world,npc,task,execute);
 }
}
