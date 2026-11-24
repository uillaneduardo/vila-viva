import test from "node:test";
import assert from "node:assert/strict";
import {createWorld,applyCommand} from "../packages/engine/src/engine.ts";
import {validateWorld} from "../packages/protocol/src/world-snapshot.ts";
import {canEnter} from "../packages/systems/collision/src/index.ts";
test("physical extraction conserves materials and pickup is bounded and exclusive",()=>{
 const run=()=>{
  const w=createWorld("drops",8,8);
  const cmd=(id,action,extra={})=>applyCommand(w,{worldId:w.id,commandId:id,actorRole:"admin",action,...extra});
  assert.ok(cmd("a","npc.spawn",{position:{x:2,y:2},parameters:{ownerId:"a"}}).ok);
  assert.ok(cmd("b","npc.spawn",{position:{x:2,y:3},parameters:{ownerId:"b"}}).ok);
  assert.ok(cmd("wood","resource.spawn",{position:{x:3,y:2},parameters:{resourceType:"wood",quantity:10}}).ok);
  const a=w.entities.find(e=>e.id==="npc-a");a.inventory={stone:11};
  assert.ok(cmd("gather","resource.gather",{actorRole:"player",actorId:"a",targetId:"resource-wood"}).ok);
  const pile=w.entities.find(e=>e.kind==="item");const source=w.entities.find(e=>e.id==="resource-wood");
  assert.ok(pile.quantity>=1&&pile.quantity<=3);assert.equal(source.quantity+pile.quantity,10);
  assert.equal(a.inventory.wood??0,0);assert.ok(canEnter(w,pile.position,a.id));validateWorld(w);
  const amount=pile.quantity;
  assert.ok(cmd("pick-a","item.pickup",{actorRole:"player",actorId:"a",targetId:pile.id}).ok);
  assert.equal(a.inventory.wood,1);
  if(amount>1)assert.ok(cmd("pick-b","item.pickup",{actorRole:"player",actorId:"b",targetId:pile.id}).ok);
  assert.ok(!w.entities.some(e=>e.kind==="item"));
  assert.equal(cmd("pick-again","item.pickup",{actorRole:"player",actorId:"b",targetId:pile.id}).error,"NOT_FOUND");
  validateWorld(w);return w;
 };
 assert.deepEqual(run(),run());
});
