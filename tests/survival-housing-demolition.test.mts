import assert from "node:assert/strict";
import test from "node:test";
import {createWorld,applyCommand,advanceTick} from "../packages/engine/src/engine.ts";
import {applyEffect,expireEffects} from "../packages/systems/effects/src/manager.ts";
import {resolveAttributes} from "../packages/systems/effects/src/resolver.ts";
import {injuryProbability,evaluateActionRisk} from "../packages/systems/risk/src/index.ts";
import {bedsIn,reserveBed,reservedHouse,reservationCount,releaseBed} from "../packages/systems/housing/src/index.ts";
import {canEnter} from "../packages/systems/collision/src/index.ts";
import {makePrototype} from "../apps/server/src/index.mts";
const god=(world,id,action,extra={})=>applyCommand(world,{
 worldId:world.id,commandId:id,actorRole:"admin",action,...extra
});
const spawn=(world,id,position)=> {
 assert.equal(god(world,id,"npc.spawn",{position,parameters:{name:id}}).ok,true);
 return world.entities.find(e=>e.id==="npc-"+id);
};
const house=(world,id,position,mode="completed")=>{
 assert.equal(god(world,id,"construction.place",{position,
  parameters:{blueprintId:"building.community_house",mode}}).ok,true);
 return world.entities.find(e=>e.id==="construction-"+id);
};
test("satiety declines on logical ticks, drives debuffs and starvation damage",()=>{
 const w=createWorld("w");
 const npc=spawn(w,"hungry",{x:1,y:1});
 npc.satiety=11;
 for(let i=0;i<8;i++)advanceTick(w);
 assert.equal(npc.satiety,9);
 assert.ok(npc.effects?.some(e=>e.definitionId==="starving"));
 assert.equal(resolveAttributes(npc,w.tick).values.workRate<
  resolveAttributes({attributes:{mood:75}},w.tick).values.workRate,true);
 npc.satiety=1; const hp=npc.health;
 for(let i=0;i<8;i++)advanceTick(w);
 assert.equal(npc.satiety,0);
 assert.equal(npc.health,hp-2);
 for(let i=0;i<400;i++)advanceTick(w);
 assert.equal(npc.health,0);
 assert.equal(npc.ai.activity,null);
});
test("survival gets priority; real apple is consumed, not duplicated",()=>{
 const w=createWorld("w");
 const npc=spawn(w,"eater",{x:1,y:1});
 npc.satiety=20;npc.inventory={apple:1};
 for(let i=0;i<3;i++)advanceTick(w);
 assert.equal(npc.inventory.apple,0);
 assert.equal(npc.satiety,55);
 assert.equal(npc.ai.activity,"Alimentando-se");
 assert.equal(npc.effects?.some(e=>e.definitionId==="hungry"),false);
});
test("bed assignment is limited, unique, and conditional shelter buff only during sleep",()=>{
 const w=createWorld("w",22,18);
 const building=house(w,"communal",{x:10,y:8});
 assert.equal(bedsIn(building),6);
 const npcs=[];
 for(let i=0;i<7;i++)npcs.push(spawn(w,"p"+i,{x:1+i,y:1}));
 for(let i=0;i<6;i++)assert.equal(reserveBed(w,npcs[i],building),true);
 assert.equal(reservationCount(building),6);
 assert.equal(reserveBed(w,npcs[0],building),true);
 assert.equal(reserveBed(w,npcs[6],building),false);
 releaseBed(w,npcs[0]);
 assert.equal(reserveBed(w,npcs[6],building),true);
 assert.equal(reservationCount(building),6);
 // Sleeping on the side of a completed community house grants shelter, faster recovery.
 const sleepy=createWorld("sleep",18,12);
 const home=house(sleepy,"home",{x:9,y:5});
 const inside=spawn(sleepy,"inside",{x:8,y:5});
 const outside=spawn(sleepy,"outside",{x:1,y:1});
 inside.energy=10;outside.energy=10;
 // Temporarily fill all beds except the one the first NPC reserves.
 for(let i=0;i<3;i++)advanceTick(sleepy);
 assert.equal(reservedHouse(sleepy,inside)?.id,home.id);
 assert.equal(inside.ai.activity,"Dormindo");
 assert.ok(inside.energy>outside.energy);
 assert.ok(inside.effects.some(e=>e.definitionId==="well_sheltered"));
 assert.equal(outside.effects?.some(e=>e.definitionId==="well_sheltered")??false,false);
});
test("destroy disables house, releases reservations and shelter effect; remove frees cells",()=>{
 const w=createWorld("w",16,12);
 const home=house(w,"home",{x:6,y:4});
 const npc=spawn(w,"rest",{x:5,y:4});
 npc.energy=10;
 for(let i=0;i<3;i++)advanceTick(w);
 assert.equal(home.bedReservations[npc.id]!==undefined,true);
 assert.ok(npc.effects?.some(e=>e.definitionId==="well_sheltered"));
 assert.equal(god(w,"destroy","construction.destroy",{targetId:home.id}).ok,true);
 assert.equal(home.status,"destroyed");
 assert.equal(home.availability,"unavailable");
 assert.equal(reservationCount(home),0);
 assert.equal(npc.effects.some(e=>e.definitionId==="well_sheltered"),false);
 assert.equal(bedsIn(home),0);
 assert.equal(canEnter(w,{x:6,y:4}),false);
 assert.equal(god(w,"again","construction.destroy",{targetId:home.id}).error,"ALREADY_COMPLETED");
 const result=god(w,"remove","construction.remove",{targetId:home.id});
 assert.equal(result.ok,true);
 assert.equal(w.entities.find(e=>e.id===home.id),undefined);
 assert.equal(canEnter(w,{x:6,y:4}),true);
});
test("removing a depot with physical stock is an explicit irreversible God Mode operation",()=>{
 const w=createWorld("w");
 assert.equal(god(w,"depot","construction.place",{
  position:{x:4,y:4},parameters:{blueprintId:"building.depot",mode:"completed"}}).ok,true);
 const depot=w.entities.find(e=>e.id==="construction-depot");
 assert.equal(god(w,"load","storage.admin_supply",{
  targetId:depot.id,parameters:{materialId:"apple",quantity:18}}).ok,true);
 assert.equal(god(w,"noauth","construction.remove",{
  actorRole:"npc",targetId:depot.id}).error,"UNAUTHORIZED");
 assert.equal(god(w,"delete","construction.remove",{targetId:depot.id}).ok,true);
 assert.equal(w.entities.find(e=>e.id===depot.id),undefined);
 assert.equal(w.entities.some(e=>e.kind==="resource"&&e.resourceType==="food"),false);
});
test("suitable tool and physical attributes modify deterministic injury probability",()=>{
 const npc={id:"npc-1",kind:"character",name:"Builder",position:{x:0,y:0},health:100,energy:100,
  equipment:{},attributes:{agility:10,endurance:10}};
 const before=injuryProbability(npc,"resource.gather:wood",10);
 npc.equipment={tool:"axe"};
 const after=injuryProbability(npc,"resource.gather:wood",10);
 assert.ok(after<before/4);
 assert.equal(injuryProbability(npc,"resource.gather:stone",10),0.12);
 npc.attributes={agility:20,endurance:20};
 assert.ok(injuryProbability(npc,"resource.gather:wood",10)<after);
 npc.attributes={agility:10,endurance:10};npc.equipment={};
 let example;
 for(let i=0;i<500;i++){
  const fresh={...npc,health:100,effects:[],injuries:0};
  if(evaluateActionRisk(fresh,"resource.gather:wood",10,"risk-roll-"+i)){
   example=fresh;break;
  }
 }
 assert.ok(example,"At least one deterministic risk roll should injure");
 assert.ok(example.health<100);
 assert.equal(example.injuries,1);
 assert.ok(example.effects.some(e=>e.definitionId==="injured"));
 assert.ok(resolveAttributes(example,10).values.workRate<
  resolveAttributes({attributes:{mood:75}},10).values.workRate);
 expireEffects(example,"npc-1",41);
 assert.equal(example.effects.some(e=>e.definitionId==="injured"),false);
});
test("God Mode allows only named tools; equip operation changes NPC equipment",()=>{
 const w=createWorld("w");
 const npc=spawn(w,"worker",{x:2,y:2});
 assert.equal(god(w,"equip","npc.admin_equip",{targetId:npc.id,parameters:{tool:"hammer"}}).ok,true);
 assert.equal(npc.equipment.tool,"hammer");
 assert.equal(god(w,"invalid","npc.admin_equip",{targetId:npc.id,parameters:{tool:"laser"}}).error,"INVALID_PAYLOAD");
 assert.equal(god(w,"unequip","npc.admin_equip",{targetId:npc.id,parameters:{tool:null}}).ok,true);
 assert.equal(npc.equipment.tool,undefined);
});
test("inspection exposes survival, risk and bed reservations",async()=>{
 const {server}=makePrototype();await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+server.address().port;
 const post=(path,body)=>fetch(base+path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
 try{
  const catalog=await (await fetch(base+"/api/catalog")).json();
  assert.equal(catalog.tools.axe,"Machado");
  assert.equal(catalog.buildingBlueprints["building.community_house"].housing.adultBeds,6);
  const result=await (await post("/api/brush",{role:"admin",commands:[{
   commandId:"home",action:"construction.place",position:{x:17,y:8},
   parameters:{blueprintId:"building.community_house",mode:"completed"}
  }]})).json();
  assert.equal(result.results[0].ok,true);
  const home=await (await fetch(base+"/api/inspect?entityId=construction-home")).json();
  assert.equal(home.construction.housing.beds,6);
  const npc=await (await fetch(base+"/api/inspect?entityId=npc-npc-init")).json();
  assert.equal(npc.survival.satiety,100);
  assert.equal(npc.survival.risk.wood>0,true);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
