import test from "node:test";
import assert from "node:assert/strict";
import {createWorld,applyCommand,advanceTick} from "../packages/engine/src/engine.ts";
import {storageFree} from "../packages/systems/construction/src/index.ts";
import {canEnter} from "../packages/systems/collision/src/index.ts";
import {validateWorld} from "../packages/protocol/src/world-snapshot.ts";
import type {Character,Command} from "../packages/domain/src/contracts.ts";
const setup=()=>{const w=createWorld("temporary",8,8);const npc:Character={id:"a",kind:"character",name:"A",position:{x:2,y:2},health:100,energy:100,satiety:100,inventory:{wood:12}};w.entities.push(npc);return {w,npc};};
test("NPC creates a walkable temporary area and removal preserves every item",()=>{
 const {w,npc}=setup();
 const run=(command:Partial<Command>)=>applyCommand(w,{worldId:w.id,actorRole:"npc",actorId:npc.id,commandId:"create",action:"storage.temporary.create",position:{x:3,y:2},parameters:{materialId:"wood",quantity:12},...command},{internal:true});
 assert.equal(run({}).ok,true);
 const area=w.entities.find(e=>e.kind==="construction");assert.ok(area?.kind==="construction");
 assert.equal(storageFree(area),0);assert.equal(npc.inventory?.wood,0);assert.equal(canEnter(w,area.position,npc.id),true);
 assert.equal(run({commandId:"duplicate"}).ok,false);
 validateWorld(JSON.parse(JSON.stringify(w)));
 assert.equal(run({commandId:"remove",action:"storage.temporary.remove",targetId:area.id}).ok,true);
 assert.equal(w.entities.filter(e=>e.kind==="item"&&e.itemId==="wood").reduce((n,e)=>n+e.quantity,0),12);
 assert.equal(w.entities.some(e=>e.id===area.id),false);
});
test("full NPC creates temporary storage autonomously without a leader",()=>{
 const {w,npc}=setup();for(let i=0;i<3;i++)advanceTick(w);
 assert.ok(w.entities.some(e=>e.kind==="construction"&&e.blueprintId==="building.temporary_storage"&&e.stock?.wood===12));
 assert.equal(npc.inventory?.wood,0);
});
test("normal depot remains preferred",()=>{
 const {w,npc}=setup();
 assert.equal(applyCommand(w,{worldId:w.id,commandId:"depot",actorRole:"admin",action:"construction.place",position:{x:3,y:2},parameters:{blueprintId:"building.depot",mode:"completed"}}).ok,true);
 for(let i=0;i<3;i++)advanceTick(w);
 assert.equal(npc.inventory?.wood,0);
 assert.equal(w.entities.some(e=>e.kind==="construction"&&e.blueprintId==="building.temporary_storage"),false);
});
