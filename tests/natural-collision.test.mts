import assert from 'node:assert/strict';
import test from 'node:test';
import {createWorld,applyCommand,advanceTick} from '../packages/engine/src/engine.ts';
import {NATURAL_SOURCES} from '../packages/content/src/natural-sources.ts';
import {SCENERY_PRESETS} from '../packages/content/src/scenery.ts';
import {canEnter} from '../packages/systems/collision/src/index.ts';
import {resolveWorldSprite} from '../packages/renderer/src/sprites.js';
import {makePrototype} from '../apps/server/src/index.mts';
const cmd=(world,commandId,action,extra={})=>({
 worldId:world.id,commandId,action,actorRole:'admin',...extra
});
const placeApple=(w,id,position={x:2,y:2},ageTicks=0,quantity=0)=>
 applyCommand(w,cmd(w,id,'resource.spawn',{position,parameters:{resourceType:'food',sourceId:'apple_tree',ageTicks,quantity}}));
test('one defined living food species; no bush implementation yet',()=>{
 assert.deepEqual(Object.keys(NATURAL_SOURCES),['apple_tree']);
 assert.equal(NATURAL_SOURCES.apple_tree.productId,'apple');
 assert.deepEqual(Object.keys(SCENERY_PRESETS),['boulder','wall','statue']);
 const w=createWorld('w');
 assert.equal(placeApple(w,'tree').ok,true);
 const tree=w.entities.find(e=>e.id==='resource-tree');
 assert.equal(tree.sourceId,'apple_tree');
 assert.equal(tree.life.stage,'seedling');
 assert.equal(tree.quantity,0);
 assert.equal(tree.maximum,30);
 const bad=applyCommand(w,cmd(w,'bad','resource.spawn',{position:{x:3,y:2},parameters:{resourceType:'food',sourceId:'nonexistent',ageTicks:120,quantity:4}}));
 assert.equal(bad.ok,false);
});
test('life progresses by logical clock; produces fruit, replenishes, ages and dies',()=>{
 const w=createWorld('world');
 placeApple(w,'tree');
 const tree=w.entities.find(e=>e.kind==='resource');
 for(let i=0;i<40;i++)advanceTick(w);
 assert.equal(tree.life.stage,'young');
 for(let i=40;i<120;i++)advanceTick(w);
 assert.equal(tree.life.stage,'mature');
 assert.equal(tree.quantity,0);
 for(let i=0;i<40;i++)advanceTick(w);
 assert.equal(tree.quantity,3);
 assert.equal(resolveWorldSprite(tree).state,'fruit_sparse');
 for(let i=0;i<400;i++)advanceTick(w);
 assert.equal(tree.quantity,30);
 assert.equal(resolveWorldSprite(tree).state,'fruit_ripe');
 for(let i=560;i<3000;i++)advanceTick(w);
 assert.equal(tree.life.stage,'dead');
 assert.equal(tree.life.health,0);
 assert.equal(tree.quantity,0);
 assert.equal(resolveWorldSprite(tree).state,'leafless');
 assert.equal(w.entities.length,1); // dead trunk persists; never vanishes on depletion
 assert.equal(canEnter(w,tree.position),false);
});
test('physical collection requires adjacency and transfers fruit to actor inventory, not depot',()=>{
 const w=createWorld('w');
 placeApple(w,'tree',{x:3,y:3},120,8);
 applyCommand(w,cmd(w,'npc','npc.spawn',{position:{x:3,y:2},parameters:{name:'Ayla'}}));
 const tree=w.entities.find(e=>e.id==='resource-tree');
 const npc=w.entities.find(e=>e.id==='npc-npc');
 const harvest=(commandId)=>applyCommand(w,{worldId:w.id,commandId,actorRole:'npc',actorId:npc.id,
  action:'resource.harvest',targetId:tree.id});
 assert.equal(harvest('h1').ok,true);
 assert.equal(tree.quantity,5);
 assert.equal(npc.inventory.apple,3);
 assert.equal(npc.energy,99);
 assert.equal(harvest('h2').ok,true);
 assert.equal(tree.quantity,2);
 assert.equal(npc.inventory.apple,6);
 assert.equal(harvest('h3').ok,true);
 assert.equal(tree.quantity,0);
 assert.equal(npc.inventory.apple,8);
 assert.deepEqual(harvest('h4').error,'EXHAUSTED');
 assert.equal(harvest('h1').error,'DUPLICATE_COMMAND');
 assert.equal(tree.maximum,30);
 for(let i=0;i<40;i++)advanceTick(w);
 assert.equal(tree.quantity,3); // same tree regenerates
 assert.equal(npc.inventory.apple,8); // never credited to a global stock
});
test('disconnected, tired, impersonated and nonadjacent actors cannot harvest',()=>{
 const w=createWorld('w');
 placeApple(w,'tree',{x:4,y:4},120,10);
 applyCommand(w,cmd(w,'npc','npc.spawn',{position:{x:1,y:1},parameters:{name:'Ayla'}}));
 const action={worldId:w.id,action:'resource.harvest',targetId:'resource-tree',actorRole:'npc',actorId:'npc-npc'};
 assert.equal(applyCommand(w,{...action,commandId:'far'}).error,'BLOCKED');
 assert.equal(applyCommand(w,{...action,commandId:'fake',actorId:'someone-else'}).error,'UNAUTHORIZED');
 applyCommand(w,{worldId:w.id,commandId:'move',actorRole:'npc',actorId:'npc-npc',action:'movement.move',targetId:'npc-npc',position:{x:2,y:1}});
 assert.equal(w.entities.find(e=>e.id==='resource-tree').quantity,10);
});
test('nonharvestable boulder, wall and statue block NPC/player movement and placement',()=>{
 for(const obstacleType of Object.keys(SCENERY_PRESETS)){
  const w=createWorld('collision');
  applyCommand(w,cmd(w,'npc','npc.spawn',{position:{x:1,y:1},parameters:{name:'Ayla'}}));
  const created=applyCommand(w,cmd(w,'o','obstacle.spawn',{position:{x:2,y:1},parameters:{obstacleType}}));
  assert.equal(created.ok,true);
  const npc=w.entities.find(e=>e.id==='npc-npc');
  assert.equal(canEnter(w,{x:2,y:1}),false);
  const move=applyCommand(w,{worldId:w.id,commandId:'move',actorRole:'npc',actorId:npc.id,action:'movement.move',targetId:npc.id,position:{x:2,y:1}});
  assert.equal(move.error,'BLOCKED');
  assert.deepEqual(npc.position,{x:1,y:1});
  const overlap=placeApple(w,'tree',{x:2,y:1},120,6);
  assert.equal(overlap.error,'BLOCKED');
  const harvest=applyCommand(w,{worldId:w.id,commandId:'harvest',actorRole:'npc',actorId:npc.id,action:'resource.harvest',targetId:'obstacle-o'});
  assert.equal(harvest.error,'INVALID_TARGET');
  assert.equal(w.entities.find(e=>e.id==='obstacle-o').blocksMovement,true);
 }
});
test('browser API exposes natural life, inventory, scenery and brush validation',async()=>{
 const {server}=makePrototype();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const post=(path,body)=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 try{
  const catalog=await (await fetch(base+'/api/catalog')).json();
  assert.equal(catalog.naturalSources.apple_tree.label,'Macieira');
  assert.equal(catalog.scenery.boulder,'Pedra decorativa');
  const result=await (await post('/api/brush',{role:'admin',commands:[
   {commandId:'scene-test',action:'obstacle.spawn',position:{x:8,y:9},parameters:{obstacleType:'statue'}},
   {commandId:'tree-test',action:'resource.spawn',position:{x:11,y:9},parameters:{resourceType:'food',sourceId:'apple_tree',ageTicks:120,quantity:6}}
  ]})).json();
  assert.deepEqual(result.results.map(x=>x.ok),[true,true]);
  const inspect=await (await fetch(base+'/api/inspect?entityId=resource-tree-test')).json();
  assert.equal(inspect.natural.life.stage,'mature');
  assert.equal(inspect.natural.productId,'apple');
  const obstacle=await (await fetch(base+'/api/inspect?entityId=obstacle-scene-test')).json();
  assert.equal(obstacle.scenery.blocksMovement,true);
  assert.equal(obstacle.scenery.harvestable,false);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
