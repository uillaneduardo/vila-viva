import assert from "node:assert/strict";
import test from "node:test";
import {createWorld,applyCommand} from "../packages/engine/src/engine.ts";

test("admin creates a resource and player cannot",()=>{
 const world=createWorld("demo");
 const resource={commandId:"c1",worldId:"demo",actorRole:"admin" as const,action:"resource.spawn" as const,position:{x:2,y:3},parameters:{resourceType:"wood",quantity:10}};
 assert.equal(applyCommand(world,resource).ok,true);
 assert.equal(world.entities.length,1);
 assert.equal(applyCommand(world,{...resource,commandId:"c2",actorRole:"player"}).ok,false);
 assert.equal(world.entities.length,1);
});
test("simple headless first player action and command idempotency",()=>{
 const world=createWorld("w");
 const spawn={commandId:"n1",worldId:"w",actorRole:"admin" as const,action:"npc.spawn" as const,position:{x:2,y:2},parameters:{name:"Ayla"}};
 assert.equal(applyCommand(world,spawn).ok,true);
 const targetId="npc-n1";
 const move={commandId:"move1",worldId:"w",actorRole:"player" as const,action:"movement.move" as const,targetId,position:{x:4,y:4}};
 assert.equal(applyCommand(world,move).ok,true);
 assert.equal(world.entities[0].position.x,4);
 assert.equal(applyCommand(world,move).ok,false);
 assert.equal(world.tick,2);
});
test("out of bounds command does not change world",()=>{
 const world=createWorld("w");
 const res=applyCommand(world,{commandId:"bad",worldId:"w",actorRole:"admin",action:"npc.spawn",position:{x:100,y:2},parameters:{name:"Test"}});
 assert.deepEqual(res,{ok:false,status:"rejected",commandId:"bad",error:"OUT_OF_BOUNDS"});
 assert.equal(world.tick,0);
});
