import test from "node:test";
import assert from "node:assert/strict";
import {createWorld,applyCommand} from "../packages/engine/src/engine.ts";
import {createCompletedBuilding} from "../packages/systems/construction/src/index.ts";
import {buildingBlueprint} from "../packages/content/src/buildings/registry.ts";
import {proposeNextConstruction} from "../packages/systems/leadership/src/index.ts";
import type {Character} from "../packages/domain/src/contracts.ts";
test("leader plans additional permanent storage when overflow accumulates",()=>{
 const w=createWorld("overflow",16,16);
 assert.ok(applyCommand(w,{worldId:w.id,commandId:"leader",actorRole:"admin",action:"npc.spawn",position:{x:2,y:2},parameters:{communityRole:"leader"}}).ok);
 const leader=w.entities[0] as Character;
 leader.inventory={wood:4,stone:4};
 const depot=createCompletedBuilding("depot",{x:5,y:5},buildingBlueprint("building.depot")!,w.tick);
 depot.stock={wood:120};w.entities.push(depot);
 for(let i=0;i<3;i++){
  const area=createCompletedBuilding("temp"+i,{x:8+i,y:8},buildingBlueprint("building.temporary_storage")!,w.tick);
  area.stock={wood:12};w.entities.push(area);
 }
 assert.equal(proposeNextConstruction(w,leader)?.blueprintId,"building.depot");
 depot.stock={wood:10};
 assert.notEqual(proposeNextConstruction(w,leader)?.blueprintId,"building.depot");
});
