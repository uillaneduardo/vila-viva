import assert from 'node:assert/strict';
import test from 'node:test';
import {createWorld,applyCommand,advanceTick} from '../packages/engine/src/engine.ts';
import {routeToEntity} from '../packages/systems/pathfinding/src/index.ts';
import {buildingCapabilities,storageFree,storageDefinition,storedTotal} from '../packages/systems/construction/src/index.ts';
import {buildingBlueprint} from '../packages/content/src/buildings/registry.ts';
import {resolveWorldSprite} from '../packages/renderer/src/sprites.js';
import {makePrototype} from '../apps/server/src/index.mts';
import {readFile} from 'node:fs/promises';
const god=(w,id,action,extra={})=>applyCommand(w,{
 worldId:w.id,actorRole:'admin',commandId:id,action,...extra
});
const depot=(w,id='depot',pos={x:6,y:3},mode='completed')=>
 god(w,id,'construction.place',{position:pos,parameters:{blueprintId:'building.depot',mode}});
const npc=(w,id='person',pos={x:1,y:1})=>
 god(w,id,'npc.spawn',{position:pos,parameters:{name:id}});
const cmd=(w,actor,id,action,targetId,parameters)=>applyCommand(w,{
 worldId:w.id,commandId:id,actorRole:'npc',actorId:actor.id,action,targetId,parameters
});
test('God Mode creates a depot either as a phase-1 site or completed warehouse',()=>{
 const w=createWorld('w',12,12);
 assert.equal(depot(w,'p',{x:1,y:1},'site').ok,true);
 assert.equal(depot(w,'done',{x:6,y:3},'completed').ok,true);
 const site=w.entities.find(e=>e.id==='construction-p');
 const done=w.entities.find(e=>e.id==='construction-done');
 assert.equal(site.stageIndex,0);assert.equal(site.status,'site');
 assert.equal(storageDefinition(site),undefined);
 assert.equal(done.status,'completed');assert.equal(done.stageIndex,3);
 assert.equal(done.stock?.wood,undefined);
 assert.equal(storageFree(done),120);assert.equal(storedTotal(done),0);
 assert.equal(buildingCapabilities(done)['storage.capacity'],120);
 assert.equal(buildingCapabilities(site)['storage.capacity'],undefined);
 assert.equal(resolveWorldSprite(site).id,'buildings/depot');
 assert.equal(resolveWorldSprite(site).state,'site');
 assert.equal(resolveWorldSprite(done).state,'completed');
 assert.equal(god(w,'badmode','construction.place',{position:{x:10,y:1},
  parameters:{blueprintId:'building.depot',mode:'invalid'}}).error,'INVALID_PAYLOAD');
});
test('warehouse stock changes only on physical deposit/withdraw, respects capacity and material type',()=>{
 const w=createWorld('w',12,12);depot(w);npc(w,'worker',{x:5,y:3});
 const warehouse=w.entities.find(e=>e.kind==='construction'),worker=w.entities.find(e=>e.kind==='character');
 worker.inventory={wood:7,stone:2};
 assert.equal(cmd(w,worker,'deposit','storage.deposit',warehouse.id,{materialId:'wood',quantity:7}).ok,true);
 assert.equal(warehouse.stock.wood,7);assert.equal(worker.inventory.wood,0);
 assert.equal(cmd(w,worker,'missing','storage.withdraw',warehouse.id,{materialId:'wood',quantity:8}).error,'EXHAUSTED');
 assert.equal(cmd(w,worker,'withdraw','storage.withdraw',warehouse.id,{materialId:'wood',quantity:4}).ok,true);
 assert.equal(worker.inventory.wood,4);assert.equal(warehouse.stock.wood,3);
 assert.equal(god(w,'fill','storage.admin_supply',{targetId:warehouse.id,
  parameters:{materialId:'apple',quantity:117}}).ok,true);
 assert.equal(storageFree(warehouse),0);
 assert.equal(cmd(w,worker,'over','storage.deposit',warehouse.id,{materialId:'stone',quantity:1}).error,'INVENTORY_FULL');
 assert.equal(god(w,'tooMuch','storage.admin_supply',{targetId:warehouse.id,
  parameters:{materialId:'wood',quantity:1}}).error,'INVENTORY_FULL');
 assert.equal(god(w,'unknown','storage.admin_supply',{targetId:warehouse.id,
  parameters:{materialId:'infiniteMoney',quantity:1}}).error,'INVALID_PAYLOAD');
 assert.equal(warehouse.stock.apple,117);
});
test('planned depot can be constructed by stages without unlocking storage prematurely',()=>{
 const w=createWorld('w');depot(w,'planned',{x:2,y:2},'site');
 const site=w.entities[0];
 assert.equal(storageDefinition(site),undefined);
 for(let step=0;step<3;step++){
  const blueprint=buildingBlueprint('building.depot');
  const stage=blueprint.stages[step];
  for(const [materialId,quantity] of Object.entries(stage.materials))
   assert.equal(god(w,'s'+step+materialId,'construction.admin_supply',{targetId:site.id,
    parameters:{materialId,quantity}}).ok,true);
  assert.equal(god(w,'w'+step,'construction.admin_work',{targetId:site.id,
   parameters:{workUnits:stage.workUnits}}).ok,true);
 }
 assert.equal(site.status,'completed');
 assert.equal(storageDefinition(site)?.capacity,120);
 assert.equal(storedTotal(site),0);
});
test('navigation respects walls, characters and buildings and returns adjacent route',()=>{
 const w=createWorld('w',10,9);
 npc(w,'walker',{x:1,y:3});
 depot(w,'target',{x:7,y:3});
 for(let x=2;x<=5;x++)god(w,'wall'+x,'obstacle.spawn',{
  position:{x,y:3},parameters:{obstacleType:'wall'}
 });
 const target=w.entities.find(e=>e.id==='construction-target');
 const actor=w.entities.find(e=>e.id==='npc-walker');
 const route=routeToEntity(w,actor.position,target,actor.id);
 assert.ok(route&&route.length>3);
 assert.deepEqual(route[0],actor.position);
 assert.equal(Math.abs(route.at(-1).x-7)+Math.abs(route.at(-1).y-3)<=3,true);
 for(const cell of route)assert.ok(!w.entities.some(e=>e.kind==='obstacle'&&e.position.x===cell.x&&e.position.y===cell.y));
 assert.deepEqual(actor.position,{x:1,y:3});
});
test('NPCs autonomously gather, walk, store and record reasons without advancing time twice',()=>{
 const w=createWorld('w',14,10);
 npc(w,'Ayla',{x:2,y:4});
 god(w,'wood','resource.spawn',{position:{x:4,y:4},parameters:{resourceType:'wood',quantity:30}});
 depot(w,'warehouse',{x:9,y:4});
 const actor=w.entities.find(e=>e.kind==='character'&&!e.ownerId);
 const original=w.entities.find(e=>e.id==='resource-wood').quantity;
 const start=w.tick;
 for(let i=0;i<190;i++)advanceTick(w);
 const warehouse=w.entities.find(e=>e.id==='construction-warehouse');
 assert.equal(w.tick,start+190); // no hidden tick inflation from NPC actions
 assert.ok(warehouse.stock.wood>0);
 assert.ok(w.entities.find(e=>e.id==='resource-wood').quantity<original);
 assert.ok(actor.ai.history.some(e=>e.activity==='Deslocando-se'));
 assert.ok(actor.ai.history.some(e=>e.activity==='Buscando recursos'));
 assert.ok(actor.ai.history.some(e=>e.activity==='Armazenando recursos'));
 assert.ok(actor.energy>0);
 assert.ok(actor.ai.history.length<=8);
});
test('NPC takes real warehouse stock to unfinished house, performs work and consumes inventory',()=>{
 const w=createWorld('w',14,12);
 npc(w,'Ayla',{x:5,y:5});
 depot(w,'store',{x:6,y:5});
 god(w,'house','construction.place',{position:{x:2,y:2},parameters:{blueprintId:'building.community_house'}});
 const warehouse=w.entities.find(e=>e.id==='construction-store');
 god(w,'loadW','storage.admin_supply',{targetId:warehouse.id,parameters:{materialId:'wood',quantity:25}});
 god(w,'loadS','storage.admin_supply',{targetId:warehouse.id,parameters:{materialId:'stone',quantity:25}});
 const site=w.entities.find(e=>e.id==='construction-house');
 const original={...warehouse.stock};
 for(let i=0;i<500;i++)advanceTick(w);
 assert.ok(site.stageIndex>=1 || site.workDone>0,'NPC should fulfill work autonomously');
 assert.ok(warehouse.stock.wood<original.wood||warehouse.stock.stone<original.stone);
 assert.ok(w.entities.find(e=>e.id==='npc-Ayla').ai.history.length>0);
});
test('API presents warehouse blueprints, empty completed stock, NPC activity and routes',async()=>{
 const {server}=makePrototype();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const post=(path,body)=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 try{
  const catalog=await (await fetch(base+'/api/catalog')).json();
  assert.equal(catalog.buildingBlueprints['building.depot'].storage.capacity,120);
  const result=await (await post('/api/brush',{role:'admin',commands:[
   {commandId:'depot-api',action:'construction.place',position:{x:14,y:2},
    parameters:{blueprintId:'building.depot',mode:'completed'}}
  ]})).json();
  assert.equal(result.results[0].ok,true);
  const world=await (await fetch(base+'/api/world')).json();
  assert.equal(world.storageSummary.wood,0);
  const inspection=await (await fetch(base+'/api/inspect?entityId=construction-depot-api')).json();
  assert.equal(inspection.construction.storage.capacity,120);
  assert.deepEqual(inspection.construction.storage.stock,{});
  assert.ok(Array.isArray((await (await fetch(base+'/api/inspect?entityId=npc-npc-init')).json()).decisions));
 }finally{await new Promise(resolve=>server.close(resolve));}
 const hud=await readFile(new URL('../packages/ui/src/hud.js',import.meta.url),'utf8');
 assert.match(hud,/buildMode/);
 const menu=await readFile(new URL('../packages/ui/src/god-menu-definitions.js',import.meta.url),'utf8');
 assert.match(menu,/building\.depot/);
});
