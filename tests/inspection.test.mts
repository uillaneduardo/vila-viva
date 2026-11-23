import assert from "node:assert/strict";
import test from "node:test";
import {createWorld,applyCommand} from "../packages/engine/src/engine.ts";

test("inspection is a read-only command and does not advance simulation time",()=>{
 const world=createWorld("test");
 applyCommand(world,{worldId:"test",commandId:"create",actorRole:"admin",action:"npc.spawn",position:{x:3,y:3},parameters:{name:"Ayla"}});
 const before=world.tick;
 const result=applyCommand(world,{worldId:"test",commandId:"inspect",actorRole:"player",action:"entity.inspect",targetId:"npc-create"});
 assert.equal(result.ok,true);
 assert.equal(world.tick,before);
 assert.equal(world.appliedCommands.length,1);
});
