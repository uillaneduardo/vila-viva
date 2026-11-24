import test from "node:test";
import assert from "node:assert/strict";
import {createWorld,applyCommand,advanceTick} from "../packages/engine/src/engine.ts";
import {bootstrapSeededWorld} from "../packages/content/src/world-seeds.ts";
import type {Character} from "../packages/domain/src/contracts.ts";
const admin=(w,id,action,position,parameters)=>applyCommand(w,{worldId:w.id,commandId:id,actorRole:"admin",action,position,parameters});
test("hungry NPC with two free slots harvests one apple and its seed",()=>{
 const w=createWorld("capacity",8,8);
 assert.ok(admin(w,"npc","npc.spawn",{x:2,y:2},{}).ok);
 const npc=w.entities[0] as Character;
 npc.inventory={wood:10};npc.satiety=30;
 assert.ok(admin(w,"apple","resource.spawn",{x:3,y:2},{resourceType:"food",sourceId:"apple_tree",ageTicks:120,quantity:10}).ok);
 for(let i=0;i<3;i++)advanceTick(w);
 assert.equal(npc.inventory.apple,1);
 assert.equal(npc.inventory.apple_seed,1);
 for(let i=0;i<3;i++)advanceTick(w);
 assert.ok(npc.satiety>30);
});
test("critical hunger without food suspends nonessential gathering",()=>{
 const w=createWorld("scarcity",8,8);
 assert.ok(admin(w,"npc","npc.spawn",{x:2,y:2},{}).ok);
 const npc=w.entities[0] as Character;npc.inventory={};npc.satiety=8;
 assert.ok(admin(w,"depot","construction.place",{x:4,y:4},{blueprintId:"building.depot",mode:"completed"}).ok);
 assert.ok(admin(w,"wood","resource.spawn",{x:3,y:2},{resourceType:"wood",quantity:30}).ok);
 for(let i=0;i<12;i++)advanceTick(w);
 assert.equal(npc.inventory.wood??0,0);
 assert.match(npc.ai?.reason??"",/Fome crítica/);
});
test("seeded world has four autonomous settlers and no player avatar",()=>{
 const w=createWorld("seed",24,16);
 bootstrapSeededWorld(w,"oturo-starter-v1",c=>admin(w,c.commandId,c.action,c.position,c.parameters));
 assert.equal(w.entities.filter(e=>e.kind==="character").length,4);
 assert.ok(w.entities.every(e=>e.kind!=="character"||!e.ownerId));
});
