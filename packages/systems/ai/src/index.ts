import type {World,Character,Entity,Resource,Construction,Command,Result,Position} from "../../../domain/src/contracts.ts";
import {routeToEntity} from "../../pathfinding/src/index.ts";
import {materialsRemaining,hasMaterials,storageDefinition,storageFree} from "../../construction/src/index.ts";
import {bedsIn,reservationCount,reserveBed,reservedHouse,releaseBed,sleepRecovery} from "../../housing/src/index.ts";
import {EAT_THRESHOLD} from "../../needs/src/index.ts";
import {resolveAttributes} from "../../effects/src/resolver.ts";

export const NPC_ACTION_INTERVAL=3;
export const NPC_REST_THRESHOLD=20;
export const NPC_REST_RECOVER_TO=80;
export const NPC_REST_GAIN=4; // resting outside a house, tuned by endurance; beds recover faster
const CARRY_LIMIT=12;
type ActionHandler=(command:Command)=>Result;
type Task={
 target:Entity; route:Position[]; activity:string; reason:string;
 action:Command["action"]; parameters?:Record<string,unknown>
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
function choose(world:World,npc:Character):Task|null {
 const inventory=npc.inventory??{},free=CARRY_LIMIT-load(npc);
 const warehouses=depots(world),constructionSites=sites(world);
 const materials=constructionSites.map(site=>({site,remaining:materialsRemaining(site)}));
 // 1. Deliver what this worker physically carries to an incomplete site.
 for(const {site,remaining} of materials){
  for(const [item,missing] of Object.entries(remaining)){
   if(missing<=0||!(inventory[item]>0))continue;
   const amount=Math.min(missing,inventory[item]);
   const task=selectTask(world,npc,[site],"Entregando materiais",
    "Obra necessita de "+item+"; inventário do NPC possui "+inventory[item],
    "construction.deliver",()=>({materialId:item,quantity:amount}));
   if(task)return task;
  }
 }
 // 2. Finish a site whose complete stage supplies are already delivered.
 const ready=materials.filter(({site})=>hasMaterials(site)).map(({site})=>site);
 const work=selectTask(world,npc,ready,"Construindo","Todos os materiais da etapa estão no canteiro",
  "construction.work");
 if(work)return work;
 // 3. Fetch missing building materials from real depots or resource sources.
 for(const {remaining} of materials){
  for(const [item,missing] of Object.entries(remaining)){
   if(missing<=0||free<=0)continue;
   const warehouse=selectTask(world,npc,warehouses.filter(d=>stocked(d,item)>0),"Retirando materiais",
    "Falta "+item+" no canteiro; há estoque no depósito","storage.withdraw",
    target=>({materialId:item,quantity:Math.min(missing,free,stocked(target as Construction,item))}));
   if(warehouse)return warehouse;
   const source=selectTask(world,npc,resources(world).filter(r=>!r.sourceId&&r.resourceType===item),
    "Coletando materiais","Falta "+item+" na obra; buscar na fonte física","resource.gather");
   if(source)return source;
  }
 }
 // 4. If carrying something not needed by a site, store it before collecting more.
 for(const [item,amount] of Object.entries(inventory)){
  if(amount<=0)continue;
  const warehouse=selectTask(world,npc,warehouses.filter(d=>acceptedBy(d,item)&&storageFree(d)>0),
   "Armazenando recursos","Inventário do NPC contém "+item+"; depósito tem espaço",
   "storage.deposit",target=>({materialId:item,quantity:Math.min(amount,storageFree(target as Construction))}));
  if(warehouse)return warehouse;
 }
 // 5. Stockpile resources only when a functional depot exists. No magical credits.
 if(free>0){
  const harvestCandidates=resources(world).filter(r=>warehouses.some(d=>
   acceptedBy(d,r.sourceId?r.productId??"":r.resourceType)&&storageFree(d)>0));
  const trees=harvestCandidates.filter(r=>!!r.sourceId);
  const sources=trees.length?trees:harvestCandidates;
  const forage=selectTask(world,npc,sources,"Buscando recursos",
   "Existe espaço no depósito e uma fonte com recurso disponível",
   sources.some(r=>!!r.sourceId)?"resource.harvest":"resource.gather");
  if(forage)return forage;
 }
 return null;
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
 if(free<=0){
  for(const [item,amount] of Object.entries(npc.inventory??{})){
   if(amount<=0||item==="apple")continue;
   const task=selectTask(world,npc,warehouses.filter(d=>acceptedBy(d,item)&&storageFree(d)>0),
    "Liberando espaço para alimento","Preciso comer; inventário cheio",
    "storage.deposit",target=>({materialId:item,quantity:Math.min(amount,storageFree(target as Construction))}));
   if(task)return task;
  }
  return null;
 }
 const stored=selectTask(world,npc,warehouses.filter(d=>stocked(d,"apple")>0),
  "Buscando alimento","Saciedade baixa; buscar maçãs disponíveis no depósito",
  "storage.withdraw",target=>({materialId:"apple",quantity:Math.min(2,free,stocked(target as Construction,"apple"))}));
 if(stored)return stored;
 return selectTask(world,npc,resources(world).filter(r=>r.sourceId==="apple_tree"),
  "Colhendo alimento","Saciedade baixa; procurar macieira com frutos",
  "resource.harvest");
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
 if((npc.satiety??100)>30&&npc.health<100&&world.tick%6===0)
  npc.health=Math.min(100,npc.health+(sheltered?2:1));
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
  if(result.ok)record(npc,world,"Deslocando-se",task.reason,task.target.id,task.route.slice(1));
  else record(npc,world,"Bloqueado","Caminho mudou ("+result.error+"); recalculará no próximo ciclo",task.target.id);
  return;
 }
 const result=execute({commandId:"ai-"+world.tick+"-"+npc.id,worldId:world.id,
  actorRole:"npc",actorId:npc.id,action:task.action,targetId:task.target.id,parameters:task.parameters});
 record(npc,world,result.ok?task.activity:"Bloqueado",
  result.ok?task.reason:"Ação rejeitada ("+result.error+"); nova decisão no próximo ciclo",task.target.id);
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
   if((npc.inventory?.apple??0)>0){
    const result=execute({commandId:"ai-eat-"+world.tick+"-"+npc.id,worldId:world.id,
     actorRole:"npc",actorId:npc.id,action:"npc.eat",targetId:npc.id});
    record(npc,world,result.ok?"Alimentando-se":"Aguardando alimento",
     result.ok?"Consumiu uma maçã física do próprio inventário":"Não conseguiu se alimentar ("+(result.ok?"":result.error)+")");
    continue;
   }
   const task=foodTask(world,npc);
   if(task){releaseBed(world,npc);npc.ai&&(npc.ai.resting=false);executeTask(world,npc,task,execute);continue;}
  }
  if(rest(world,npc,execute))continue;
  const task=choose(world,npc);
  if(!task){
   record(npc,world,null,(npc.satiety??100)<=EAT_THRESHOLD?
    "Com fome e sem alimento acessível; aguardando fonte ou estoque":
    "Sem objetivo executável: falta estoque, fonte acessível ou depósito disponível");
   continue;
  }
  releaseBed(world,npc); // no conditional shelter buff outside actual sleep
  executeTask(world,npc,task,execute);
 }
}
