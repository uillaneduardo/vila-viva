import test from "node:test";
import assert from "node:assert/strict";
import {createWorld,applyCommand} from "../packages/engine/src/engine.ts";
import {haulingAvailable,activeHaulingClaim} from "../packages/systems/ai/src/hauling-claims.ts";
import {advanceNpcDecisions} from "../packages/systems/ai/src/index.ts";
import {storageFree} from "../packages/systems/construction/src/index.ts";
import {validateWorld} from "../packages/protocol/src/world-snapshot.ts";
import type {Character,Construction} from "../packages/domain/src/contracts.ts";
function fixture(){
 const w=createWorld("claims",24,16);
 for(const [id,x,y] of [["a",2,3],["b",2,7]] as const)assert.ok(applyCommand(w,{worldId:w.id,commandId:id,actorRole:"admin",action:"npc.spawn",position:{x,y},parameters:{}}).ok);
 assert.ok(applyCommand(w,{worldId:w.id,commandId:"depot",actorRole:"admin",action:"construction.place",position:{x:12,y:5},parameters:{blueprintId:"building.depot",mode:"completed"}}).ok);
 const [a,b]=w.entities.filter((e):e is Character=>e.kind==="character");
 const depot=w.entities.find((e):e is Construction=>e.kind==="construction")!;
 for(const npc of [a,b]){npc.energy=100;npc.health=100;npc.satiety=100;npc.inventory={wood:6};}
 return {w,a,b,depot};
}
test("claims subtract source stock by item and destination capacity across items, never move inventory",()=>{
 const {w,a,b,depot}=fixture();depot.stock={wood:7};w.tick=3;
 a.ai={activity:null,reason:"",route:[],lastDecisionTick:3,history:[],haulingClaim:{targetId:depot.id,action:"storage.withdraw",itemId:"wood",quantity:5,lastProgressTick:3}};
 assert.equal(haulingAvailable(w,b,depot,"storage.withdraw","wood"),2);
 assert.equal(haulingAvailable(w,a,depot,"storage.withdraw","wood"),7);
 a.ai.haulingClaim!.action="storage.deposit";
 assert.equal(haulingAvailable(w,b,depot,"storage.deposit","stone"),storageFree(depot)-5);
 assert.equal(depot.stock.wood,7);
 validateWorld(JSON.parse(JSON.stringify(w)));
 a.satiety=5;assert.equal(activeHaulingClaim(w,a),undefined);
 a.satiety=100;w.tick=27;assert.equal(activeHaulingClaim(w,a),undefined);
 a.ai.haulingClaim!.quantity=13;assert.throws(()=>validateWorld(w),/INVALID_WORLD/);
});
test("travelling NPCs reserve only remaining shared storage capacity",()=>{
 const {w,a,b,depot}=fixture();depot.stock={wood:storageFree(depot)-6};
 w.tick=3;advanceNpcDecisions(w,c=>applyCommand(w,c,{internal:true}));
 assert.equal(a.ai?.haulingClaim?.quantity,6);
 assert.equal(b.ai?.haulingClaim,undefined);
 assert.equal(a.inventory?.wood,6);
 assert.equal(b.inventory?.wood,6);
 assert.equal(storageFree(depot),6);
});

test("paired withdrawal reserves construction demand before stock moves and survives snapshot reload",()=>{
 const {w,a,b,depot}=fixture();w.tick=3;depot.stock={wood:8};
 assert.ok(applyCommand(w,{worldId:w.id,commandId:"site",actorRole:"admin",action:"construction.place",position:{x:18,y:8},parameters:{blueprintId:"building.community_house",mode:"site"}}).ok);
 const site=w.entities.find((e):e is Construction=>e.kind==="construction"&&e.id!==depot.id)!;
 const demand=haulingAvailable(w,b,site,"construction.deliver","wood");assert.ok(demand>0);
 a.ai={activity:null,reason:"",route:[],lastDecisionTick:w.tick,history:[],haulingClaim:{targetId:depot.id,action:"storage.withdraw",itemId:"wood",quantity:1,lastProgressTick:w.tick,constructionDestinationId:site.id}};
 assert.equal(haulingAvailable(w,b,site,"construction.deliver","wood"),demand-1);
 assert.equal(haulingAvailable(w,b,depot,"storage.withdraw","wood"),7);
 validateWorld(JSON.parse(JSON.stringify(w)));
 a.ai.haulingClaim!.constructionDestinationId=depot.id;assert.throws(()=>validateWorld(w),/INVALID_WORLD/);
});
test("construction hauling changes from withdrawal to reserved delivery only after physical withdrawal",()=>{
 const {w,a,b,depot}=fixture();b.health=0;a.inventory={};a.position={x:11,y:5};depot.stock={wood:8};
 assert.ok(applyCommand(w,{worldId:w.id,commandId:"site",actorRole:"admin",action:"construction.place",position:{x:18,y:8},parameters:{blueprintId:"building.community_house",mode:"site"}}).ok);
 const site=w.entities.find((e):e is Construction=>e.kind==="construction"&&e.id!==depot.id)!;
 const quantity=Math.min(2,haulingAvailable(w,a,site,"construction.deliver","wood"));assert.ok(quantity>0);
 w.tick=3;a.ai={activity:null,reason:"",route:[],lastDecisionTick:w.tick,history:[],haulingClaim:{targetId:depot.id,action:"storage.withdraw",itemId:"wood",quantity,lastProgressTick:w.tick,constructionDestinationId:site.id}};
 advanceNpcDecisions(w,c=>applyCommand(w,c,{internal:true}));
 assert.equal(a.ai?.haulingClaim?.action,"construction.deliver");
 assert.equal(a.ai?.haulingClaim?.targetId,site.id);
 assert.equal(a.inventory?.wood,quantity);assert.equal(depot.stock?.wood,8-quantity);
 assert.equal(site.delivered.wood??0,0);
 validateWorld(JSON.parse(JSON.stringify(w)));
});
