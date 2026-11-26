import test from "node:test";
import assert from "node:assert/strict";
import {createWorld,applyCommand} from "../packages/engine/src/engine.ts";
import {advanceNpcDecisions,travelActivity} from "../packages/systems/ai/src/index.ts";
import {validateWorld} from "../packages/protocol/src/world-snapshot.ts";
import type {Character,Resource,Construction,World} from "../packages/domain/src/contracts.ts";
function fixture(){
 const w=createWorld("batch",16,12);
 const admin=(id:string,action:any,position:any,parameters:any)=>applyCommand(w,{worldId:w.id,commandId:id,actorRole:"admin",action,position,parameters});
 assert.ok(admin("worker","npc.spawn",{x:2,y:4},{}).ok);
 assert.ok(admin("wood","resource.spawn",{x:3,y:4},{resourceType:"wood",quantity:60}).ok);
 assert.ok(admin("depot","construction.place",{x:9,y:4},{blueprintId:"building.depot",mode:"completed"}).ok);
 const npc=w.entities.find(e=>e.kind==="character") as Character;
 npc.inventory={};npc.energy=100;npc.satiety=100;
 return {w,npc};
}
function step(w:World){w.tick+=3;advanceNpcDecisions(w,c=>applyCommand(w,c,{internal:true}));}
test("surface extraction accumulates physical cargo before hauling, survives reload, conserves wood",()=>{
 let {w,npc}=fixture();
 step(w);
 assert.equal(npc.ai?.extractionCommitment?.targetId,"resource-wood");
 w=JSON.parse(JSON.stringify(w));validateWorld(w);
 npc=w.entities.find(e=>e.kind==="character") as Character;
 for(let i=0;i<7&&(npc.inventory?.wood??0)<4;i++)step(w);
 const source=w.entities.find(e=>e.id==="resource-wood") as Resource;
 const depot=w.entities.find(e=>e.id==="construction-depot") as Construction;
 assert.ok((npc.inventory?.wood??0)>=4);
 assert.equal(depot.stock?.wood??0,0);
 assert.equal(source.quantity+(npc.inventory?.wood??0)+w.entities.reduce((n,e)=>n+(e.kind==="item"&&e.itemId==="wood"?e.quantity:0),0),60);
 npc.satiety=5;npc.inventory!.apple=1;step(w);
 assert.equal(npc.ai?.extractionCommitment,undefined);
 assert.ok(npc.satiety>5);
});
test("invalid extraction intent rejected and ore labels use actual catalog IDs",()=>{
 const {w,npc}=fixture();step(w);
 assert.ok(npc.ai?.extractionCommitment);
 npc.ai!.extractionCommitment!.lastProgressTick=w.tick+1;
 assert.throws(()=>validateWorld(w),/INVALID_WORLD/);
 assert.equal(travelActivity("resource.gather","Buscando recursos","iron_ore"),"Indo minerar ferro");
 assert.equal(travelActivity("resource.gather","Buscando recursos","copper_ore"),"Indo minerar cobre");
});
