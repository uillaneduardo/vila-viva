import test from "node:test";
import assert from "node:assert/strict";
import {createWorld} from "../packages/engine/src/engine.ts";
import {createCompletedBuilding} from "../packages/systems/construction/src/index.ts";
import {buildingBlueprint} from "../packages/content/src/buildings/registry.ts";
import {upgradeDemand} from "../packages/systems/leadership/src/upgrades.ts";
test("upgrade demand uses actual housing and grave shortages, not speculative family capacity",()=>{
 const w=createWorld("upgrade-demand");
 const make=(id,x)=>{const b=createCompletedBuilding(id,{x,y:5},buildingBlueprint(id),0);w.entities.push(b);return b;};
 const house=make("building.community_house",2),family=make("building.family_house",6),grave=make("building.cemetery",10);
 const p={needed:false,overflow:0};
 assert.equal(upgradeDemand(w,house,p),undefined);assert.equal(upgradeDemand(w,family,p),undefined);
 for(let i=0;i<7;i++)w.entities.push({kind:"character",id:"npc-"+i,name:"NPC",position:{x:i,y:0},health:100,energy:100});
 assert.equal(upgradeDemand(w,house,p)?.gain,3);
 grave.burials=Array.from({length:12},(_,i)=>({npcId:"buried-"+i,name:"NPC",deathTick:0,burialTick:0,cause:"test"}));
 assert.equal(upgradeDemand(w,grave,p),undefined);
 w.entities.push({kind:"character",id:"corpse",name:"NPC",position:{x:8,y:0},health:0,energy:0});
 assert.equal(upgradeDemand(w,grave,p)?.gain,12);
});
