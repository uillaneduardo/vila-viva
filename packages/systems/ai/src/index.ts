import type {World,Character,Entity,Resource,Construction,Command,Result,Position} from "../../../domain/src/contracts.ts";
import {routeToEntity} from "../../pathfinding/src/index.ts";
import {materialsRemaining,hasMaterials,storageDefinition,storageFree} from "../../construction/src/index.ts";

export const NPC_ACTION_INTERVAL=3;
export const NPC_REST_THRESHOLD=15;
export const NPC_REST_RECOVER_TO=75;
export const NPC_REST_GAIN=12;
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
export function advanceNpcDecisions(world:World,execute:ActionHandler):void {
 if(world.tick%NPC_ACTION_INTERVAL!==0)return;
 const characters=world.entities.filter((e):e is Character=>e.kind==="character"&&!e.ownerId);
 for(const npc of characters){
  if(npc.health<=0){record(npc,world,null,"Sem condições de agir: saúde zero");continue;}
  if(npc.ai?.resting||npc.energy<=NPC_REST_THRESHOLD){
   npc.ai??={activity:null,reason:"",route:[],lastDecisionTick:world.tick,history:[]};
   npc.ai.resting=true;
   npc.energy=Math.min(100,npc.energy+NPC_REST_GAIN);
   if(npc.energy<NPC_REST_RECOVER_TO){
    record(npc,world,"Descansando","Energia baixa; recupera energia parado (abrigo ainda não implementado)");
    continue;
   }
   npc.ai.resting=false;
  }
  const task=choose(world,npc);
  if(!task){
   record(npc,world,null,"Sem objetivo executável: falta estoque, fonte acessível ou depósito disponível");
   continue;
  }
  if(task.route.length>1){
   const next=task.route[1];
   const result=execute({commandId:"ai-"+world.tick+"-"+npc.id,worldId:world.id,actorRole:"npc",
    actorId:npc.id,action:"movement.move",targetId:npc.id,position:next});
   if(result.ok)record(npc,world,"Deslocando-se",task.reason,task.target.id,task.route.slice(1));
   else record(npc,world,"Bloqueado","Caminho mudou ("+result.error+"); recalculará no próximo ciclo",task.target.id);
   continue;
  }
  const result=execute({commandId:"ai-"+world.tick+"-"+npc.id,worldId:world.id,
   actorRole:"npc",actorId:npc.id,action:task.action,targetId:task.target.id,parameters:task.parameters});
  record(npc,world,result.ok?task.activity:"Bloqueado",
   result.ok?task.reason:"Ação rejeitada ("+result.error+"); nova decisão no próximo ciclo",task.target.id);
 }
}
