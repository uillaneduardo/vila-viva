import test from "node:test";
import assert from "node:assert/strict";
import {DefinitionRegistry} from "../packages/domain/src/registry.ts";
import {baseRegistry,createBaseRegistry} from "../packages/content/src/catalog.ts";
import {createWorld,applyCommand} from "../packages/engine/src/engine.ts";

test("registry contains content and action contracts with unique IDs",()=>{
 assert.equal(baseRegistry.entity("resource.wood").kind,"resource");
 assert.equal(baseRegistry.action("movement.move").readonly,false);
 assert.equal(createBaseRegistry().entities.size,7);
 const registry=new DefinitionRegistry();
 registry.registerEntity({id:"test",kind:"item",components:["position"],description:"item"});
 assert.throws(()=>registry.registerEntity({id:"test",kind:"item",components:["position"],description:"again"}));
 assert.throws(()=>registry.registerEntity({id:"bad",kind:"item",components:["position","position"],description:"duplicate"}));
});

test("engine does not spawn an unregistered resource",()=>{
 const w=createWorld("w");
 const result=applyCommand(w,{commandId:"r1",worldId:"w",actorRole:"admin",action:"resource.spawn",position:{x:1,y:1},parameters:{resourceType:"unknown",quantity:5}});
 assert.equal(result.ok,false);assert.equal(w.entities.length,0);assert.equal(w.tick,0);
 const good=applyCommand(w,{commandId:"r2",worldId:"w",actorRole:"admin",action:"resource.spawn",position:{x:1,y:1},parameters:{resourceType:"wood",quantity:5}});
 assert.equal(good.ok,true);assert.equal(w.entities.length,1);
});
