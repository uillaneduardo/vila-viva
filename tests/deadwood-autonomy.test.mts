import test from "node:test";
import assert from "node:assert/strict";
import {createWorld,applyCommand,advanceTick} from "../packages/engine/src/engine.ts";
import type {Character} from "../packages/domain/src/contracts.ts";
const admin=(w,id,action,position,parameters)=>applyCommand(w,{worldId:w.id,commandId:id,actorRole:"admin",action,position,parameters});
test("NPC cuts dead apple tree outside any farming zone",()=>{
 const w=createWorld("deadwood",8,8);
 assert.ok(admin(w,"worker","npc.spawn",{x:2,y:2},{}).ok);
 const npc=w.entities[0] as Character; npc.inventory={};
 assert.ok(admin(w,"tree","resource.spawn",{x:3,y:2},{resourceType:"food",sourceId:"apple_tree",ageTicks:3000,quantity:0}).ok);
 for(let i=0;i<12;i++)advanceTick(w);
 assert.ok(!w.entities.some(e=>e.id==="resource-tree"));
 assert.ok((npc.inventory?.wood??0)>=3&&(npc.inventory?.wood??0)<=5);
});
test("fully enclosed NPC exposes physical blockers without destroying buildings or walls",()=>{
 const w=createWorld("trap",3,3);
 assert.ok(admin(w,"worker","npc.spawn",{x:1,y:1},{}).ok);
 for(const [i,p] of [{x:0,y:1},{x:2,y:1},{x:1,y:0},{x:1,y:2}].entries())assert.ok(admin(w,"wall"+i,"obstacle.spawn",p,{obstacleType:"wall"}).ok);
 for(let i=0;i<6;i++)advanceTick(w);
 const npc=w.entities[0] as Character;
 assert.equal(npc.ai?.activity,"Bloqueado");
 assert.match(npc.ai?.reason??"",/obstacle/);
 assert.equal(w.entities.filter(e=>e.kind==="obstacle").length,4);
});
