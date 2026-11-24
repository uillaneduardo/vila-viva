import type {World,Character,Entity} from "../packages/domain/src/contracts.ts";
import {FOOD_ITEMS} from "../packages/content/src/foods.ts";
import {naturalSource} from "../packages/content/src/natural-sources.ts";
import {storageDefinition} from "../packages/systems/construction/src/index.ts";
import {routeToEntity} from "../packages/systems/pathfinding/src/index.ts";
import {EAT_THRESHOLD} from "../packages/systems/needs/src/index.ts";
const nutrition=(stock:Record<string,number>|undefined)=>Object.values(FOOD_ITEMS).reduce((n,f)=>n+(stock?.[f.id]??0)*f.satiety,0);
const increment=(counts:Record<string,number>,key:string)=>{counts[key]=(counts[key]??0)+1;};
function externalFood(e:Entity):number {
 if(e.kind==="construction")return storageDefinition(e)?nutrition(e.stock):0;
 if(e.kind==="item")return nutrition({[e.itemId]:e.quantity});
 if(e.kind==="resource"&&e.sourceId&&e.life?.stage!=="dead"){
  const def=naturalSource(e.sourceId);return def?nutrition({[def.productId]:e.quantity}):0;
 }
 return 0;
}
/** Read-only, headless diagnostics. Reachability is instantaneous, not a reservation or guarantee of successful consumption. */
export function foodAccess(world:World,npc:Character){
 const sources=world.entities.filter(e=>externalFood(e)>0);
 const personal=nutrition(npc.inventory);
 const external=sources.reduce((n,e)=>n+externalFood(e),0);
 const reachable=sources.filter(e=>routeToEntity(world,npc.position,e,npc.id)!==null).reduce((n,e)=>n+externalFood(e),0);
 return {personal,external,reachable,load:Object.values(npc.inventory??{}).reduce((n,q)=>n+Math.max(0,q),0)};
}
export function createCommunityDiagnostics(){
 const activityTicks:Record<string,number>={},criticalSamples:Record<string,number>={};
 const perNpc:Record<string,{observations:number;blockedTicks:number;idleTicks:number;targetChanges:number;lastTarget?:string}>={};
 const targetRuns:Record<string,{target:string;start:number;last:number}>={};
 const taskRuns={completedRuns:0,shortRuns:0,totalTicks:0,maxTicks:0};
 const finish=(id:string)=>{const run=targetRuns[id];if(!run)return;const duration=run.last-run.start+1;taskRuns.completedRuns++;taskRuns.totalTicks+=duration;if(duration<=3)taskRuns.shortRuns++;taskRuns.maxTicks=Math.max(taskRuns.maxTicks,duration);delete targetRuns[id];};
 const deaths:unknown[]=[];const seen=new Set<string>();
 let observations=0;
 return {
  observe(world:World){
   observations++;
   for(const e of world.entities){
    if(e.kind!=="character"||e.ownerId)continue;
    if(e.health<=0){
     finish(e.id);
     if(!seen.has(e.id)){seen.add(e.id);deaths.push({id:e.id,tick:world.tick,deathTick:e.deathTick,cause:e.causeOfDeath,satiety:e.satiety,energy:e.energy,activity:e.ai?.activity,reason:e.ai?.reason,history:e.ai?.history?.map(h=>({...h})),...foodAccess(world,e)});}
     continue;
    }
    const a=e.ai?.activity??"Aguardando";
    increment(activityTicks,a);
    const p=perNpc[e.id]??={observations:0,blockedTicks:0,idleTicks:0,targetChanges:0};
    p.observations++;if(a==="Bloqueado")p.blockedTicks++;if(!e.ai?.activity)p.idleTicks++;
    if(p.lastTarget&&e.ai?.targetId&&p.lastTarget!==e.ai.targetId)p.targetChanges++;
    p.lastTarget=e.ai?.targetId;
    const target=e.ai?.targetId;
    if(targetRuns[e.id]?.target!==target)finish(e.id);
    if(target){const run=targetRuns[e.id]??={target,start:world.tick,last:world.tick};run.last=world.tick;}
    // Route probes only on critical hunger and every 24 world ticks, not the hot path.
    if((e.satiety??100)<=Math.min(10,EAT_THRESHOLD)&&world.tick%24===0){
     const f=foodAccess(world,e);
     increment(criticalSamples,f.personal>0?"personal_food":f.external===0?"no_external_food":f.reachable===0?"no_route":f.load>=12?"full_inventory":"reachable_food");
    }
   }
  },
  report(){return {observations,activityTicks,criticalSamples,perNpc,deaths,targetRuns:{...taskRuns,openRuns:Object.keys(targetRuns).length}};}
 };
}
