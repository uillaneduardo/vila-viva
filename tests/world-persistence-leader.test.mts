import assert from "node:assert/strict";
import test from "node:test";
import {mkdtempSync,readFileSync,writeFileSync,appendFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {FileWorldStore} from "../apps/server/src/world-store.mts";
import {createWorld,applyCommand,advanceTick} from "../packages/engine/src/engine.ts";
import {parseSnapshot} from "../packages/protocol/src/world-snapshot.ts";
import {bootstrapSeededWorld} from "../packages/content/src/world-seeds.ts";
import {proposeNextConstruction,advanceLeaderDecisions} from "../packages/systems/leadership/src/index.ts";
import {makePrototype} from "../apps/server/src/index.mts";
const temp=()=>mkdtempSync(join(tmpdir(),"oturo-snap-"));
const admin=(world,id,action,position,parameters={})=>
 applyCommand(world,{worldId:world.id,commandId:id,actorRole:"admin",action,position,parameters});
test("world store writes atomic snapshots and only logs logical ticks with accepted actions",()=>{
 const dir=temp();
 try{
  const store=new FileWorldStore(dir),world=createWorld("demo",12,12);
  store.switchWorld(world);
  assert.equal(store.recentLog().length,0);
  const accepted=[];
  const result=applyCommand(world,{worldId:world.id,commandId:"npc",actorRole:"admin",
   action:"npc.spawn",position:{x:2,y:2},parameters:{name:"Ayla"}},
   {onAction:a=>accepted.push(a)});
  assert.equal(result.ok,true);
  store.commit(world,undefined,accepted);
  for(let i=0;i<2;i++){advanceTick(world);store.commit(world);}
  assert.equal(world.tick,3);
  assert.equal(store.recentLog().length,1);
  assert.equal(store.recentLog()[0].tick,1);
  assert.equal(store.recentLog()[0].actions[0].action,"npc.spawn");
  assert.equal(store.recentLog()[0].actions[0].commandId,"npc");
  assert.equal(store.lastSequence,1);
  const saved=store.saveNamed("first",world);
  assert.equal(saved.world.tick,3);
  assert.equal(store.listSaves()[0].name,"first");
  const restored=new FileWorldStore(dir).loadActive();
  assert.equal(restored.world.tick,3);
  assert.equal(restored.lastSequence,1);
  assert.deepEqual(restored.clock,{speed:0});
  assert.equal(store.getLog().trim().split("\n").length,1);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test("orphan journal batches are trimmed to last committed snapshot after simulated crash",()=>{
 const dir=temp();
 try{
  const store=new FileWorldStore(dir),w=createWorld("w");
  store.switchWorld(w);
  const logFile=join(dir,"logs",store.timelineId+".jsonl");
  appendFileSync(logFile,JSON.stringify({formatVersion:1,timelineId:store.timelineId,sequence:1,
   tick:3,recordedAt:new Date().toISOString(),actions:[{action:"npc.spawn"}]})+"\n");
  const recovered=new FileWorldStore(dir);
  const active=recovered.loadActive();
  assert.equal(active.lastSequence,0);
  assert.equal(recovered.getLog(),"");
  assert.equal(readFileSync(logFile,"utf8"),"");
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test("snapshot validator rejects unknown versions, malformed entities and out-of-bounds positions",()=>{
 const dir=temp();
 try{
  const store=new FileWorldStore(dir),w=createWorld("world",12,12);
  store.switchWorld(w);
  const good=store.snapshot(w);
  assert.equal(parseSnapshot(JSON.stringify(good)).world.tick,0);
  assert.throws(()=>parseSnapshot(JSON.stringify({...good,formatVersion:2})),/INVALID_SNAPSHOT/);
  assert.throws(()=>parseSnapshot(JSON.stringify({...good,world:{...w,entities:[{
   kind:"character",id:"bad",name:"Out",position:{x:999,y:999},health:100,energy:100
  }]}})),/INVALID_WORLD/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test("identical world seeds produce matching layouts and valid leader, resources and trees",()=>{
 const build=()=>{
  const w=createWorld("same",24,16);
  bootstrapSeededWorld(w,"oturo-starter-v1",command=>
   admin(w,command.commandId,command.action,command.position,command.parameters));
  return w;
 };
 const a=build(),b=build();
 assert.deepEqual(a,b);
 assert.equal(a.seed,"oturo-starter-v1");
 assert.equal(a.entities.filter(e=>e.kind==="character"&&e.communityRole==="leader").length,1);
 assert.ok(a.entities.some(e=>e.kind==="resource"&&e.resourceType==="wood"));
 assert.ok(a.entities.some(e=>e.kind==="resource"&&e.resourceType==="stone"));
 assert.ok(a.entities.some(e=>e.kind==="resource"&&e.sourceId==="apple_tree"));
 assert.equal(a.entities.some(e=>e.kind==="construction"),false);
});
test("leader selects legal build sites, cannot instantiate completed buildings, and chooses next needs",()=>{
 const w=createWorld("leader",24,16);
 const spawn=(id,action,pos,parameters={})=>admin(w,id,action,pos,parameters);
 assert.equal(spawn("leader","npc.spawn",{x:10,y:7},{communityRole:"leader"}).ok,true);
 spawn("neighbor","npc.spawn",{x:12,y:7},{});
 spawn("wood","resource.spawn",{x:3,y:3},{resourceType:"wood",quantity:200});
 spawn("stone","resource.spawn",{x:19,y:12},{resourceType:"stone",quantity:200});
 const leader=w.entities.find(e=>e.kind==="character"&&e.communityRole==="leader");
 const proposal=proposeNextConstruction(w,leader);
 assert.equal(proposal.blueprintId,"building.depot");
 assert.ok(proposal.position.x>=0);
 assert.equal(spawn("ordinary","npc.spawn",{x:13,y:7},{}).ok,true);
 const ordinary=w.entities.find(e=>e.id==="npc-ordinary");
 const impostor=applyCommand(w,{worldId:w.id,commandId:"fake",actorRole:"npc",
  actorId:ordinary.id,action:"construction.propose",
  position:proposal.position,parameters:{blueprintId:"building.depot"}});
 assert.equal(impostor.error,"UNAUTHORIZED");
 const invalid=applyCommand(w,{worldId:w.id,commandId:"shortcut",actorRole:"npc",
  actorId:leader.id,action:"construction.propose",
  position:proposal.position,parameters:{blueprintId:"building.depot",mode:"completed"}});
 assert.equal(invalid.error,"INVALID_PAYLOAD");
 for(let i=0;i<12;i++)advanceTick(w);
 const site=w.entities.find(e=>e.kind==="construction"&&e.status==="site");
 assert.ok(site,"leader must propose a site");
 assert.equal(site.blueprintId,"building.depot");
 assert.equal(site.stageIndex,0);
 assert.equal(site.delivered.wood,undefined);
 assert.equal(leader.leadership.lastSiteId,site.id);
 assert.equal(w.entities.filter(e=>e.kind==="construction").length,1);
 // Complete the first project to allow another planned building.
 site.status="completed";site.availability="available";
 site.stageIndex=3;
 for(let i=0;i<12;i++)advanceTick(w);
 assert.ok(w.entities.some(e=>e.kind==="construction"&&e.status==="site"&&
  e.blueprintId==="building.community_house"));
 assert.ok(leader.leadership.lastReason.includes("abrigo"));
});
test("API starts paused, resumes only on command, survives restart, and supports named snapshot and log export",async()=>{
 const dir=temp();
 let server;
 const start=async()=>{
  const instance=makePrototype({dataDir:dir,seed:"oturo-starter-v1"});
  await new Promise(resolve=>instance.server.listen(0,"127.0.0.1",resolve));
  server=instance.server;
  return "http://127.0.0.1:"+instance.server.address().port;
 };
 const post=(base,path,body)=>fetch(base+path,{
  method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
 try{
  let base=await start();
  const initial=await (await fetch(base+"/api/world")).json();
  assert.equal(initial.clock.speed,0);
  assert.equal(initial.persistent,true);
  assert.equal(initial.world.seed,"oturo-starter-v1");
  const before=initial.world.tick;
  await new Promise(resolve=>setTimeout(resolve,330));
  assert.equal((await (await fetch(base+"/api/world")).json()).world.tick,before);
  const log=await (await fetch(base+"/api/world/activity")).json();
  assert.ok(log.ticks.length>0);
  assert.ok(log.ticks.every(tick=>tick.actions.length>0));
  assert.ok(log.ticks.some(tick=>tick.actions.some(a=>a.action==="npc.spawn")));
  const download=await (await fetch(base+"/api/world/export")).json();
  assert.equal(download.formatVersion,1);
  assert.equal(download.world.tick,before);
  const named=await (await post(base,"/api/world/save",{role:"admin",name:"my-test"})).json();
  assert.equal(named.tick,before);
  const on=await (await post(base,"/api/clock",{role:"admin",speed:2})).json();
  assert.equal(on.clock.speed,2);
  await new Promise(resolve=>setTimeout(resolve,280));
  const progressed=await (await fetch(base+"/api/world")).json();
  assert.ok(progressed.world.tick>before);
  await new Promise(resolve=>server.close(resolve));
  base=await start();
  const resumed=await (await fetch(base+"/api/world")).json();
  assert.equal(resumed.clock.speed,0);
  assert.equal(resumed.world.tick,progressed.world.tick);
  const loaded=await (await post(base,"/api/world/load",{role:"admin",name:"my-test"})).json();
  assert.equal(loaded.tick,before);
  assert.equal(loaded.paused,true);
  const imported=await (await post(base,"/api/world/import",{
   role:"admin",snapshot:download})).json();
  assert.equal(imported.paused,true);
  assert.equal(imported.tick,before);
  const logs=await (await fetch(base+"/api/world/logs")).json();
  assert.ok(logs.logs.length>=1);
  const archived=logs.logs.find(item=>!item.active&&item.bytes>0);
  assert.ok(archived,"old journal stays exportable after branching");
  const exportLog=await (await fetch(base+"/api/world/activity/export?timeline="+archived.timelineId)).text();
  assert.ok(exportLog.includes("npc.spawn"));
  const invalid=await post(base,"/api/world/import",{role:"admin",snapshot:{world:{}}});
  assert.equal(invalid.status,422);
  const still=await (await fetch(base+"/api/world")).json();
  assert.equal(still.world.tick,before);
  assert.equal(still.clock.speed,0);
 }finally{
  if(server?.listening)await new Promise(resolve=>server.close(resolve));
  rmSync(dir,{recursive:true,force:true});
 }
});
