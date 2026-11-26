import {buildingBlueprint} from "../../content/src/buildings/registry.ts";
import {isItem} from "../../content/src/items.ts";
import {WORLD_FORMAT_VERSION} from "../../domain/src/activity.ts";
import type {WorldSnapshot} from "../../domain/src/activity.ts";
import type {World,Position} from "../../domain/src/contracts.ts";
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const safeInt=(v:unknown,max=Number.MAX_SAFE_INTEGER):v is number=>
 typeof v==="number"&&Number.isSafeInteger(v)&&v>=0&&v<=max;
const position=(v:unknown,w:number,h:number):v is Position=>
 object(v)&&safeInt(v.x,w-1)&&safeInt(v.y,h-1);
export const MAX_SNAPSHOT_BYTES=8*1024*1024;
export function validateWorld(value:unknown):asserts value is World {
 if(!object(value)||typeof value.id!=="string"||!/^[\w-]{1,80}$/.test(value.id)||
  !safeInt(value.width,256)||value.width<1||!safeInt(value.height,256)||value.height<1||
  !safeInt(value.tick)||!Array.isArray(value.entities)||value.entities.length>20000||
  !Array.isArray(value.appliedCommands)||value.appliedCommands.length>200000)
  throw Error("INVALID_WORLD");
 if(value.seed!==undefined&&(typeof value.seed!=="string"||value.seed.length>80))throw Error("INVALID_WORLD");
 if(value.appliedCommands.some(v=>typeof v!=="string"||v.length>90))throw Error("INVALID_WORLD");
 const ids=new Set<string>();
 for(const entity of value.entities){
  if(!object(entity)||typeof entity.id!=="string"||!/^[\w:-]{1,120}$/.test(entity.id)||
   ids.has(entity.id)||!position(entity.position,value.width,value.height))throw Error("INVALID_WORLD");
  ids.add(entity.id);
  if(!["character","construction","resource","obstacle","planting_zone","item"].includes(String(entity.kind)))
   throw Error("INVALID_WORLD");
  if(entity.kind==="character"&&(
   typeof entity.name!=="string"||entity.name.length>120||!safeInt(entity.health,100)||
   !safeInt(entity.energy,100)||
   entity.nextMoveTick!==undefined&&(typeof entity.nextMoveTick!=="number"||!Number.isFinite(entity.nextMoveTick)||entity.nextMoveTick<0)||entity.satiety!==undefined&&!safeInt(entity.satiety,100)))
   throw Error("INVALID_WORLD");
  if(entity.kind==="character"&&object(entity.ai)&&entity.ai.plantingCommitment!==undefined){
   const p=entity.ai.plantingCommitment;
   if(!object(p)||typeof p.zoneId!=="string"||!/^[\w:-]{1,120}$/.test(p.zoneId)||
    !position(p.position,value.width,value.height)||!safeInt(p.startedTick,value.tick)||
    !safeInt(p.lastProgressTick,value.tick)||p.lastProgressTick<p.startedTick)throw Error("INVALID_WORLD");
  }
  if(entity.kind==="character"&&object(entity.ai)&&entity.ai.extractionCommitment!==undefined){
   const p=entity.ai.extractionCommitment;
   if(!object(p)||typeof p.targetId!=="string"||!/^[\w:-]{1,120}$/.test(p.targetId)||
    (p.action!=="resource.gather"&&p.action!=="mine.extract")||
    typeof p.itemId!=="string"||!["wood","stone","iron_ore","copper_ore"].includes(p.itemId)||
    p.action==="mine.extract"&&p.itemId==="wood"||
    !safeInt(p.startedTick,value.tick)||!safeInt(p.lastProgressTick,value.tick)||p.lastProgressTick<p.startedTick)throw Error("INVALID_WORLD");
  }
  if(entity.kind==="character"&&object(entity.ai)&&entity.ai.haulingClaim!==undefined){
   const c=entity.ai.haulingClaim;
   if(!object(c)||typeof c.targetId!=="string"||!/^[\w:-]{1,120}$/.test(c.targetId)||
    !["storage.withdraw","storage.deposit","construction.deliver"].includes(String(c.action))||
    typeof c.itemId!=="string"||!isItem(c.itemId)||!safeInt(c.quantity,12)||c.quantity<1||
    !safeInt(c.lastProgressTick,value.tick))throw Error("INVALID_WORLD");
  }
  if(entity.kind==="character"&&entity.sleepingInId!==undefined&&(typeof entity.sleepingInId!=="string"||!/^[\w:-]{1,120}$/.test(entity.sleepingInId)))throw Error("INVALID_WORLD");
  if(entity.kind==="character"&&entity.movementSegment!==undefined){
   const m=entity.movementSegment;
   if(!object(m)||!position(m.from,value.width,value.height)||!position(m.to,value.width,value.height)||
    !safeInt(m.startTick,value.tick)||typeof m.endTick!=="number"||!Number.isFinite(m.endTick)||m.endTick<=m.startTick||
    m.endTick!==entity.nextMoveTick||
    Math.abs(m.from.x-m.to.x)+Math.abs(m.from.y-m.to.y)!==1)throw Error("INVALID_WORLD");
  }
  if(entity.kind==="construction"||entity.kind==="planting_zone"){
   if(!object(entity.footprint)||!safeInt(entity.footprint.width,12)||entity.footprint.width<1||
    !safeInt(entity.footprint.height,12)||entity.footprint.height<1||
    entity.position.x+entity.footprint.width>value.width||
    entity.position.y+entity.footprint.height>value.height)throw Error("INVALID_WORLD");
  }
  if(entity.kind==="construction"&&(
   typeof entity.blueprintId!=="string"||
   !["site","completed","destroyed"].includes(String(entity.status))||
   !safeInt(entity.stageIndex,50)||!safeInt(entity.workDone,100000)))throw Error("INVALID_WORLD");
  if(entity.kind==="construction"&&(entity.level!==undefined||entity.upgrade!==undefined)){
   const def=typeof entity.blueprintId==="string"?buildingBlueprint(entity.blueprintId):undefined;
   const level=entity.level??1;
   if(!safeInt(level,1+(def?.upgrades?.length??0))||level<1||!def||def.version!==entity.blueprintVersion)throw Error("INVALID_WORLD");
   if(entity.upgrade!==undefined){const u=entity.upgrade,next=def.upgrades?.find(x=>x.level===level+1);
    if(!object(u)||!next||entity.status!=="completed"||entity.availability!=="available"||u.targetLevel!==next.level||!safeInt(u.startedTick,value.tick)||!safeInt(entity.workDone,next.stage.workUnits-1)||!object(entity.delivered)||Object.entries(entity.delivered).some(([id,n])=>!Object.hasOwn(next.stage.materials,id)||!safeInt(n,next.stage.materials[id])))throw Error("INVALID_WORLD");
   }
  }
  if(entity.kind==="construction"&&entity.workCycle!==undefined){const c=entity.workCycle;if(!object(c)||!safeInt(c.tick,value.tick)||!Array.isArray(c.actors)||c.actors.length<1||c.actors.length>4||new Set(c.actors).size!==c.actors.length||c.actors.some(id=>typeof id!=="string"||!/^[\w:-]{1,120}$/.test(id)))throw Error("INVALID_WORLD");}
  if(entity.kind==="item"&&(typeof entity.itemId!=="string"||!isItem(entity.itemId)||!safeInt(entity.quantity,1e9)||entity.quantity<1||!safeInt(entity.createdTick,value.tick)))throw Error("INVALID_WORLD");
  if(entity.kind==="resource"&&(!safeInt(entity.quantity,1e9)||!safeInt(entity.maximum,1e9)))throw Error("INVALID_WORLD");
 }
}
export function validateSnapshot(value:unknown):asserts value is WorldSnapshot {
 if(!object(value)||value.formatVersion!==WORLD_FORMAT_VERSION||
  typeof value.savedAt!=="string"||!Number.isFinite(Date.parse(value.savedAt))||
  typeof value.timelineId!=="string"||!/^[a-f\d-]{36}$/.test(value.timelineId)||
  !safeInt(value.lastSequence)||
  !object(value.clock)||![0,1,2,4].includes(value.clock.speed as number))
  throw Error("INVALID_SNAPSHOT");
 validateWorld(value.world);
 if(value.seed!==undefined&&(typeof value.seed!=="string"||value.seed.length>80))
  throw Error("INVALID_SNAPSHOT");
}
export function parseSnapshot(text:string):WorldSnapshot {
 if(Buffer.byteLength(text,"utf8")>MAX_SNAPSHOT_BYTES)throw Error("SNAPSHOT_TOO_LARGE");
 let value:unknown;
 try{value=JSON.parse(text);}catch{throw Error("INVALID_SNAPSHOT");}
 validateSnapshot(value);
 return value;
}
