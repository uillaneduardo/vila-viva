import test from "node:test";
import assert from "node:assert/strict";
import {contextualActions,applyDemoEffect} from "../src/context-actions.js";
import {createDemoState} from "../../demo-world/src/fixtures.js";
test("player only sees allowed contextual actions",()=>{
 const s=createDemoState();
 for(const entity of [...s.npc,...s.resource,...s.building]){
  const actions=contextualActions("player",entity);
  assert.ok(actions.some(a=>a.id==="world.inspect"));
  assert.ok(!actions.some(a=>a.id==="npc.heal"||a.id==="resource.replenish"||a.id==="building.advance"));
 }
});
test("all player mutations stay planned and disabled",()=>{
 const s=createDemoState();
 assert.equal(contextualActions("player",s.resource[0]).find(a=>a.id==="resource.collect").enabled,false);
 assert.equal(contextualActions("player",s.building[0]).find(a=>a.id==="building.work").enabled,false);
});
test("admin effects change only chosen demo entity",()=>{
 const s=createDemoState(),n=s.npc[0],other=s.npc[1],before=other.health;
 assert.equal(applyDemoEffect(s,"npc.heal",n.id).ok,true);
 assert.equal(n.health,100);assert.equal(other.health,before);
 assert.equal(applyDemoEffect(s,"building.advance",n.id).ok,false);
 const building=s.building[1];applyDemoEffect(s,"building.advance",building.id);
 assert.equal(building.progress,100);
});
test("completed actions become disabled",()=>{
 const s=createDemoState();s.npc[0].health=100;
 assert.equal(contextualActions("admin",s.npc[0]).find(a=>a.id==="npc.heal").enabled,false);
});
