import type {World,Character,Construction,Position,Command,Result} from "../../../domain/src/contracts.ts";
import {buildingBlueprint} from "../../../content/src/buildings/registry.ts";
import {LEADERSHIP_PROJECTS,LEADER_DECISION_INTERVAL,MAX_SIMULTANEOUS_PROJECTS} from "../../../content/src/leadership.ts";
import {canPlaceFootprint} from "../../collision/src/index.ts";
import {routeToEntity} from "../../pathfinding/src/index.ts";
import {bedsIn} from "../../housing/src/index.ts";
import {availableGraves,visibleCorpses} from "../../mortality/src/index.ts";
export type ProposedConstruction={blueprintId:string;position:Position;score:number;reason:string};
const manhattan=(a:Position,b:Position)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const living=(world:World):Character[]=>world.entities.filter((e):e is Character=>
 e.kind==="character"&&!e.ownerId&&e.health>0);
const buildings=(world:World):Construction[]=>world.entities.filter((e):e is Construction=>
 e.kind==="construction"&&e.status!=="destroyed");
const isProjectNeeded=(world:World,id:string):boolean=>{
 const existing=buildings(world);
 if(id==="building.depot")return !existing.some(b=>b.blueprintId===id);
 if(id==="building.community_house"){
  const capacity=existing.filter(b=>b.blueprintId===id).reduce((sum,b)=>sum+
   (b.status==="site"?(buildingBlueprint(id)?.housing?.adultBeds??0):bedsIn(b)),0);
  return capacity<living(world).length;
 }
 if(id==="building.cemetery"){
  const reserved=existing.filter(b=>b.blueprintId===id).reduce((sum,b)=>
   sum+(b.status==="site"?(buildingBlueprint(id)?.cemetery?.capacity??0):availableGraves(b)),0);
  return reserved<=visibleCorpses(world).length ||!existing.some(b=>b.blueprintId===id);
 }
 return false;
};
const availableResources=(world:World):Set<string>=>{
 const items=new Set<string>();
 for(const entity of world.entities){
  if(entity.kind==="resource"&&entity.quantity>0)items.add(entity.resourceType);
  if(entity.kind==="construction"&&entity.status==="completed")
   for(const [key,amount] of Object.entries(entity.stock??{}))if(amount>0)items.add(key);
  if(entity.kind==="character"&&entity.health>0)
   for(const [key,amount] of Object.entries(entity.inventory??{}))if(amount>0)items.add(key);
 }
 return items;
};
function locationCandidates(world:World,leader:Character,blueprintId:string):{position:Position;score:number}|undefined {
 const def=buildingBlueprint(blueprintId);
 if(!def)return undefined;
 const citizens=living(world);
 const midpoint={x:Math.round(citizens.reduce((n,a)=>n+a.position.x,0)/Math.max(1,citizens.length)),
  y:Math.round(citizens.reduce((n,a)=>n+a.position.y,0)/Math.max(1,citizens.length))};
 const relevantSources=world.entities.filter(e=>e.kind==="resource"&&
  ["wood","stone"].includes(e.resourceType)&&e.quantity>0);
 const constructed=buildings(world).filter(b=>b.status==="completed");
 let best:{position:Position;score:number}|undefined;
 for(let y=1;y<world.height-def.footprint.height;y++)for(let x=1;x<world.width-def.footprint.width;x++){
  const position={x,y};
  if(!canPlaceFootprint(world,position,def.footprint.width,def.footprint.height))continue;
  if(world.entities.some(e=>e.kind==="planting_zone"&&
   position.x<e.position.x+e.footprint.width&&position.x+def.footprint.width>e.position.x&&
   position.y<e.position.y+e.footprint.height&&position.y+def.footprint.height>e.position.y))continue;
  const target:Construction={kind:"construction",id:"candidate",position,
   footprint:{...def.footprint},blueprintId,blueprintVersion:def.version,
   status:"site",availability:"unavailable",stageIndex:0,delivered:{},workDone:0};
  const route=routeToEntity(world,leader.position,target,leader.id);
  if(!route)continue;
  const center={x:x+(def.footprint.width-1)/2,y:y+(def.footprint.height-1)/2};
  const sourceDistance=relevantSources.length?
   Math.min(...relevantSources.map(e=>manhattan(center,e.position))):8;
  const currentBuildingDistance=constructed.length?
   Math.min(...constructed.map(e=>manhattan(center,e.position))):5;
  const popDistance=manhattan(center,midpoint);
  const cemetery=blueprintId==="building.cemetery";
  const score=-(route.length-1)*1.5-Math.min(15,sourceDistance)*.32-
   (cemetery?Math.abs(popDistance-7)*1.3:popDistance*.9)-
   (cemetery?0:Math.abs(currentBuildingDistance-4)*.2);
  if(!best||score>best.score||(score===best.score&&(y<best.position.y||y===best.position.y&&x<best.position.x)))
   best={position,score};
 }
 return best;
}
/** Planning produces an intent; ONLY engine command validation can create a construction. */
export function proposeNextConstruction(world:World,leader:Character):ProposedConstruction|undefined {
 if(leader.communityRole!=="leader"||leader.health<=0)return undefined;
 if(buildings(world).filter(b=>b.status==="site").length>=MAX_SIMULTANEOUS_PROJECTS)return undefined;
 const available=availableResources(world);
 const candidates=LEADERSHIP_PROJECTS.filter(policy=>isProjectNeeded(world,policy.blueprintId))
  .map(policy=>{
   const blueprint=buildingBlueprint(policy.blueprintId);
   if(!blueprint)return undefined;
   // No magical material supply; a project only makes sense with a physical source or stock.
   const missing=Object.keys(blueprint.stages[0].materials).filter(item=>!available.has(item));
   if(missing.length)return undefined;
   const location=locationCandidates(world,leader,policy.blueprintId);
   if(!location)return undefined;
   const emergency=policy.blueprintId==="building.cemetery"&&visibleCorpses(world).length>0?60:0;
   return {blueprintId:policy.blueprintId,position:location.position,
    score:policy.priority+emergency+location.score,
    reason:policy.need+"; localização acessível, materiais iniciais existentes e sem sobreposição"};
  }).filter((x):x is ProposedConstruction=>!!x);
 candidates.sort((a,b)=>b.score-a.score||a.blueprintId.localeCompare(b.blueprintId));
 return candidates[0];
}
export function advanceLeaderDecisions(world:World,execute:(cmd:Command)=>Result):void {
 if(world.tick%LEADER_DECISION_INTERVAL!==0)return;
 const leader=living(world).find(npc=>npc.communityRole==="leader");
 if(!leader)return;
 leader.leadership??={lastPlanTick:-1,lastReason:"Avaliando comunidade"};
 const active=buildings(world).find(site=>site.status==="site");
 if(active){
  leader.leadership.lastReason="Obra em andamento: "+(buildingBlueprint(active.blueprintId)?.label??active.blueprintId);
  return;
 }
 const proposal=proposeNextConstruction(world,leader);
 if(!proposal){
  leader.leadership.lastReason="Sem projeto viável: verificar demanda, recursos disponíveis e terreno acessível";
  return;
 }
 const id="leader-"+leader.id+"-"+world.tick;
 const outcome=execute({worldId:world.id,commandId:id,actorRole:"npc",actorId:leader.id,
  action:"construction.propose",position:proposal.position,
  parameters:{blueprintId:proposal.blueprintId,mode:"site",reason:proposal.reason}});
 leader.leadership.lastPlanTick=world.tick;
 leader.leadership.lastReason=outcome.ok?proposal.reason:"Proposta recusada: "+outcome.error;
 if(outcome.ok){
  leader.leadership.lastBlueprintId=proposal.blueprintId;
  leader.leadership.lastSiteId="construction-"+id;
 }
}
