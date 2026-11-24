import test from "node:test";
import assert from "node:assert/strict";
import {createWorld,applyCommand,inventoryLoad,MAX_CARRY_ITEMS} from "../packages/engine/src/engine.ts";
import {generateStartingInventory} from "../packages/content/src/characters.ts";
import {planAgriculture,advanceLeaderDecisions} from "../packages/systems/leadership/src/index.ts";
import type {Character} from "../packages/domain/src/contracts.ts";
import {ITEMS} from "../packages/content/src/items.ts";

test("trait cargo is reproducible, valid and leaves room to harvest",()=>{
 let nonempty=0;
 for(let i=0;i<100;i++){
  const args=["world","npc"+i,0,["farmer","miner"],MAX_CARRY_ITEMS] as const;
  const a=generateStartingInventory(...args),b=generateStartingInventory(...args);
  assert.deepEqual(a,b);
  assert.ok(Object.values(a).reduce((n,v)=>n+v,0)<=6);
  for(const [id,count] of Object.entries(a)){assert.ok(ITEMS[id]);assert.ok(Number.isInteger(count)&&count>0);}
  if(Object.keys(a).length)nonempty++;
 }
 assert.ok(nonempty>0);
});

test("leader creates a physical zone backed by seeds, not plants or extra seeds",()=>{
 const w=createWorld("farm-plan",10,10);
 assert.ok(applyCommand(w,{worldId:w.id,commandId:"leader",actorRole:"admin",action:"npc.spawn",position:{x:4,y:4},parameters:{communityRole:"leader"}}).ok);
 const leader=w.entities.find(e=>e.kind==="character") as Character;
 leader.inventory={carrot_seed:4};
 w.tick=12;
 const proposal=planAgriculture(w,leader);
 assert.equal(proposal?.sourceId,"carrot");
 advanceLeaderDecisions(w,cmd=>applyCommand(w,cmd,{internal:true}));
 assert.equal(w.entities.filter(e=>e.kind==="planting_zone").length,1);
 assert.deepEqual(leader.inventory,{carrot_seed:4});
 assert.equal(w.entities.filter(e=>e.kind==="resource").length,0);
 assert.equal(planAgriculture(w,leader),undefined);
 assert.ok(inventoryLoad(leader)<=MAX_CARRY_ITEMS);
});

test("external NPC cannot demarcate a zone",()=>{
 const w=createWorld("auth",8,8);
 assert.ok(applyCommand(w,{worldId:w.id,commandId:"leader",actorRole:"admin",action:"npc.spawn",position:{x:1,y:1},parameters:{communityRole:"leader"}}).ok);
 assert.equal(applyCommand(w,{worldId:w.id,commandId:"bad",actorRole:"npc",actorId:"npc-leader",action:"farming.zone.create",position:{x:4,y:4},parameters:{sourceId:"carrot",width:2,height:2}}).ok,false);
});
