import {performance} from "node:perf_hooks";
import {createWorld,applyCommand,advanceTick} from "../packages/engine/src/engine.ts";
import {bootstrapSeededWorld} from "../packages/content/src/world-seeds.ts";
import {FOOD_ITEMS} from "../packages/content/src/foods.ts";
import {createCommunityDiagnostics} from "./community-diagnostics.mts";
const diagnostics=createCommunityDiagnostics();
const seed=process.argv[2]??"oturo-starter-v1";
const ticks=Number(process.argv[3]??15000);
if(!Number.isSafeInteger(ticks)||ticks<1||ticks>100000)throw Error("Invalid tick count");
const w=createWorld("measurement",24,16);
bootstrapSeededWorld(w,seed,c=>applyCommand(w,{...c,worldId:w.id,actorRole:"admin"}));
const actions:Record<string,number>={};
const samples:unknown[]=[];
const sample=()=>{
 const alive=w.entities.filter(e=>e.kind==="character"&&!e.ownerId&&e.health>0);
 const dead=w.entities.filter(e=>e.kind==="character"&&!e.ownerId&&e.health<=0);
 const buildings=w.entities.filter(e=>e.kind==="construction");
 const burials=buildings.flatMap(e=>e.burials??[]);
 const crops=w.entities.filter(e=>e.kind==="resource"&&e.sourceId);
 const nutrition=(stock)=>Object.values(FOOD_ITEMS).reduce((n,f)=>n+(stock?.[f.id]??0)*f.satiety,0);
 return {tick:w.tick,living:alive.length,dead:dead.length+burials.length,
  starving:alive.filter(e=>(e.satiety??100)<=10).length,
  meanSatiety:alive.length?alive.reduce((n,e)=>n+(e.satiety??100),0)/alive.length:null,
  personalNutrition:alive.reduce((n,e)=>n+nutrition(e.inventory),0),
  storedNutrition:buildings.filter(e=>e.status==="completed").reduce((n,e)=>n+nutrition(e.stock),0),
  groundItems:w.entities.filter(e=>e.kind==='item').reduce((n,e)=>n+e.quantity,0),
  groundSeeds:w.entities.filter(e=>e.kind==='item'&&e.itemId.endsWith('_seed')).reduce((n,e)=>n+e.quantity,0),
  cropFood:crops.reduce((n,e)=>n+e.quantity,0),deadCrops:crops.filter(e=>e.life?.stage==="dead").length,
  completed:buildings.filter(e=>e.status==="completed").length,
  blocked:alive.filter(e=>e.ai?.activity==="Bloqueado").length};
};
samples.push(sample());diagnostics.observe(w);const start=performance.now();
for(let i=0;i<ticks;i++){
 advanceTick(w,a=>{actions[a.action]=(actions[a.action]??0)+1;});
 diagnostics.observe(w);
 if((i+1)%1000===0||i+1===ticks)samples.push(sample());
}
const elapsedMs=performance.now()-start;
console.log(JSON.stringify({seed,ticks,elapsedMs,msPerTick:elapsedMs/ticks,actions,samples,diagnostics:diagnostics.report(),timingIncludesDiagnostics:true},null,2));
