import {displayText} from "../../../packages/domain/src/localization.ts";
import {baseRegistry,RESOURCE_PRESETS} from "../../../packages/content/src/catalog.ts";
import {EFFECTS} from "../../../packages/content/src/effects/catalog.ts";
import {COMMUNITY_HOUSE} from "../../../packages/content/src/buildings/community-house.ts";
import {NATURAL_SOURCES} from "../../../packages/content/src/natural-sources.ts";
import {SCENERY_PRESETS} from "../../../packages/content/src/scenery.ts";
import {resolveAttributes} from "../../../packages/systems/effects/src/resolver.ts";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {resolve,extname,sep} from "node:path";
import {fileURLToPath} from "node:url";
import {createWorld,applyCommand,advanceTick} from "../../../packages/engine/src/engine.ts";
import {availableActions} from "../../../packages/engine/src/capabilities.ts";
import type {Command,Role,Position} from "../../../packages/domain/src/contracts.ts";

// Explicit opt-in homologation server. There is no authentication/RBAC yet.
// Keep host-side exposure loopback-only via Docker/Cloudflare Tunnel; public Modo Deus is unprotected.
const root=resolve(fileURLToPath(new URL("../../../",import.meta.url)));
const host=process.env.HOST||"127.0.0.1";
const port=Number(process.env.PORT||8086);
export function makePrototype(){
 const world=createWorld("first-world",24,16);
 const init=(action:Command["action"],commandId:string,position:Position,parameters:Record<string,unknown>)=>
   applyCommand(world,{worldId:world.id,actorRole:"admin",commandId,action,position,parameters});
 init("npc.spawn","player-init",{x:4,y:5},{name:"Meu personagem",ownerId:"local-player"});
 init("npc.spawn","npc-init",{x:13,y:9},{name:"Ayla"});
 init("resource.spawn","wood-init",{x:7,y:8},{resourceType:"wood",quantity:30});
 const playerId="npc-player-init";
 const clock={speed:1 as 0|1|2|4};
 const clockView=()=>({speed:clock.speed,paused:clock.speed===0,tick:world.tick,day:1+Math.floor(world.tick/240),hour:Math.floor(world.tick/10)%24,minute:(world.tick%10)*6});
 // Tick is independent from browser refresh. Command-triggered ticks remain
 // a known M1 migration debt and are not hidden as a completed gameplay loop.
 const timer=setInterval(()=>{for(let i=0;i<clock.speed;i++)advanceTick(world);},250);
 timer.unref();
 const json=(res:import("node:http").ServerResponse,status:number,data:unknown)=>{
  res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"});
  res.end(JSON.stringify(data));
 };
 const readBody=async(req:import("node:http").IncomingMessage)=>{
  let raw="";for await(const part of req){raw+=part.toString();if(raw.length>65536)throw Error("BODY_TOO_LARGE");}
  try{return JSON.parse(raw);}catch{throw Error("INVALID_JSON");}
 };
 const server=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url||"/","http://localhost");
   if(url.pathname==="/healthz")return json(res,200,{status:"ok"});
   if(url.pathname==="/version.txt"){
    res.writeHead(200,{"content-type":"text/plain; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"});
    return res.end(req.method==="HEAD"?"":(process.env.SOURCE_SHA||"development")+"\n");
   }
   if(url.pathname==="/api/catalog"&&req.method==="GET")return json(res,200,{
    locale:"pt-BR",
    entities:Object.fromEntries([...baseRegistry.entities].map(([id,d])=>[id,displayText(d.displayName)])),
    actions:Object.fromEntries([...baseRegistry.actions].map(([id,d])=>[id,displayText(d.displayName)])),
    resources:Object.fromEntries(Object.values(RESOURCE_PRESETS).map(p=>[p.resourceType,displayText(baseRegistry.entity(p.definitionId).displayName)])),
    effects:Object.fromEntries(Object.values(EFFECTS).map(e=>[e.id,displayText(e.displayName)])),
    buildings:{[COMMUNITY_HOUSE.id]:displayText(COMMUNITY_HOUSE.displayName)},
    naturalSources:Object.fromEntries(Object.values(NATURAL_SOURCES).map(s=>[s.id,{label:s.label,productId:s.productId,production:s.production,stages:s.stages}])),
    scenery:Object.fromEntries(Object.values(SCENERY_PRESETS).map(s=>[s.id,s.label]))
   });
   if(url.pathname==="/api/world"&&req.method==="GET")return json(res,200,{world,clock:clockView(),storageSummary:null,
    npcViews:Object.fromEntries(world.entities.filter(e=>e.kind==="character").map(e=>[e.id,{
     mood:resolveAttributes({...e,attributes:{...e.attributes,health:e.health,energy:e.energy}},world.tick).values.mood,
     activity:null,route:null
    }])),
    playerId,mode:"local-prototype",persistent:false});
   if(url.pathname==="/api/inspect"&&req.method==="GET"){
    const entity=world.entities.find(e=>e.id===url.searchParams.get("entityId"));
    if(!entity)return json(res,404,{error:"NOT_FOUND"});
    return json(res,200,{entityId:entity.id,
      attributes:entity.kind==="character"?resolveAttributes({...entity,attributes:{...entity.attributes,health:entity.health,energy:entity.energy}},world.tick):null,
      effects:entity.kind==="character"?(entity.effects??[]).map(e=>({
       id:e.instanceId,name:EFFECTS[e.definitionId]?.displayName["pt-BR"]??e.definitionId,
       sourceId:e.sourceId,stacks:e.stacks,expiresAtTick:e.expiresAtTick??null
      })):[],
      activity:null,route:null,inventory:entity.kind==="character"?(entity.inventory??{}):null,
      natural:entity.kind==="resource"&&entity.sourceId?{
       species:entity.sourceId,productId:entity.productId,life:entity.life??null,
       production:NATURAL_SOURCES[entity.sourceId]?.production??null
      }:null,
      scenery:entity.kind==="obstacle"?{type:entity.obstacleType,blocksMovement:entity.blocksMovement,harvestable:false}:null,
      needs:null,social:null,decisions:null
    });
   }
   if(url.pathname==="/api/clock"&&req.method==="POST"){
    const input=await readBody(req);
    if(input?.role!=="admin")return json(res,403,{error:"UNAUTHORIZED"});
    if(![0,1,2,4].includes(input.speed))return json(res,422,{error:"INVALID_PAYLOAD"});
    clock.speed=input.speed;
    return json(res,200,{clock:clockView()});
   }
   if(url.pathname==="/api/actions"&&req.method==="GET"){
    const role:Role=url.searchParams.get("role")==="admin"?"admin":"player";
    const target=world.entities.find(e=>e.id===url.searchParams.get("targetId"));
    const x=Number(url.searchParams.get("x")),y=Number(url.searchParams.get("y"));
    const point=url.searchParams.has("x")&&url.searchParams.has("y")?{x,y}:undefined;
    return json(res,200,{actions:availableActions(world,role,role==="player"?"local-player":undefined,target,point)});
   }
   if(url.pathname==="/api/commands"&&req.method==="POST"){
    const input=await readBody(req);
    if(!input||typeof input!=="object"||typeof input.commandId!=="string"||!/^[-\w]{1,80}$/.test(input.commandId))return json(res,400,{error:"INVALID_PAYLOAD"});
    const role:Role=input.role==="admin"?"admin":input.role==="npc"?"npc":"player";
    const command:Command={worldId:world.id,commandId:input.commandId,actorRole:role,
      actorId:role==="player"?"local-player":role==="npc"?input.actorId:undefined,
      action:input.action,targetId:role==="player"&&input.action==="movement.move"?playerId:input.targetId,
      position:input.position,parameters:input.parameters};
    const result=applyCommand(world,command);
    return json(res,result.ok?200:422,{result,world,clock:clockView()});
   }
   if(url.pathname==="/api/brush"&&req.method==="POST"){
    const input=await readBody(req);
    if(input?.role!=="admin")return json(res,403,{error:"UNAUTHORIZED"});
    if(!Array.isArray(input.commands)||input.commands.length<1||input.commands.length>225)return json(res,422,{error:"INVALID_PAYLOAD"});
    const results=[];
    for(const c of input.commands){
     if(!c||typeof c.commandId!=="string"||!/^[-\w]{1,80}$/.test(c.commandId))return json(res,422,{error:"INVALID_PAYLOAD"});
     if(c.action!=="npc.spawn"&&c.action!=="resource.spawn"&&c.action!=="obstacle.spawn")return json(res,422,{error:"INVALID_PAYLOAD"});
    }
    for(const c of input.commands)results.push(applyCommand(world,{worldId:world.id,actorRole:"admin",commandId:c.commandId,action:c.action,position:c.position,parameters:c.parameters}));
    return json(res,200,{results,world,clock:clockView()});
   }
   if(req.method!=="GET"&&req.method!=="HEAD")return json(res,405,{error:"METHOD_NOT_ALLOWED"});
   const path=url.pathname==="/"?"/apps/player-web/index.html":url.pathname==="/admin"?"/apps/admin-web/index.html":url.pathname;
   // Static binary assets are restricted to approved public UI/world namespaces.
   const publicAsset=path.startsWith("/assets/ui/")||path.startsWith("/assets/world/");
   const assetPath=publicAsset?"/public"+path:path;
   const filename=resolve(root,"."+assetPath);
   if(filename!==root&&!filename.startsWith(root+sep))return json(res,403,{error:"FORBIDDEN"});
   const mime:{[key:string]:string}={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".json":"application/json; charset=utf-8"};
   if(!Object.hasOwn(mime,extname(filename)))return json(res,404,{error:"NOT_FOUND"});
   // Never expose arbitrary repository binary files or JSON data.
   if([".png",".webp"].includes(extname(filename))&&!publicAsset)return json(res,404,{error:"NOT_FOUND"});
   if(extname(filename)===".json"&&!path.startsWith("/assets/world/"))return json(res,404,{error:"NOT_FOUND"});
   const bytes=await readFile(filename);
   res.writeHead(200,{"content-type":mime[extname(filename)],"cache-control":"no-store","x-content-type-options":"nosniff"});
   res.end(req.method==="HEAD"?undefined:bytes);
  }catch(e){
   const error=(e as Error).message;
   if(error==="BODY_TOO_LARGE")return json(res,413,{error});
   if(error==="INVALID_JSON")return json(res,400,{error});
   if((e as NodeJS.ErrnoException).code==="ENOENT")return json(res,404,{error:"NOT_FOUND"});
   json(res,500,{error:"INTERNAL_ERROR"});
  }
 });
 server.on("close",()=>clearInterval(timer));
 return {server,world,clock};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {server}=makePrototype();
 server.listen(port,host,()=>console.log("Sandbox preview: http://"+host+":"+port+" (admin: /admin; local only)"));
}
