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
test("headless NPC movement and command idempotency",()=>{
 const world=createWorld("w");
 const spawn={commandId:"n1",worldId:"w",actorRole:"admin" as const,action:"npc.spawn" as const,position:{x:2,y:2},parameters:{name:"Ayla"}};
 assert.equal(applyCommand(world,spawn).ok,true);
 const targetId="npc-n1";
 const move={commandId:"move1",worldId:"w",actorRole:"npc" as const,actorId:targetId,action:"movement.move" as const,targetId,position:{x:3,y:2}};
 assert.equal(applyCommand(world,move).ok,true);
 assert.equal(world.entities[0].position.x,3);
 assert.equal(applyCommand(world,move).ok,false);
 assert.equal(world.tick,2);
});
test("out of bounds command does not change world",()=>{
 const world=createWorld("w");
 const res=applyCommand(world,{commandId:"bad",worldId:"w",actorRole:"admin",action:"npc.spawn",position:{x:100,y:2},parameters:{name:"Test"}});
 assert.deepEqual(res,{ok:false,status:"rejected",commandId:"bad",error:"OUT_OF_BOUNDS"});
 assert.equal(world.tick,0);
});

test("a player cannot issue movement commands for an NPC",()=>{
 const w=createWorld("x");
 applyCommand(w,{commandId:"spawn",worldId:"x",actorRole:"admin",action:"npc.spawn",position:{x:1,y:1},parameters:{name:"Ayla"}});
 const cmd={commandId:"steal",worldId:"x",actorRole:"player" as const,actorId:"player-1",action:"movement.move" as const,targetId:"npc-spawn",position:{x:2,y:1}};
 const res=applyCommand(w,cmd);
 assert.equal(res.ok,false);
 assert.equal(w.entities[0].position.x,1);
});

test("accepted movement records actual charged duration; rejection leaves record unchanged",()=>{
 const world=createWorld("motion");
 applyCommand(world,{commandId:"n",worldId:"motion",actorRole:"admin",action:"npc.spawn",position:{x:2,y:2},parameters:{name:"NPC"}});
 const actor=world.entities[0];assert.equal(actor.kind,"character");if(actor.kind!=="character")throw Error("NPC");
 const start=world.tick,energy=actor.energy;
 const move={commandId:"move",worldId:"motion",actorRole:"npc" as const,actorId:actor.id,targetId:actor.id,action:"movement.move" as const,position:{x:3,y:2}};
 assert.equal(applyCommand(world,move,{internal:true}).ok,true);
 assert.deepEqual(actor.movementSegment,{from:{x:2,y:2},to:{x:3,y:2},startTick:start,endTick:actor.nextMoveTick});
 assert.equal(actor.energy,energy-1);assert.equal(world.tick,start);
 const before=structuredClone(actor.movementSegment);
 assert.equal(applyCommand(world,{...move,commandId:"blocked",position:{x:4,y:2}},{internal:true}).ok,false);
 assert.deepEqual(actor.movementSegment,before);
});
