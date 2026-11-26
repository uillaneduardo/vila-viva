import test from "node:test";
import assert from "node:assert/strict";
import {createWorld,applyCommand} from "../packages/engine/src/engine.ts";
import {createCompletedBuilding,startUpgrade,currentStage,acceptMaterial,applyConstructionWork,storageDefinition} from "../packages/systems/construction/src/index.ts";
import {buildingBlueprint} from "../packages/content/src/buildings/registry.ts";
import {workerCapacity,canUseWorkSlot,recordWorkSlot} from "../packages/systems/construction/src/work-cycle.ts";
import {validateWorld} from "../packages/protocol/src/world-snapshot.ts";
test("productive upgrades preserve inventory, orders and mineral reserves and increase real work slots",()=>{
 const w=createWorld("productive-levels");
 for(const [id,stocks,workers] of [["building.workshop",[120,240,480],[1,2,3]],["building.cafeteria",[60,120,240],[1,2,3]],["building.mine",[20,60,150],[1,2,4]]]){
 const b=createCompletedBuilding("facility"+w.entities.length,{x:5+w.entities.length*4,y:5},buildingBlueprint(id),0);w.entities.push(b);
 const before=structuredClone({stock:b.stock,orders:b.productionOrders,mineral:b.mineRemaining});
 for(let level=1;level<=3;level++){
 assert.equal(storageDefinition(b).capacity,stocks[level-1]);assert.equal(workerCapacity(b),workers[level-1]);
 const tick=++w.tick;
 for(let i=0;i<workers[level-1];i++){assert.ok(canUseWorkSlot(b,"npc-"+i,tick));recordWorkSlot(b,"npc-"+i,tick);assert.equal(canUseWorkSlot(b,"npc-"+i,tick),false);}
 assert.equal(canUseWorkSlot(b,"extra",tick),false);assert.ok(canUseWorkSlot(b,"extra",tick+1));validateWorld(w);
 if(level<3){assert.ok(startUpgrade(b,tick));const s=currentStage(b);for(const [k,v] of Object.entries(s.materials))assert.ok(acceptMaterial(b,k,v));assert.equal(workerCapacity(b),workers[level-1]);assert.ok(applyConstructionWork(b,s.workUnits,tick).upgraded);}
 }
 assert.deepEqual({stock:b.stock,orders:b.productionOrders,mineral:b.mineRemaining},before);
 }
});
test("mine extraction shares bounded slots, rejects repeat actor and conserves ore",()=>{
 const w=createWorld("mine-slots");
 const b=createCompletedBuilding("mine",{x:5,y:5},buildingBlueprint("building.mine"),0);b.level=2;w.entities.push(b);
 for(const [i,x,y] of [[1,4,5],[2,4,6],[3,4,7]])assert.ok(applyCommand(w,{worldId:w.id,commandId:"n"+i,actorRole:"admin",action:"npc.spawn",position:{x,y},parameters:{}}).ok);
 const run=(i,id)=>applyCommand(w,{worldId:w.id,commandId:id,actorRole:"npc",actorId:"npc-n"+i,targetId:b.id,action:"mine.extract",parameters:{materialId:"iron_ore"}},{internal:true});
 assert.ok(run(1,"one").ok);assert.equal(run(1,"repeat").error,"NOT_READY");assert.ok(run(2,"two").ok);assert.equal(run(3,"three").error,"NOT_READY");assert.equal(b.mineRemaining.iron_ore+b.stock.iron_ore,80);validateWorld(w);
});
