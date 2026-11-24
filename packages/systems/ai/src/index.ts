import type {World,Character,Entity,Resource,Construction,Command,Result,Position} from "../../../domain/src/contracts.ts";
import {canEnter,blockingEntity} from "../../collision/src/index.ts";
import {routeToEntity} from "../../pathfinding/src/index.ts";
import {materialsRemaining,hasMaterials,storageDefinition,storageFree} from "../../construction/src/index.ts";
import {bedsIn,reservationCount,reserveBed,reservedHouse,releaseBed,sleepRecovery} from "../../housing/src/index.ts";
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
import {ITEMS} from "../../../content/src/items.ts";

export const NPC_ACTION_INTERVAL=3;
export const NPC_REST_THRESHOLD=20;
export const NPC_REST_RECOVER_TO=80;
export const NPC_REST_GAIN=4; // resting outside a house, tuned by endurance; beds recover faster
const CARRY_LIMIT=12;
type ActionHandler=(command:Command)=>Result;
type Task={
 target:Entity; route:Position[]; activity:string; reason:string;
 action:Command["action"]; parameters?:Record<string,unknown>; position?:Position; targetId?:string;
 domain?:WorkDomain
};
const load=(npc:Character)=>Object.values(npc.inventory??{}).reduce((total,value)=>total+Math.max(0,value),0);
const resources=(world:World):Resource[]=>
 world.entities.filter((e):e is Resource=>e.kind==="resource"&&e.quantity>0);
const depots=(world:World):Construction[]=>
 world.entities.filter((e):e is Construction=>e.kind==="construction"&&!!storageDefinition(e));
const sites=(world:World):Construction[]=>
 world.entities.filter((e):e is Construction=>e.kind==="construction"&&e.status==="site");

