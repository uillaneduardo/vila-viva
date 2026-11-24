/** File-system adapter for the persistence port.
 * Engine and content never import fs, Docker, HTTP, or this adapter.
 * Write-ahead JSONL batches are committed by an atomic active snapshot. On recovery,
 * only journal batches up to the checkpoint's lastSequence are considered durable.
 */
import {mkdirSync,existsSync,readFileSync,writeFileSync,renameSync,copyFileSync,
 openSync,writeSync,fsyncSync,closeSync,readdirSync,statSync} from "node:fs";
import {join} from "node:path";
import {randomUUID} from "node:crypto";
import type {World} from "../../../packages/domain/src/contracts.ts";
import type {AcceptedAction,ActivityTick,WorldSnapshot} from "../../../packages/domain/src/activity.ts";
import {WORLD_FORMAT_VERSION} from "../../../packages/domain/src/activity.ts";
import {parseSnapshot,validateWorld} from "../../../packages/protocol/src/world-snapshot.ts";
const nameValid=(name:string)=>/^[a-zA-Z0-9][\w-]{0,63}$/.test(name);
const timelineValid=(name:string)=>/^[a-f\d-]{36}$/.test(name);
function atomicWrite(file:string,text:string):void {
 const tmp=file+"."+randomUUID()+".tmp",fd=openSync(tmp,"wx",0o600);
 try{writeSync(fd,text);fsyncSync(fd);}finally{closeSync(fd);}
 renameSync(tmp,file);
}
function durablyAppend(file:string,text:string):void {
 const fd=openSync(file,"a",0o600);
 try{writeSync(fd,text);fsyncSync(fd);}finally{closeSync(fd);}
}
export class FileWorldStore {
 readonly activeFile:string;
 readonly savesDirectory:string;
 readonly logsDirectory:string;
 timelineId=randomUUID();
 lastSequence=0;
 readonly root:string;
 constructor(root:string){
  this.root=root;
  if(!root)throw Error("INVALID_DATA_DIR");
  mkdirSync(root,{recursive:true,mode:0o700});
  this.savesDirectory=join(root,"saves");this.logsDirectory=join(root,"logs");
  mkdirSync(this.savesDirectory,{recursive:true,mode:0o700});
  mkdirSync(this.logsDirectory,{recursive:true,mode:0o700});
  this.activeFile=join(root,"active.json");
 }
 private logPath(id:string):string {
  if(!timelineValid(id))throw Error("INVALID_TIMELINE");
  return join(this.logsDirectory,id+".jsonl");
 }
 snapshot(world:World,seed?:string):WorldSnapshot {
  return {formatVersion:WORLD_FORMAT_VERSION,savedAt:new Date().toISOString(),
   timelineId:this.timelineId,lastSequence:this.lastSequence,
   world:structuredClone(world),clock:{speed:0},...(seed?{seed}:{})};
 }
 private writeActive(value:WorldSnapshot):void {
  if(existsSync(this.activeFile))copyFileSync(this.activeFile,join(this.root,"active.previous.json"));
  atomicWrite(this.activeFile,JSON.stringify(value));
 }
 private trimUncommitted(timelineId:string,lastSequence:number):void {
  const path=this.logPath(timelineId);
  if(!existsSync(path))return;
  const input=readFileSync(path,"utf8").split("\n").filter(Boolean);
  const lines:string[]=[];
  let expected=1;
  for(const line of input){
   let event:ActivityTick;
   try{event=JSON.parse(line);}catch{break;}
   if(event.formatVersion!==1||event.timelineId!==timelineId||
    event.sequence!==expected||event.sequence>lastSequence||!Array.isArray(event.actions))break;
   lines.push(line);expected++;
  }
  if(lines.length!==input.length)atomicWrite(path,lines.length?lines.join("\n")+"\n":"");
  if(lines.length!==lastSequence)throw Error("JOURNAL_INCOMPLETE");
 }
 loadActive():WorldSnapshot|null {
  const previous=join(this.root,"active.previous.json");
  if(!existsSync(this.activeFile)&&!existsSync(previous))return null;
  let value:WorldSnapshot|undefined;
  let primaryError:unknown;
  try{value=parseSnapshot(readFileSync(this.activeFile,"utf8"));}
  catch(error){primaryError=error;}
  if(!value&&existsSync(previous))
   value=parseSnapshot(readFileSync(previous,"utf8"));
  if(!value)throw primaryError??Error("CORRUPTED_WORLD");
  this.timelineId=value.timelineId;this.lastSequence=value.lastSequence;
  this.trimUncommitted(this.timelineId,this.lastSequence);
  return value;
 }
 /** Commit all accepted actions of one logical tick; omit a log record for idle ticks. */
 commit(world:World,seed?:string,actions:AcceptedAction[]=[]):WorldSnapshot {
  validateWorld(world);
  if(actions.length){
   const sequence=this.lastSequence+1;
   const batch:ActivityTick={formatVersion:1,timelineId:this.timelineId,
    sequence,tick:world.tick,recordedAt:new Date().toISOString(),actions};
   durablyAppend(this.logPath(this.timelineId),JSON.stringify(batch)+"\n");
   this.lastSequence=sequence;
  }
  const value=this.snapshot(world,seed);
  this.writeActive(value);
  return value;
 }
 /** Creates an independent branch of history; previous journal files remain exportable. */
 switchWorld(world:World,seed?:string):WorldSnapshot {
  validateWorld(world);
  const old=this.timelineId,oldSeq=this.lastSequence;
  this.timelineId=randomUUID();this.lastSequence=0;
  try{return this.commit(world,seed);}
  catch(e){this.timelineId=old;this.lastSequence=oldSeq;throw e;}
 }
 saveNamed(name:string,world:World,seed?:string):WorldSnapshot {
  if(!nameValid(name))throw Error("INVALID_SAVE_NAME");
  const snapshot=this.snapshot(world,seed);
  atomicWrite(join(this.savesDirectory,name+".json"),JSON.stringify(snapshot));
  return snapshot;
 }
 loadNamed(name:string):WorldSnapshot {
  if(!nameValid(name))throw Error("INVALID_SAVE_NAME");
  return parseSnapshot(readFileSync(join(this.savesDirectory,name+".json"),"utf8"));
 }
 listSaves():Array<{name:string;tick:number;savedAt:string;seed?:string}>{
  return readdirSync(this.savesDirectory).filter(x=>x.endsWith(".json"))
   .map(filename=>{
    const name=filename.slice(0,-5);
    if(!nameValid(name))return null;
    try{
     const s=parseSnapshot(readFileSync(join(this.savesDirectory,filename),"utf8"));
     return {name,tick:s.world.tick,savedAt:s.savedAt,...(s.seed?{seed:s.seed}:{})};
    }catch{return null;}
   }).filter((item):item is {name:string;tick:number;savedAt:string;seed?:string}=>!!item);
 }
 getLog(timelineId=this.timelineId):string {
  const path=this.logPath(timelineId);
  if(!existsSync(path))return "";
  const raw=readFileSync(path,"utf8");
  if(timelineId!==this.timelineId)return raw;
  return raw.split("\n").filter(Boolean).filter(line=>{
   try{const event=JSON.parse(line);return event.sequence<=this.lastSequence;}
   catch{return false;}
  }).join("\n")+(raw.trim()?"\n":"");
 }
 recentLog(limit=80):ActivityTick[]{
  const lines=this.getLog().split("\n").filter(Boolean);
  return lines.slice(-Math.min(Math.max(1,limit),200)).map(line=>JSON.parse(line) as ActivityTick);
 }
 listLogs():Array<{timelineId:string;bytes:number;active:boolean}>{
  return readdirSync(this.logsDirectory).filter(x=>x.endsWith(".jsonl")).map(x=>{
   const timelineId=x.slice(0,-6);if(!timelineValid(timelineId))return null;
   return {timelineId,bytes:statSync(this.logPath(timelineId)).size,
    active:timelineId===this.timelineId};
  }).filter((v):v is {timelineId:string;bytes:number;active:boolean}=>!!v);
 }
}
