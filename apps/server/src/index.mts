import {displayText} from "../../../packages/domain/src/localization.ts";
import {baseRegistry,RESOURCE_PRESETS} from "../../../packages/content/src/catalog.ts";
import {EFFECTS} from "../../../packages/content/src/effects/catalog.ts";
import {COMMUNITY_HOUSE} from "../../../packages/content/src/buildings/community-house.ts";
import {BUILDING_BLUEPRINTS} from "../../../packages/content/src/buildings/registry.ts";
import {currentStage,materialsRemaining,hasMaterials,buildingCapabilities,storageDefinition,storedTotal,storageFree} from "../../../packages/systems/construction/src/index.ts";
import {NATURAL_SOURCES} from "../../../packages/content/src/natural-sources.ts";
import {FOOD_ITEMS} from "../../../packages/content/src/foods.ts";
import {countZoneCrops} from "../../../packages/systems/farming/src/index.ts";
import {SCENERY_PRESETS} from "../../../packages/content/src/scenery.ts";
import {resolveAttributes} from "../../../packages/systems/effects/src/resolver.ts";
import {bedsIn,reservationCount} from "../../../packages/systems/housing/src/index.ts";
import {TOOL_PRESETS,injuryProbability} from "../../../packages/systems/risk/src/index.ts";
import {TRAITS} from "../../../packages/content/src/characters.ts";
import {cemeteryCapacity,availableGraves} from "../../../packages/systems/mortality/src/index.ts";
import {createServer} from "node:http";
import {attachWorldStream} from "./world-stream.mts";
import {readFile} from "node:fs/promises";
import {resolve,extname,sep} from "node:path";
import {fileURLToPath} from "node:url";
import {createWorld,applyCommand,advanceTick} from "../../../packages/engine/src/engine.ts";
import {availableActions} from "../../../packages/engine/src/capabilities.ts";
import {FileWorldStore} from "./world-store.mts";
import {bootstrapSeededWorld} from "../../../packages/content/src/world-seeds.ts";
import {parseSnapshot,MAX_SNAPSHOT_BYTES} from "../../../packages/protocol/src/world-snapshot.ts";
import type {AcceptedAction} from "../../../packages/domain/src/activity.ts";
import {LEADERSHIP_PROJECTS} from "../../../packages/content/src/leadership.ts";
import {ITEMS,ITEM_CATEGORIES} from "../../../packages/content/src/items.ts";
import {RECIPES} from "../../../packages/content/src/recipes.ts";
import {productionNeeds} from "../../../packages/systems/leadership/src/production.ts";
import {productionDefinition,activeOrder,stockMissing,canWorkProduction} from "../../../packages/systems/production/src/index.ts";
import type {Command,Role,Position} from "../../../packages/domain/src/contracts.ts";

