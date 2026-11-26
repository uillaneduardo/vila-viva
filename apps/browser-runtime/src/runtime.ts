import {createWorld,applyCommand,advanceTick} from "../../../packages/engine/src/engine.ts";
import {bootstrapSeededWorld} from "../../../packages/content/src/world-seeds.ts";
import {validateSnapshot,MAX_SNAPSHOT_BYTES} from "../../../packages/protocol/src/world-snapshot.ts";
import {TickScheduler} from "../../server/src/tick-scheduler.mts";
import {catalogView,economyView,inspectView,projectWorldView,clockView} from "./views.ts";
import type {World,Command} from "../../../packages/domain/src/contracts.ts";
export function createBrowserRuntime({publish=(_data:any,_meta:any)=>{},uuid=()=>crypto.randomUUID()}={}){
 let world:World,clock={speed:0},timelineId=uuid(),epoch=0,revision=0,sequence=0;
 let history:any[]=[],saves=new Map<string,any>();const scheduler=new TickScheduler();
 function make(seed="oturo-starter-v1",width=24,height=16){const next=createWorld("first-world",width,height);bootstrapSeededWorld(next,seed,c=>applyCommand(next,{...c,worldId:next.id,actorRole:"admin"}));return next;}
 world=make();
 const view=()=>projectWorldView(world,clock,timelineId,false,"browser");
 const snapshot=()=>({formatVersion:1,savedAt:new Date().toISOString(),timelineId,lastSequence:sequence,world:structuredClone(world),clock:{speed:clock.speed},seed:world.seed});
 const notify=(reset=false)=>publish(view(),{reset,epoch,revision:++revision,sampleTime:performance.now()});
 function switchWorld(next:World){world=next;clock.speed=0;timelineId=uuid();epoch++;sequence=0;history=[];scheduler.reset();notify(true);}
 function record(actions:any[]){if(!actions.length)return;history.push({formatVersion:1,timelineId,sequence:++sequence,tick:world.tick,recordedAt:new Date().toISOString(),actions});if(history.length>5000)history.shift();}
 function command(c:any,role="admin"){if(typeof c?.commandId!=="string"||!/^[-\w]{1,80}$/.test(c.commandId))throw Error("INVALID_PAYLOAD");const actions:any[]=[];const result=applyCommand(world,{worldId:world.id,commandId:c.commandId,actorRole:role as Command["actorRole"],actorId:role==="npc"?c.actorId:undefined,action:c.action,targetId:c.targetId,position:c.position,parameters:c.parameters},{onAction:a=>actions.push(a)});record(actions);return result;}
 function pulse(){scheduler.pulse(clock.speed,()=>{const actions:any[]=[];advanceTick(world,a=>actions.push(a));record(actions);notify();});}
 function request(path:string,input:any={}){
  const u=new URL(path,"https://local.invalid"),p=u.pathname;
  if(p==="/api/catalog")return catalogView();
  if(p==="/api/world")return view();
  if(p==="/api/inspect"){const d=inspectView(world,u.searchParams.get("entityId"));if(!d)throw Error("NOT_FOUND");return d;}
  if(p==="/api/economy")return economyView(world);
  if(p==="/api/world/export")return snapshot();
  if(p==="/api/world/saves")return {persistent:false,saves:[...saves].map(([name,s])=>({name,tick:s.world.tick,savedAt:s.savedAt}))};
  if(p==="/api/world/logs")return {timelineId,logs:[{timelineId,active:true}]};
  if(p==="/api/world/activity")return {timelineId,ticks:history.slice(-Math.min(5000,Number(u.searchParams.get("limit"))||80))};
  if(p==="/api/world/activity/export")return history.map(x=>JSON.stringify(x)).join("\n");
  if(p==="/api/commands"){const result=command(input,input.role==="npc"?"npc":"admin");notify();if(!result.ok)throw Error(result.error);return {result,clock:clockView(world,clock)};}
  if(input.role!=="admin")throw Error("UNAUTHORIZED");
  if(p==="/api/clock"){if(![0,1,2,4].includes(input.speed))throw Error("INVALID_SPEED");clock.speed=input.speed;scheduler.reset();notify();return {clock:clockView(world,clock)};}
  if(p==="/api/brush"){const cs=input.commands;if(!Array.isArray(cs)||cs.length<1||cs.length>225||cs.some(c=>!["npc.spawn","resource.spawn","obstacle.spawn","construction.place","farming.zone.create"].includes(c?.action)||typeof c.commandId!=="string"||!/^[-\w]{1,80}$/.test(c.commandId)))throw Error("INVALID_PAYLOAD");const results=cs.map(c=>command(c));notify();return {results,clock:clockView(world,clock)};}
  if(p==="/api/world/new"){if(!["24x16","32x24","48x32","64x48"].includes(input.width+"x"+input.height)||typeof input.seed!=="string"||!input.seed.trim()||input.seed.length>80)throw Error("INVALID_WORLD_SIZE_OR_SEED");switchWorld(make(input.seed,input.width,input.height));return {ok:true};}
  if(p==="/api/world/save"){if(typeof input.name!=="string"||!/^[a-zA-Z0-9][\w-]{0,63}$/.test(input.name))throw Error("INVALID_SAVE_NAME");if(!saves.has(input.name)&&saves.size>=20)throw Error("SAVE_LIMIT");saves.set(input.name,snapshot());return {name:input.name,tick:world.tick};}
  if(p==="/api/world/load"||p==="/api/world/import"){const s=p.endsWith("load")?saves.get(input.name):input.snapshot;if(!s)throw Error("NOT_FOUND");if(new TextEncoder().encode(JSON.stringify(s)).length>MAX_SNAPSHOT_BYTES)throw Error("SNAPSHOT_TOO_LARGE");validateSnapshot(s);switchWorld(structuredClone(s.world));return {ok:true};}
  throw Error("LOCAL_ENDPOINT_UNSUPPORTED");
 }
 return {request,pulse,view,notify};
}