function selectTask(world:World,npc:Character,targets:Entity[],activity:string,reason:string,
 action:Command["action"],parameters?:(e:Entity)=>Record<string,unknown>|undefined):Task|null {
 const reachable=targets.map(target=>{
  const route=routeToEntity(world,npc.position,target,npc.id);
  return route?{target,route}:null;
 }).filter((item):item is {target:Entity;route:Position[]}=>!!item);
 reachable.sort((a,b)=>a.route.length-b.route.length||a.target.id.localeCompare(b.target.id));
 const chosen=reachable[0];
 return chosen?{...chosen,activity,reason,action,parameters:parameters?.(chosen.target)}:null;
}
const acceptedBy=(depot:Construction,item:string):boolean=>!!storageDefinition(depot)?.accepted.includes(item);
const stocked=(depot:Construction,item:string):number=>depot.stock?.[item]??0;
function reachablePlots(world:World,npc:Character,zone:FarmingZone){
 return availablePlots(world,zone).map(position=>{
  const target:Resource={id:zone.id+":plot:"+position.x+":"+position.y,kind:"resource",
   resourceType:"food",position,quantity:0,maximum:0};
  const route=routeToEntity(world,npc.position,target,npc.id);
  return route?{position,route,target}:null;
 }).filter((x):x is {position:Position;route:Position[];target:Resource}=>!!x)
 .sort((a,b)=>a.route.length-b.route.length||a.position.y-b.position.y||a.position.x-b.position.x);
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
   if(free>=4){
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
function storedCargo(world:World,npc:Character):Task|null {
 const inventory=npc.inventory??{},warehouses=depots(world).filter(d=>d.blueprintId==="building.depot");
 for(const [item,quantity] of Object.entries(inventory)){
  if(quantity<=0||!ITEMS[item])continue;
  // Keep seeds needed by an existing plot in hand until planting has been attempted.
  if(ITEMS[item].category==="seed"&&world.entities.some(e=>e.kind==="planting_zone"&&
    naturalSource(e.sourceId)?.seedItem===item&&reachablePlots(world,npc,e).length>0))continue;
  const task=selectTask(world,npc,warehouses.filter(d=>acceptedBy(d,item)&&storageFree(d)>0),
   "Armazenando recursos","Armazenar "+quantity+" "+ITEMS[item].label+
   " com transporte físico","storage.deposit",
   d=>({materialId:item,quantity:Math.min(quantity,storageFree(d as Construction))}));
  if(task)return {...task,domain:"hauling"};
 }
 return null;
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
 return ranked[0].score>=1.25?ranked[0].item:null;
}
function equipmentTask(world:World,npc:Character):Task|null{
 const item=desiredTool(npc);
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
function constructionTasks(world:World,npc:Character):{deliver:Task|null;work:Task|null;source:Task|null}{
 const projects=sites(world),warehouses=depots(world);
 const inventory=npc.inventory??{},free=CARRY_LIMIT-load(npc);
 let deliver:Task|null=null,work:Task|null=null,source:Task|null=null;
 for(const site of projects){
  const missing=materialsRemaining(site);
  for(const [item,amount] of Object.entries(missing)){
   if(amount<=0)continue;
   if((inventory[item]??0)>0&&!deliver)
    deliver=selectTask(world,npc,[site],"Entregando materiais",
     "Canteiro requer "+item,"construction.deliver",
     ()=>({materialId:item,quantity:Math.min(amount,inventory[item])}));
   if(free>0&&!source){
    source=selectTask(world,npc,warehouses.filter(d=>stocked(d,item)>0),
     "Buscando material","Levar "+item+" ao canteiro","storage.withdraw",
     target=>({materialId:item,quantity:Math.min(amount,free,stocked(target as Construction,item))}));
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
 if(CARRY_LIMIT-load(npc)<4)return null;
 const trees=world.entities.filter((e):e is Resource=>e.kind==="resource"&&
  e.sourceId==="apple_tree"&&e.life?.stage==="dead");
 const task=selectTask(world,npc,trees,"Cortando madeira seca","Remover macieira morta e recuperar madeira","nature.cut");
 return task?{...task,domain:"woodcutting"}:null;
}
const adjacentCells=(npc:Character)=>[{x:npc.position.x+1,y:npc.position.y},{x:npc.position.x-1,y:npc.position.y},{x:npc.position.x,y:npc.position.y+1},{x:npc.position.x,y:npc.position.y-1}];
function idleStep(world:World,npc:Character,execute:ActionHandler):boolean{
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
function choose(world:World,npc:Character):Task|null{
 const funeral=burialTask(world,npc);
 if(funeral)return funeral;
 const construction=constructionTasks(world,npc);
 // Urgent delivery is followed through before any new collection.
 if(construction.deliver)return construction.deliver;
 const production=productionTask(world,npc);
 if(production?.action==="storage.deposit")return production;
 const equipment=equipmentTask(world,npc);
 if(equipment?.action==="npc.equip")return equipment;
 const cargo=storedCargo(world,npc);
 if(cargo)return cargo;
 // New work is chosen by affinities; no trait can bypass survival or valid physical actions.
 const farming=plantingTask(world,npc);
 const demanded=choosePreferred(npc,[farming,construction.work,production,construction.source,equipment,deadwoodTask(world,npc)]);
 return demanded??stockpileTask(world,npc);
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
function foodTask(world:World,npc:Character):Task|null {
 const warehouses=depots(world),free=CARRY_LIMIT-load(npc);
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
 const harvest=selectTask(world,npc,edibleSources.filter(r=>free>(naturalSource(r.sourceId!)?.seedsPerHarvest??0)),
  "Colhendo alimento","Saciedade baixa; colher alimento pronto para consumo","resource.harvest");
 if(harvest)return harvest;
 // Free only cargo that can be physically deposited, and only when a reachable
 // food source or stocked warehouse can benefit from the extra capacity.
 const reachable=edibleSources.filter(r=>routeToEntity(world,npc.position,r,npc.id));
 const required=Math.min(...reachable.map(r=>(naturalSource(r.sourceId!)?.seedsPerHarvest??0)+1),
  ...(warehouses.some(d=>Object.keys(FOOD_ITEMS).some(id=>stocked(d,id)>0)&&routeToEntity(world,npc.position,d,npc.id))?[1]:[]));
 if(free>=required||!Number.isFinite(required))return null;
 for(const [item,amount] of Object.entries(npc.inventory??{})){
  if(amount<=0||Object.hasOwn(FOOD_ITEMS,item))continue;
  const task=selectTask(world,npc,warehouses.filter(d=>acceptedBy(d,item)&&storageFree(d)>0),
   "Liberando espaço para alimento","Preciso comer; liberar capacidade para coleta",
   "storage.deposit",target=>({materialId:item,quantity:Math.min(amount,storageFree(target as Construction),required-free)}));
  if(task)return task;
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
 if(npc.energy>=NPC_REST_RECOVER_TO&&(npc.health>=65||(npc.health<65&&(npc.satiety??100)<=20))){
  npc.ai.resting=false;releaseBed(world,npc);return false;
 }
 let house=reservedHouse(world,npc);
 let route=house?routeToEntity(world,npc.position,house,npc.id):null;
 if(house&&!route){releaseBed(world,npc);house=undefined;}
 if(!house){
  const candidates=world.entities.filter((e):e is Construction=>e.kind==="construction"&&
   bedsIn(e)>0&&reservationCount(e)<bedsIn(e));
  const reachable=candidates.map(target=>({target,route:routeToEntity(world,npc.position,target,npc.id)}))
   .filter((entry):entry is {target:Construction;route:Position[]}=>!!entry.route)
   .sort((a,b)=>a.route.length-b.route.length||a.target.id.localeCompare(b.target.id));
  for(const entry of reachable){
   if(reserveBed(world,npc,entry.target)){house=entry.target;route=entry.route;break;}
  }
 }
 if(house&&route&&route.length>1){
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
 const sheltered=!!house;
 const gain=sleepRecovery(world,npc,house);
 npc.energy=Math.min(100,npc.energy+gain);
 // Healing is owned by systems/health; never double-apply during rest.
 record(npc,world,sheltered?"Dormindo":"Descansando",
  sheltered?"Cama reservada; recuperação +"+gain+" energia por ciclo":
   "Sem cama acessível; recuperação lenta +"+gain+" energia por ciclo",house?.id);
 return true;
}
function executeTask(world:World,npc:Character,task:Task,execute:ActionHandler):void {
 const effective=resolveAttributes({...npc,attributes:{...npc.attributes,energy:npc.energy,health:npc.health}},world.tick).values;
 const cycle=Math.floor(world.tick/NPC_ACTION_INTERVAL);
 if(task.route.length>1&&effective.movementSpeed<.8&&cycle%2===1){
  record(npc,world,"Movimento lento","Atributos/efeitos reduzem velocidade; recuperando fôlego",task.target.id,task.route.slice(1));
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
  if(result.ok)record(npc,world,"Deslocando-se",task.reason,task.targetId??task.target.id,task.route.slice(1));
  else record(npc,world,"Bloqueado","Caminho mudou ("+result.error+"); recalculará no próximo ciclo",task.targetId??task.target.id);
  return;
 }
 const result=execute({commandId:"ai-"+world.tick+"-"+npc.id,worldId:world.id,
  actorRole:"npc",actorId:npc.id,action:task.action,targetId:task.targetId??task.target.id,
  position:task.position,parameters:task.parameters});
 record(npc,world,result.ok?task.activity:"Bloqueado",
  result.ok?task.reason:"Ação rejeitada ("+result.error+"); nova decisão no próximo ciclo",task.targetId??task.target.id);
}
export function advanceNpcDecisions(world:World,execute:ActionHandler):void {
 if(world.tick%NPC_ACTION_INTERVAL!==0)return;
 const characters=world.entities.filter((e):e is Character=>e.kind==="character"&&!e.ownerId);
 for(const npc of characters){
  if(npc.health<=0){
   releaseBed(world,npc);
   record(npc,world,null,"Sem condições de agir: saúde zero");continue;
  }
  // Survival comes first. Hunger interrupts travel, work, and even sleep.
  if((npc.satiety??100)<=EAT_THRESHOLD){
   const edible=Object.values(FOOD_ITEMS).find(food=>(npc.inventory?.[food.id]??0)>0);
   if(edible){
    const result=execute({commandId:"ai-eat-"+world.tick+"-"+npc.id,worldId:world.id,
     actorRole:"npc",actorId:npc.id,action:"npc.eat",targetId:npc.id,parameters:{itemId:edible.id}});
    record(npc,world,result.ok?"Alimentando-se":"Aguardando alimento",
     result.ok?"Consumiu "+edible.label+" do próprio inventário":"Não conseguiu se alimentar ("+(result.ok?"":result.error)+")");
    continue;
   }
   const task=npc.energy>0?foodTask(world,npc):null;
   if(task){releaseBed(world,npc);npc.ai&&(npc.ai.resting=false);executeTask(world,npc,task,execute);continue;}
  }
  if(rest(world,npc,execute))continue;
  if((npc.satiety??100)<=10){
   record(npc,world,null,"Fome crítica: sem alimento acessível; trabalho não essencial suspenso");
   continue;
  }
  const task=choose(world,npc);
  if(!task){
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
