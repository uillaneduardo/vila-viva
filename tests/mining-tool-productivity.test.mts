import test from "node:test";
import assert from "node:assert/strict";
import {createWorld,applyCommand} from "../packages/engine/src/engine.ts";
import {productionNeeds,planProduction} from "../packages/systems/leadership/src/production.ts";
const god=(w,id,action,extra={})=>applyCommand(w,{worldId:w.id,commandId:id,actorRole:"admin",action,...extra});
test("surface mineral yield is minimal without an equipped pickaxe and higher with it",()=>{
 for(const material of ["stone","iron_ore","copper_ore"]){
  const w=createWorld("ore-"+material,12,12);
  assert.ok(god(w,"miner","npc.spawn",{position:{x:2,y:2}}).ok);
  assert.ok(god(w,"ore","resource.spawn",{position:{x:3,y:2},parameters:{resourceType:material,quantity:20}}).ok);
  const n=w.entities.find(e=>e.id==="npc-miner"),source=w.entities.find(e=>e.id==="resource-ore");
  n.inventory={pickaxe:1};n.equipment={};
  const act=(id,action,targetId,parameters={})=>applyCommand(w,{worldId:w.id,commandId:id,actorRole:"npc",actorId:n.id,action,targetId,parameters});
  assert.ok(act("bare","resource.gather",source.id).ok);assert.equal(source.quantity,19);
  assert.ok(act("equip","npc.equip",n.id,{tool:"pickaxe"}).ok);
  assert.ok(act("equipped","resource.gather",source.id).ok);
  assert.ok(source.quantity>=14&&source.quantity<=16);
  const pile=w.entities.find(e=>e.kind==="item"&&e.itemId===material);
  assert.equal(pile.quantity+source.quantity,20);
  source.quantity=1;
  assert.ok(act("last","resource.gather",source.id).ok);assert.equal(source.quantity,0);
 });
});
test("leader counts actual mining demand and does not manufacture phantom equipment",()=>{
 const w=createWorld("mining-demand",20,20);
 for(let i=0;i<3;i++){
  assert.ok(god(w,"worker-"+i,"npc.spawn",{position:{x:2+i,y:2}}).ok);
  const n=w.entities.find(e=>e.id==="npc-worker-"+i);n.traits=["miner"];n.inventory={};n.equipment={};
 }
 assert.ok(god(w,"shop","construction.place",{position:{x:8,y:8},parameters:{blueprintId:"building.workshop",mode:"completed"}}).ok);
 assert.ok(god(w,"ore","resource.spawn",{position:{x:5,y:5},parameters:{resourceType:"iron_ore",quantity:30}}).ok);
 const need=productionNeeds(w).find(x=>x.item==="pickaxe");
 assert.equal(need.desired,3);assert.equal(need.missing,3);
 assert.equal(planProduction(w).recipeId,"smelt_iron");
});
