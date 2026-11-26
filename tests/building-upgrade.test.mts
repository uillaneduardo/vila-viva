import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,applyCommand} from '../packages/engine/src/engine.ts';
import {storageDefinition,buildingLevel,buildingCapabilities} from '../packages/systems/construction/src/index.ts';
import {validateWorld} from '../packages/protocol/src/world-snapshot.ts';
test('depot upgrade retains identity and inventory, applies capacity only after completion, validates snapshots',()=>{
 const w=createWorld('upgrade');
 const god=(id,action,extra={})=>applyCommand(w,{worldId:w.id,commandId:id,actorRole:'admin',action,...extra});
 assert.ok(god('d','construction.place',{position:{x:5,y:5},parameters:{blueprintId:'building.depot',mode:'completed'}}).ok);
 const d=w.entities.find(e=>e.id==='construction-d');
 assert.equal(buildingLevel(d),1);assert.equal(storageDefinition(d).capacity,120);
 assert.ok(god('stock','storage.admin_supply',{targetId:d.id,parameters:{materialId:'wood',quantity:100}}).ok);
 assert.ok(god('start','construction.upgrade',{targetId:d.id}).ok);
 assert.equal(storageDefinition(d).capacity,120);validateWorld(w);
 assert.equal(god('early','construction.admin_work',{targetId:d.id,parameters:{workUnits:1}}).error,'NOT_READY');
 for(const [materialId,quantity] of [['wood',30],['stone',20]])assert.ok(god('mat-'+materialId,'construction.admin_supply',{targetId:d.id,parameters:{materialId,quantity}}).ok);
 assert.ok(god('part','construction.admin_work',{targetId:d.id,parameters:{workUnits:39}}).ok);
 assert.equal(storageDefinition(d).capacity,120);validateWorld(w);
 assert.ok(god('finish','construction.admin_work',{targetId:d.id,parameters:{workUnits:1}}).ok);
 assert.equal(buildingLevel(d),2);assert.equal(storageDefinition(d).capacity,300);assert.equal(buildingCapabilities(d)['storage.capacity'],300);assert.equal(d.stock.wood,100);assert.equal(d.upgrade,undefined);validateWorld(w);
 assert.ok(god('next','construction.upgrade',{targetId:d.id}).ok);
 assert.ok(god('material','construction.admin_supply',{targetId:d.id,parameters:{materialId:'wood',quantity:5}}).ok);
 assert.ok(god('cancel','construction.upgrade_cancel',{targetId:d.id}).ok);
 assert.equal(d.level,2);assert.equal(d.stock.wood,100);assert.equal(w.entities.find(e=>e.kind==='item'&&e.itemId==='wood').quantity,5);validateWorld(w);
});

import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {FileWorldStore} from '../apps/server/src/world-store.mts';
test('physical NPC delivery and work survive save/reload and complete upgrade',()=>{
 let w=createWorld('physical-upgrade');
 const god=(id,action,extra={})=>applyCommand(w,{worldId:w.id,commandId:id,actorRole:'admin',action,...extra});
 assert.ok(god('d','construction.place',{position:{x:5,y:5},parameters:{blueprintId:'building.depot',mode:'completed'}}).ok);
 assert.ok(god('worker','npc.spawn',{position:{x:4,y:5},parameters:{name:'Worker'}}).ok);
 assert.ok(god('start','construction.upgrade',{targetId:'construction-d'}).ok);
 const command=(id,action,parameters={})=>applyCommand(w,{worldId:w.id,commandId:id,actorRole:'npc',actorId:'npc-worker',targetId:'construction-d',action,parameters});
 let npc=w.entities.find(e=>e.id==='npc-worker');
 for(const [item,total] of [['wood',30],['stone',20]])for(let left=total;left>0;){const n=Math.min(12,left);npc.inventory={[item]:n};npc.energy=100;assert.ok(command(item+left,'construction.deliver',{materialId:item,quantity:n}).ok);assert.equal(npc.inventory[item],0);left-=n;}
 const dir=mkdtempSync(join(tmpdir(),'oturo-upgrade-'));
 try{new FileWorldStore(dir).switchWorld(w);w=new FileWorldStore(dir).loadActive().world;}
 finally{rmSync(dir,{recursive:true,force:true});}
 npc=w.entities.find(e=>e.id==='npc-worker');const d=w.entities.find(e=>e.id==='construction-d');
 for(let i=0;i<40&&d.upgrade;i++){npc.energy=100;npc.health=100;assert.ok(command('work'+i,'construction.work').ok);}
 assert.equal(d.level,2);assert.equal(storageDefinition(d).capacity,300);assert.deepEqual(d.delivered,{});validateWorld(w);
});
