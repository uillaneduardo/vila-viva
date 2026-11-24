import test from "node:test";
import assert from "node:assert/strict";
import {createWorld,applyCommand,advanceTick} from "../packages/engine/src/engine.ts";
import type {Character} from "../packages/domain/src/contracts.ts";
test("critically hungry NPC frees physical cargo, picks up food and eats",()=>{
 const w=createWorld("emergency",5,5);
 const npc:Character={kind:"character",id:"a",name:"A",position:{x:1,y:1},health:100,energy:100,satiety:8,inventory:{wood:12}};
 w.entities.push(npc,{kind:"item",id:"food",position:{x:2,y:1},itemId:"apple",quantity:1,createdTick:0});
 for(let i=0;i<12;i++)advanceTick(w);
 assert.ok((npc.satiety??0)>10);
 assert.equal((npc.inventory?.wood??0)+w.entities.filter(e=>e.kind==="item"&&e.itemId==="wood").reduce((n,e)=>n+e.quantity,0)+w.entities.filter(e=>e.kind==="construction").reduce((n,e)=>n+(e.stock?.wood??0),0),12);
});
test("drop rejects overdraw and preserves quantity",()=>{
 const w=createWorld("drop",5,5);
 const npc:Character={kind:"character",id:"a",name:"A",position:{x:1,y:1},health:100,energy:100,inventory:{wood:2}};
 w.entities.push(npc);
 const cmd={worldId:w.id,commandId:"drop",actorRole:"npc" as const,actorId:"a",targetId:"a",action:"item.drop" as const,parameters:{materialId:"wood",quantity:3}};
 assert.equal(applyCommand(w,cmd,{internal:true}).ok,false);
 assert.equal(npc.inventory?.wood,2);
 assert.equal(w.entities.length,1);
});
