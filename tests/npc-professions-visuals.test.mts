import test from "node:test";
import assert from "node:assert/strict";
import {assignProfessions} from "../packages/systems/leadership/src/professions.ts";
import {createWorld} from "../packages/engine/src/engine.ts";
import {characterProfession,resolveWorkAnimation,workPhase} from "../packages/renderer/src/character-accessories.js";
import {validateWorld} from "../packages/protocol/src/world-snapshot.ts";
test("leader assigns persistent professions without inferring them from work",()=>{
 const w=createWorld("profession",12,12);
 const citizen={kind:"character" as const,id:"a",name:"A",position:{x:1,y:1},health:100,energy:100,traits:["farmer"]};
 const leader={...citizen,id:"leader",position:{x:2,y:1},communityRole:"leader" as const};
 w.entities.push(citizen,leader);
 assignProfessions(w,leader);
 assert.equal(citizen.profession,"farm");
 assert.equal(citizen.professionAssignedBy,"leader");
 assert.equal(characterProfession({...citizen,ai:{activity:"Construindo"}}),"farm");
 w.tick++;assignProfessions(w,leader);
 assert.equal(citizen.professionAssignedTick,0);
 assert.doesNotThrow(()=>validateWorld(w));
});
test("work animations follow actual action independently of profession",()=>{
 const npc={profession:"farm",ai:{action:"resource.gather"}};
 assert.equal(resolveWorkAnimation(npc,{resourceType:"wood"}),"axe");
 assert.equal(resolveWorkAnimation(npc,{resourceType:"stone"}),"pickaxe");
 assert.equal(resolveWorkAnimation({ai:{action:"production.work"}},{blueprintId:"building.cafeteria"}),"cook");
 assert.equal(resolveWorkAnimation({ai:{action:"construction.work"}}),"hammer");
 assert.notEqual(workPhase("hammer",0),workPhase("hammer",100));
});

test("existing profession identifiers and save data stay compatible",()=>{
 const w=createWorld("legacy",12,12);
 for(const [i,profession] of ["farm","builder","miner","woodcutter","cook","carrier","artisan","healer","collector","gravedigger"].entries())w.entities.push({kind:"character",id:"npc-"+i,name:"NPC",position:{x:i,y:1},health:100,energy:100,profession});
 assert.doesNotThrow(()=>validateWorld(w));
 w.entities[0].profession="invalid";assert.throws(()=>validateWorld(w),/INVALID_WORLD/);
});
