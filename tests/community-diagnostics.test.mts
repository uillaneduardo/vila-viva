import test from "node:test";
import assert from "node:assert/strict";
import {createWorld} from "../packages/engine/src/engine.ts";
import type {Character} from "../packages/domain/src/contracts.ts";
import {foodAccess,createCommunityDiagnostics} from "../scripts/community-diagnostics.mts";
test("diagnostics distinguish edible stock from seeds and preserve world",()=>{
 const w=createWorld("diag",5,5);
 const npc:Character={id:"a",kind:"character",name:"A",position:{x:1,y:1},health:100,energy:100,satiety:0,inventory:{apple:1}};
 w.entities.push(npc,{kind:"item",id:"food",position:{x:2,y:1},itemId:"apple",quantity:2,createdTick:0},{kind:"item",id:"seed",position:{x:2,y:2},itemId:"apple_seed",quantity:30,createdTick:0});
 const before=JSON.stringify(w);
 assert.deepEqual(foodAccess(w,npc),{personal:35,external:70,reachable:70,load:1});
 const d=createCommunityDiagnostics();d.observe(w);
 assert.equal(d.report().criticalSamples.personal_food,1);
 assert.equal(JSON.stringify(w),before);
 npc.health=0;npc.deathTick=1;d.observe(w);d.observe(w);
 assert.equal(d.report().deaths.length,1);
});
test("diagnostics identify isolated food without claiming starvation cause",()=>{
 const w=createWorld("diag",5,5);
 const npc:Character={id:"a",kind:"character",name:"A",position:{x:0,y:0},health:100,energy:100,satiety:0};
 w.entities.push(npc,{kind:"obstacle",id:"b",position:{x:1,y:0},obstacleType:"wall",blocksMovement:true},{kind:"obstacle",id:"c",position:{x:0,y:1},obstacleType:"wall",blocksMovement:true},{kind:"item",id:"food",position:{x:4,y:4},itemId:"apple",quantity:1,createdTick:0});
 assert.equal(foodAccess(w,npc).reachable,0);
 const d=createCommunityDiagnostics();d.observe(w);assert.equal(d.report().criticalSamples.no_route,1);
});
