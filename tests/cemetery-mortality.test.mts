import assert from "node:assert/strict";
import test from "node:test";
import {createWorld,applyCommand,advanceTick} from "../packages/engine/src/engine.ts";
import {generateCharacterProfile,TRAITS} from "../packages/content/src/characters.ts";
import {CEMETERY} from "../packages/content/src/buildings/cemetery.ts";
import {canEnter} from "../packages/systems/collision/src/index.ts";
import {cemeteryCapacity,availableGraves,isVisibleCorpse,carriedCorpse,advanceMortality} from "../packages/systems/mortality/src/index.ts";
import {resolveAttributes} from "../packages/systems/effects/src/resolver.ts";
import {makePrototype} from "../apps/server/src/index.mts";
import {readFile} from "node:fs/promises";
const god=(world,id,action,extra={})=>applyCommand(world,{
 worldId:world.id,commandId:id,actorRole:"admin",action,...extra
});
const npcCommand=(world,actor,id,action,targetId,extra={})=>applyCommand(world,{
 worldId:world.id,commandId:id,actorRole:"npc",actorId:actor.id,action,targetId,...extra
});
test("characters receive deterministic diverse identities, primary attributes and two catalog traits",()=>{
 const a=generateCharacterProfile("seed","first",12);
 assert.deepEqual(a,generateCharacterProfile("seed","first",12));
 assert.equal(a.traits.length,2);
 assert.equal(new Set(a.traits).size,2);
 assert.ok(a.traits.every(id=>!!TRAITS[id]));
 assert.ok(Object.values(a.attributes).every(value=>value>=4&&value<=20));
 const samples=new Set(Array.from({length:30},(_,index)=>
  generateCharacterProfile("seed","npc-"+index,index).name));
 assert.ok(samples.size>8);
 const w=createWorld("w",18,18);
 assert.equal(god(w,"p1","npc.spawn",{position:{x:1,y:1}}).ok,true);
 assert.equal(god(w,"p2","npc.spawn",{position:{x:2,y:1}}).ok,true);
 const person=w.entities.find(e=>e.id==="npc-p1");
 assert.ok(person.name.includes(" "));
 assert.equal(person.traits.length,2);
 assert.ok(person.attributes.endurance>0);
 assert.equal(god(w,"named","npc.spawn",{position:{x:3,y:1},parameters:{name:"Ayla"}}).ok,true);
 assert.equal(w.entities.find(e=>e.id==="npc-named").name,"Ayla");
 assert.equal(god(w,"bad","npc.spawn",{position:{x:4,y:1},parameters:{name:123}}).error,"INVALID_PAYLOAD");
});
test("visible corpses are passable and create a conditional area debuff only for living neighbours",()=>{
 const w=createWorld("world",18,18);
 god(w,"dead","npc.spawn",{position:{x:4,y:5},parameters:{name:"Maria"}});
 god(w,"near","npc.spawn",{position:{x:4,y:3},parameters:{name:"Caio"}});
 god(w,"far","npc.spawn",{position:{x:12,y:12},parameters:{name:"Lia"}});
 const dead=w.entities.find(e=>e.id==="npc-dead");
 const near=w.entities.find(e=>e.id==="npc-near");
 const far=w.entities.find(e=>e.id==="npc-far");
 dead.health=0;dead.satiety=0;
 advanceMortality(w);
 assert.equal(dead.deathTick,w.tick);
 assert.equal(dead.causeOfDeath,"Inanição");
 assert.equal(canEnter(w,{x:4,y:5}),true);
 assert.equal(isVisibleCorpse(dead),true);
 assert.ok(near.effects.some(e=>e.definitionId==="corpse_exposure"));
 assert.ok(!far.effects?.some(e=>e.definitionId==="corpse_exposure"));
 assert.ok(resolveAttributes(near,w.tick).values.mood<resolveAttributes(far,w.tick).values.mood);
 dead.bodyCarriedBy=far.id;
 advanceMortality(w);
 assert.equal(near.effects.some(e=>e.definitionId==="corpse_exposure"),false);
});
test("cemetery has versioned blueprint, finite slots and passable demarcated area",()=>{
 const w=createWorld("cem",18,18);
 assert.deepEqual(CEMETERY.footprint,{width:3,height:3});
 assert.equal(CEMETERY.cemetery.capacity,12);
 const result=god(w,"grave","construction.place",{position:{x:8,y:5},
  parameters:{blueprintId:"building.cemetery",mode:"completed"}});
 assert.equal(result.ok,true);
 const grave=w.entities.find(e=>e.id==="construction-grave");
 assert.equal(cemeteryCapacity(grave),12);
 assert.equal(availableGraves(grave),12);
 assert.equal(canEnter(w,{x:8,y:5}),true);
 assert.equal(god(w,"overlap","construction.place",{position:{x:8,y:5},
  parameters:{blueprintId:"building.depot",mode:"completed"}}).error,"BLOCKED");
 assert.deepEqual(grave.burials,[]);
});
test("physical pickup transports only one body and burial records a permanent name without creating inventory",()=>{
 const w=createWorld("funeral",18,14);
 god(w,"corpse","npc.spawn",{position:{x:4,y:4},parameters:{name:"Celina"}});
 god(w,"worker","npc.spawn",{position:{x:4,y:3},parameters:{name:"Tomás"}});
 god(w,"graveyard","construction.place",{position:{x:8,y:3},
  parameters:{blueprintId:"building.cemetery",mode:"completed"}});
 const body=w.entities.find(e=>e.id==="npc-corpse");
 const worker=w.entities.find(e=>e.id==="npc-worker");
 const grave=w.entities.find(e=>e.id==="construction-graveyard");
 body.health=0;advanceMortality(w);
 assert.equal(npcCommand(w,worker,"pickup","burial.pickup",body.id).ok,true);
 assert.equal(isVisibleCorpse(body),false);
 assert.equal(carriedCorpse(w,worker.id)?.id,body.id);
 assert.equal(npcCommand(w,worker,"again","burial.pickup",body.id).error,"INVALID_TARGET");
 for(let x=5;x<=7;x++){
  assert.equal(npcCommand(w,worker,"step-"+x,"movement.move",worker.id,
   {position:{x,y:3}}).ok,true);
  assert.deepEqual(body.position,worker.position);
 }
 assert.equal(npcCommand(w,worker,"inter","burial.inter",grave.id).ok,true);
 assert.equal(w.entities.find(e=>e.id===body.id),undefined);
 assert.deepEqual(grave.burials.map(r=>r.name),["Celina"]);
 assert.equal(availableGraves(grave),11);
 assert.equal(grave.burials[0].npcId,body.id);
 assert.ok(grave.burials[0].burialTick>=grave.burials[0].deathTick);
 assert.equal(npcCommand(w,worker,"repeat","burial.inter",grave.id).error,"NOT_READY");
});
test("burial capacity cannot overflow; carrier releases body if cemetery becomes unavailable",()=>{
 const w=createWorld("limits",20,15);
 god(w,"cem","construction.place",{position:{x:9,y:3},
  parameters:{blueprintId:"building.cemetery",mode:"completed"}});
 god(w,"dead","npc.spawn",{position:{x:5,y:4},parameters:{name:"Pessoa falecida"}});
 god(w,"worker","npc.spawn",{position:{x:5,y:3},parameters:{name:"Cuidador"}});
 const grave=w.entities.find(e=>e.id==="construction-cem");
 const body=w.entities.find(e=>e.id==="npc-dead");
 const worker=w.entities.find(e=>e.id==="npc-worker");
 body.health=0;advanceMortality(w);
 assert.equal(npcCommand(w,worker,"collect","burial.pickup",body.id).ok,true);
 grave.burials=Array.from({length:12},(_,i)=>({npcId:"former-"+i,name:"Registro "+i,
  deathTick:1,burialTick:2,cause:"Causa registrada"}));
 assert.equal(availableGraves(grave),0);
 for(let i=0;i<3;i++)advanceTick(w);
 assert.equal(isVisibleCorpse(body),true);
 assert.equal(body.bodyCarriedBy,undefined);
 assert.equal(grave.burials.length,12);
 assert.equal(npcCommand(w,worker,"cannot","burial.inter",grave.id).error,"BLOCKED");
});
test("if a bearer dies, carried body returns to visible world without collision",()=>{
 const w=createWorld("bearer",12,12);
 god(w,"a","npc.spawn",{position:{x:4,y:4}});
 god(w,"b","npc.spawn",{position:{x:4,y:3}});
 const body=w.entities.find(e=>e.id==="npc-a"),bearer=w.entities.find(e=>e.id==="npc-b");
 body.health=0;advanceMortality(w);
 assert.equal(npcCommand(w,bearer,"carry","burial.pickup",body.id).ok,true);
 bearer.health=0;
 advanceMortality(w);
 assert.equal(body.bodyCarriedBy,undefined);
 assert.equal(isVisibleCorpse(body),true);
 assert.equal(canEnter(w,body.position),true);
});
test("autonomous inhabitants carry a dead neighbour to a finished cemetery",()=>{
 const w=createWorld("auto",20,15);
 god(w,"grave","construction.place",{position:{x:10,y:5},
  parameters:{blueprintId:"building.cemetery",mode:"completed"}});
 god(w,"worker","npc.spawn",{position:{x:3,y:4},parameters:{name:"Mara"}});
 god(w,"dead","npc.spawn",{position:{x:3,y:5},parameters:{name:"Bento"}});
 const corpse=w.entities.find(e=>e.id==="npc-dead");
 corpse.health=0;
 for(let i=0;i<120;i++)advanceTick(w);
 const grave=w.entities.find(e=>e.id==="construction-grave");
 assert.ok(grave.burials.some(r=>r.name==="Bento"),"burial happens via NPC pathfinding");
 assert.equal(w.entities.some(e=>e.id==="npc-dead"),false);
 const worker=w.entities.find(e=>e.id==="npc-worker");
 assert.ok(worker.ai.history.length>0);
});
test("browser includes cemetery blueprint, character trait catalog and memorial inspection",async()=>{
 const {server}=makePrototype();
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+server.address().port;
 const post=(path,input)=>fetch(base+path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(input)});
 try{
  const catalog=await (await fetch(base+"/api/catalog")).json();
  assert.equal(catalog.buildingBlueprints["building.cemetery"].cemetery.capacity,12);
  assert.ok(catalog.traits.resilient);
  assert.equal(catalog.effects.corpse_exposure,"Perturbado por cadáver");
  const brush=await (await post("/api/brush",{role:"admin",commands:[
   {commandId:"cem-api",action:"construction.place",position:{x:17,y:8},
    parameters:{blueprintId:"building.cemetery",mode:"completed"}},
   {commandId:"random-api",action:"npc.spawn",position:{x:12,y:11}}
  ]})).json();
  assert.deepEqual(brush.results.map(x=>x.ok),[true,true]);
  const grave=await (await fetch(base+"/api/inspect?entityId=construction-cem-api")).json();
  assert.equal(grave.construction.cemetery.capacity,12);
  assert.deepEqual(grave.construction.cemetery.burials,[]);
  const world=await (await fetch(base+"/api/world")).json();
  assert.equal(world.world.entities.find(e=>e.id==="npc-random-api").traits.length,2);
 }finally{await new Promise(resolve=>server.close(resolve));}
 const renderer=await readFile(new URL("../packages/renderer/src/scene.js",import.meta.url),"utf8");
 assert.match(renderer,/☠/);
});