// Explicit opt-in homologation server. There is no authentication/RBAC yet.
// Keep host-side exposure loopback-only via Docker/Cloudflare Tunnel; public Modo Deus is unprotected.
const root=resolve(fileURLToPath(new URL("../../../",import.meta.url)));
const host=process.env.HOST||"127.0.0.1";
const port=Number(process.env.PORT||8086);
export function makePrototype(options:{dataDir?:string;seed?:string}={}){
 const store=options.dataDir?new FileWorldStore(options.dataDir):null;
 const restored=store?.loadActive();
 let world=restored?structuredClone(restored.world):createWorld("first-world",24,16);
 const clock={speed:0 as 0|1|2|4};
 // Legacy owned avatar is removed from live state, without rewriting named saves or journal.
 const removeLegacyAvatar=(w:typeof world)=>{
  const ids=new Set(w.entities.filter(e=>e.kind==="character"&&e.ownerId==="local-player").map(e=>e.id));
  if(!ids.size)return false;
  w.entities=w.entities.filter(e=>!ids.has(e.id));
  for(const e of w.entities){
   if(e.kind==="construction"&&e.bedReservations)for(const id of ids)delete e.bedReservations[id];
   if(e.kind==="character"&&e.bodyCarriedBy&&ids.has(e.bodyCarriedBy))delete e.bodyCarriedBy;
  }
  return true;
 };
 if(restored&&removeLegacyAvatar(world))store?.commit(world,world.seed);
 const playerId=()=>world.entities.find(e=>e.kind==="character"&&e.ownerId==="local-player")?.id??null;
 const init=(action:Command["action"],commandId:string,position:Position,parameters:Record<string,unknown>)=>{
  const actions:AcceptedAction[]=[];
  const result=applyCommand(world,{worldId:world.id,actorRole:"admin",commandId,action,position,parameters},
   {onAction:a=>actions.push(a)});
  if(!result.ok)throw Error("BOOTSTRAP_FAILED:"+commandId+":"+result.error);
  store?.commit(world,world.seed,actions);
  return result;
 };
 const initialize=(seed?:string)=>{
  if(seed){
   bootstrapSeededWorld(world,seed,command=>init(command.action,command.commandId,command.position,command.parameters));
  }else{
   init("npc.spawn","npc-init",{x:13,y:9},{name:"Ayla"});
   init("resource.spawn","wood-init",{x:7,y:8},{resourceType:"wood",quantity:30});
  }
 };
 if(!restored){
  store?.switchWorld(world,options.seed);
  initialize(options.seed);
 }
 const executeCommand=(command:Command)=>{
  const actions:AcceptedAction[]=[];
  const result=applyCommand(world,command,{onAction:a=>actions.push(a)});
  if(result.ok)store?.commit(world,world.seed,actions);
  return result;
 };
 const progressOneTick=()=>{
  const actions:AcceptedAction[]=[];
  advanceTick(world,a=>actions.push(a));
  store?.commit(world,world.seed,actions);
 };
 const clockView=()=>({speed:clock.speed,paused:clock.speed===0,tick:world.tick,day:1+Math.floor(world.tick/240),hour:Math.floor(world.tick/10)%24,minute:(world.tick%10)*6});
 // Tick is independent from browser refresh. Command-triggered ticks remain
 // a known M1 migration debt and are not hidden as a completed gameplay loop.
 const timer=setInterval(()=>{
  if(clock.speed===0)return;
  try{for(let i=0;i<clock.speed;i++)progressOneTick();}
  catch(error){clock.speed=0;console.error("Simulation paused: persistence failed",error);}
 },250);
 timer.unref();
 const json=(res:import("node:http").ServerResponse,status:number,data:unknown)=>{
  res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"});
  res.end(JSON.stringify(data));
 };
 const readBody=async(req:import("node:http").IncomingMessage)=>{
  const limit=req.url?.startsWith("/api/world/import")?MAX_SNAPSHOT_BYTES+1024:65536;
  let raw="";for await(const part of req){raw+=part.toString();if(Buffer.byteLength(raw)>limit)throw Error("BODY_TOO_LARGE");}
  try{return JSON.parse(raw);}catch{throw Error("INVALID_JSON");}
 };
 let generation=0;
 const projectWorld=()=>{
    const depots=world.entities.filter(e=>e.kind==="construction"&&
     e.blueprintId==="building.depot"&&!!storageDefinition(e));
    const storageSummary=depots.length?
     Object.fromEntries(Object.keys(ITEMS).map(
      item=>[item,depots.reduce((sum,d)=>sum+(d.stock?.[item]??0),0)])):null;
    if(storageSummary){
     storageSummary.food=(storageSummary.apple??0)+(storageSummary.carrot??0)+(storageSummary.potato??0);
     storageSummary.seeds=(storageSummary.apple_seed??0)+(storageSummary.carrot_seed??0)+(storageSummary.potato_seed??0);
    }
    return {world,clock:clockView(),storageSummary,
    npcViews:Object.fromEntries(world.entities.filter(e=>e.kind==="character").map(e=>[e.id,{
     mood:resolveAttributes({...e,attributes:{...e.attributes,health:e.health,energy:e.energy}},world.tick).values.mood,
     activity:e.ai?.activity??null,reason:e.ai?.reason??"Sem tarefa",route:e.ai?.route??null,
     targetId:e.ai?.targetId??null
    }])),
    playerId:playerId(),mode:"local-prototype",persistent:!!store,
    timelineId:store?.timelineId??null};
 };
 const server=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url||"/","http://localhost");
   if(url.pathname==="/healthz")return json(res,200,{status:"ok"});
   if(url.pathname==="/version.txt"){
    res.writeHead(200,{"content-type":"text/plain; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"});
    return res.end(req.method==="HEAD"?"":(process.env.SOURCE_SHA||"development")+"\n");
   }
   if(url.pathname==="/api/world/export"&&req.method==="GET"){
    const snapshot=store?.snapshot(world,world.seed)??{
     formatVersion:1,savedAt:new Date().toISOString(),timelineId:"00000000-0000-4000-8000-000000000000",
     lastSequence:0,world:structuredClone(world),clock:{speed:0}};
    res.writeHead(200,{"content-type":"application/json; charset=utf-8",
     "cache-control":"no-store","content-disposition":'attachment; filename="oturo-world-'+world.tick+'.json"'});
    return res.end(JSON.stringify(snapshot,null,2));
   }
   if(url.pathname==="/api/world/saves"&&req.method==="GET")
    return json(res,200,{saves:store?.listSaves()??[],persistent:!!store});
   if(url.pathname==="/api/world/save"&&req.method==="POST"){
    const input=await readBody(req);
    if(input?.role!=="admin")return json(res,403,{error:"UNAUTHORIZED"});
    if(!store)return json(res,409,{error:"PERSISTENCE_DISABLED"});
    if(typeof input.name!=="string"||!/^[a-zA-Z0-9][\w-]{0,63}$/.test(input.name))
     return json(res,422,{error:"INVALID_SAVE_NAME"});
    store.commit(world,world.seed);
    const saved=store.saveNamed(input.name,world,world.seed);
    return json(res,200,{name:input.name,tick:saved.world.tick,savedAt:saved.savedAt});
   }
   if(url.pathname==="/api/world/logs"&&req.method==="GET")
    return json(res,200,{logs:store?.listLogs()??[],timelineId:store?.timelineId??null});
   if(url.pathname==="/api/world/activity"&&req.method==="GET")
    return json(res,200,{ticks:store?.recentLog(Number(url.searchParams.get("limit")||80))??[],
     timelineId:store?.timelineId??null});
   if(url.pathname==="/api/world/activity/export"&&req.method==="GET"){
    if(!store)return json(res,409,{error:"PERSISTENCE_DISABLED"});
    const timelineId=url.searchParams.get("timeline")??store.timelineId;
    const log=store.getLog(timelineId);
    res.writeHead(200,{"content-type":"application/x-ndjson; charset=utf-8",
     "cache-control":"no-store","content-disposition":'attachment; filename="oturo-activity-'+timelineId+'.jsonl"'});
    return res.end(log);
   }
   const isLoad=url.pathname==="/api/world/load"||url.pathname==="/api/world/import";
   if(isLoad&&req.method==="POST"){
    const input=await readBody(req);
    if(input?.role!=="admin")return json(res,403,{error:"UNAUTHORIZED"});
    if(!store)return json(res,409,{error:"PERSISTENCE_DISABLED"});
    let loaded;
    if(url.pathname==="/api/world/load"){
     if(typeof input.name!=="string")return json(res,422,{error:"INVALID_SAVE_NAME"});
     loaded=store.loadNamed(input.name);
    }else{
     if(!input.snapshot||typeof input.snapshot!=="object")return json(res,422,{error:"INVALID_SNAPSHOT"});
     loaded=parseSnapshot(JSON.stringify(input.snapshot));
    }
    clock.speed=0;
    const restoredWorld=structuredClone(loaded.world);
    removeLegacyAvatar(restoredWorld);
    store.switchWorld(restoredWorld,loaded.seed??restoredWorld.seed);
    world=restoredWorld;generation++;
    return json(res,200,{ok:true,worldId:world.id,tick:world.tick,paused:true,
     timelineId:store.timelineId});
   }
   if(url.pathname==="/api/world/new"&&req.method==="POST"){
    const input=await readBody(req);
    if(input?.role!=="admin")return json(res,403,{error:"UNAUTHORIZED"});
    const seed=input.seed;
    if(seed!==undefined&&(typeof seed!=="string"||!seed.trim()||seed.length>80))
     return json(res,422,{error:"INVALID_SEED"});
    const allowedSizes=new Set(["24x16","32x24","48x32","64x48"]);
    const width=input.width??24,height=input.height??16;
    if(!Number.isInteger(width)||!Number.isInteger(height)||!allowedSizes.has(width+"x"+height))
     return json(res,422,{error:"INVALID_WORLD_SIZE"});
    clock.speed=0;
    const next=createWorld("first-world",width,height);
    if(store)store.switchWorld(next,seed);
    world=next;generation++;
    initialize(seed);
    return json(res,200,{ok:true,tick:world.tick,paused:true,seed:seed??null,width,height});
   }
   if(url.pathname==="/api/economy"&&req.method==="GET"){
    const workshops=world.entities.filter(e=>e.kind==="construction"&&!!productionDefinition(e));
    const depots=world.entities.filter(e=>e.kind==="construction"&&e.blueprintId==="building.depot"&&
     !!storageDefinition(e));
    const leader=world.entities.find(e=>e.kind==="character"&&e.health>0&&e.communityRole==="leader");
    return json(res,200,{
     tick:world.tick,
     leader:leader?.kind==="character"?{id:leader.id,name:leader.name,
      construction:leader.leadership?.lastReason??null,
      production:leader.leadership?.productionReason??null,
      lastRecipe:leader.leadership?.lastRecipeId??null}:null,
     productionNeeds:productionNeeds(world),
     workshops:workshops.map(e=>({id:e.id,blueprintId:e.blueprintId,
      order:activeOrder(e)??null,missing:activeOrder(e)?stockMissing(e,activeOrder(e)!.recipeId):{},
      ready:canWorkProduction(e),stock:e.stock??{}})),
     depots:depots.map(e=>({id:e.id,capacity:storageDefinition(e)?.capacity??0,
      occupied:storedTotal(e),stock:e.stock??{}}))
    });
   }
   if(url.pathname==="/api/catalog"&&req.method==="GET")return json(res,200,{
    locale:"pt-BR",
    entities:Object.fromEntries([...baseRegistry.entities].map(([id,d])=>[id,displayText(d.displayName)])),
    actions:Object.fromEntries([...baseRegistry.actions].map(([id,d])=>[id,displayText(d.displayName)])),
    resources:Object.fromEntries(Object.values(RESOURCE_PRESETS).map(p=>[p.resourceType,displayText(baseRegistry.entity(p.definitionId).displayName)])),
    effects:Object.fromEntries(Object.values(EFFECTS).map(e=>[e.id,displayText(e.displayName)])),
    tools:Object.fromEntries(Object.values(TOOL_PRESETS).map(tool=>[tool.id,tool.label])),
    traits:Object.fromEntries(Object.entries(TRAITS).map(([id,trait])=>[id,{
      label:trait.label,description:trait.description,affinities:trait.affinities??{},
      healing:trait.healing??1,risk:trait.risk??1
    }])),
    buildings:Object.fromEntries(Object.values(BUILDING_BLUEPRINTS).map(b=>[b.id,displayText(b.displayName)])),
    buildingBlueprints:Object.fromEntries(Object.values(BUILDING_BLUEPRINTS).map(b=>[b.id,{
      id:b.id,label:displayText(b.displayName),footprint:b.footprint,version:b.version,
      stages:b.stages.map(s=>({id:s.id,label:displayText(s.displayName),materials:s.materials,workUnits:s.workUnits})),
      effects:b.effects,storage:b.storage??null,housing:b.housing??null,cemetery:b.cemetery??null,
      production:b.production??null,mining:b.mining??null
    }])),
    naturalSources:Object.fromEntries(Object.values(NATURAL_SOURCES).map(s=>[s.id,{
      label:s.label,productId:s.productId,seedItem:s.seedItem,seedsPerHarvest:s.seedsPerHarvest,drop:s.drop,
      growthMode:s.growthMode,production:s.production,stages:s.stages,blocksMovement:s.blocksMovement
     }])),
    foods:Object.fromEntries(Object.values(FOOD_ITEMS).map(f=>[f.id,{label:f.label,satiety:f.satiety}])),
    scenery:Object.fromEntries(Object.values(SCENERY_PRESETS).map(s=>[s.id,s.label])),
    leadershipProjects:LEADERSHIP_PROJECTS,
    items:ITEMS,itemCategories:ITEM_CATEGORIES,recipes:RECIPES
   });
   if(url.pathname==="/api/world"&&req.method==="GET"){
    return json(res,200,projectWorld());
   }
   if(url.pathname==="/api/inspect"&&req.method==="GET"){
    const entity=world.entities.find(e=>e.id===url.searchParams.get("entityId"));
    if(!entity)return json(res,404,{error:"NOT_FOUND"});
    return json(res,200,{entityId:entity.id,
      attributes:entity.kind==="character"?resolveAttributes({...entity,attributes:{...entity.attributes,health:entity.health,energy:entity.energy}},world.tick):null,
      effects:entity.kind==="character"?(entity.effects??[]).map(e=>({
       id:e.instanceId,name:EFFECTS[e.definitionId]?.displayName["pt-BR"]??e.definitionId,
       sourceId:e.sourceId,stacks:e.stacks,expiresAtTick:e.expiresAtTick??null
      })):[],
      activity:entity.kind==="character"?entity.ai?.activity??null:null,
      route:entity.kind==="character"?entity.ai?.route??null:null,
      reason:entity.kind==="character"?entity.ai?.reason??"Sem tarefa":null,
      inventory:entity.kind==="character"?(entity.inventory??{}):null,
      leadership:entity.kind==="character"?entity.leadership??null:null,
      survival:entity.kind==="character"?{
       satiety:entity.satiety??100,equipment:entity.equipment??{},injuries:entity.injuries??0,
       risk:{
        wood:injuryProbability(entity,"resource.gather:wood",world.tick),
        stone:injuryProbability(entity,"resource.gather:stone",world.tick),
        building:injuryProbability(entity,"construction.work",world.tick),
        iron:injuryProbability(entity,"resource.gather:iron_ore",world.tick),
        copper:injuryProbability(entity,"resource.gather:copper_ore",world.tick),
        manufacturing:injuryProbability(entity,"production.work",world.tick)
       }
      }:null,
      natural:entity.kind==="resource"&&entity.sourceId?{
       species:entity.sourceId,productId:entity.productId,life:entity.life??null,
       production:NATURAL_SOURCES[entity.sourceId]?.production??null
      }:null,
      scenery:entity.kind==="obstacle"?{type:entity.obstacleType,blocksMovement:entity.blocksMovement,harvestable:false}:null,
      farming:entity.kind==="planting_zone"?{
       species:entity.sourceId,...countZoneCrops(world,entity)
      }:null,
      construction:entity.kind==="construction"?{
       blueprintId:entity.blueprintId,blueprintVersion:entity.blueprintVersion,
       stage:currentStage(entity)?.id??null,remaining:materialsRemaining(entity),
       materialsReady:hasMaterials(entity),capabilities:buildingCapabilities(entity),
       mining:entity.mineRemaining?{remaining:entity.mineRemaining,stock:entity.stock??{}}:null,
       stageIndex:entity.stageIndex,status:entity.status,availability:entity.availability,
       production:productionDefinition(entity)?{
        orders:entity.productionOrders??[],active:activeOrder(entity)??null,
        missing:activeOrder(entity)?stockMissing(entity,activeOrder(entity)!.recipeId):{},
        ready:canWorkProduction(entity),
        recipes:productionDefinition(entity)!.recipes
       }:null,
       cemetery:entity.blueprintId==="building.cemetery"?{
        capacity:cemeteryCapacity(entity),free:availableGraves(entity),
        burials:entity.burials??[]
       }:null,
       housing:bedsIn(entity)>0?{
        beds:bedsIn(entity),reserved:reservationCount(entity),residents:entity.residents??[],dependentBeds:buildingBlueprint(entity.blueprintId)?.housing?.dependentBeds??0,
        reservations:Object.entries(entity.bedReservations??{}).map(([npcId,data])=>({
         npcId,name:world.entities.find(e=>e.id===npcId&&e.kind==="character")?.name??npcId,
         expiresTick:data.expiresTick
        }))
       }:null,
       storage:storageDefinition(entity)?{
        stock:entity.stock??{},total:storedTotal(entity),free:storageFree(entity),
        capacity:storageDefinition(entity)!.capacity,accepted:storageDefinition(entity)!.accepted
       }:null
      }:null,
      needs:entity.kind==="character"?{satiety:entity.satiety??100,health:entity.health,energy:entity.energy}:null,social:null,
      decisions:entity.kind==="character"?entity.ai?.history??[]:null
    });
   }
   if(url.pathname==="/api/clock"&&req.method==="POST"){
    const input=await readBody(req);
    if(input?.role!=="admin")return json(res,403,{error:"UNAUTHORIZED"});
    if(![0,1,2,4].includes(input.speed))return json(res,422,{error:"INVALID_PAYLOAD"});
    clock.speed=input.speed;
    store?.commit(world,world.seed);
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
      action:input.action,targetId:role==="player"&&input.action==="movement.move"?playerId():input.targetId,
      position:input.position,parameters:input.parameters};
    const result=executeCommand(command);
    return json(res,result.ok?200:422,{result,world,clock:clockView()});
   }
   if(url.pathname==="/api/brush"&&req.method==="POST"){
    const input=await readBody(req);
    if(input?.role!=="admin")return json(res,403,{error:"UNAUTHORIZED"});
    if(!Array.isArray(input.commands)||input.commands.length<1||input.commands.length>225)return json(res,422,{error:"INVALID_PAYLOAD"});
    const results=[];
    for(const c of input.commands){
     if(!c||typeof c.commandId!=="string"||!/^[-\w]{1,80}$/.test(c.commandId))return json(res,422,{error:"INVALID_PAYLOAD"});
     if(c.action!=="npc.spawn"&&c.action!=="resource.spawn"&&c.action!=="obstacle.spawn"&&c.action!=="construction.place"&&c.action!=="farming.zone.create")return json(res,422,{error:"INVALID_PAYLOAD"});
    }
    for(const c of input.commands)results.push(executeCommand({worldId:world.id,actorRole:"admin",
     commandId:c.commandId,action:c.action,position:c.position,parameters:c.parameters}));
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
   if(["INVALID_SAVE_NAME","INVALID_TIMELINE","INVALID_SNAPSHOT","INVALID_WORLD",
      "SNAPSHOT_TOO_LARGE","INVALID_SEED"].includes(error))
    return json(res,422,{error});
   if(error==="BODY_TOO_LARGE")return json(res,413,{error});
   if(error==="INVALID_JSON")return json(res,400,{error});
   if((e as NodeJS.ErrnoException).code==="ENOENT")return json(res,404,{error:"NOT_FOUND"});
   json(res,500,{error:"INTERNAL_ERROR"});
  }
 });
 attachWorldStream(server,projectWorld,()=>generation);
 server.on("close",()=>clearInterval(timer));
 return {server,get world(){return world;},clock,store};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {server}=makePrototype({dataDir:process.env.OTURO_DATA_DIR,
  seed:process.env.OTURO_WORLD_SEED});
 server.listen(port,host,()=>console.log("Sandbox preview: http://"+host+":"+port+" (admin: /admin; local only)"));
}
