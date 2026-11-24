import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {Camera,hitTest,brushCells} from '../packages/renderer/src/camera.js';
import {SPRITES,SpriteLibrary} from '../packages/renderer/src/sprites.js';
import {makePrototype} from '../apps/server/src/index.mts';

test('zoom anchored at cursor, pan and tile picking work independent of world state',()=>{
 const c=new Camera(42);c.setViewport(1366,768);c.centerOnWorld({width:24,height:16});
 const a=c.screenToWorld(570,320);c.zoomAt(570,320,1.4);
 const b=c.screenToWorld(570,320);
 assert.ok(Math.abs(a.x-b.x)<1e-8);assert.ok(Math.abs(a.y-b.y)<1e-8);
 c.pan(50,20);assert.notDeepEqual(c.screenToWorld(570,320),b);
 const e={id:'npc',kind:'character',position:{x:4,y:5}};
 const p=c.worldToScreen(4.5*42,5.5*42);
 assert.equal(hitTest([e],c,p.x,p.y)?.id,'npc');
 assert.equal(hitTest([e],c,p.x+150,p.y),null);
});
test('brush positions clip to world and shape size is deterministic',()=>{
 const world={width:24,height:16};
 assert.deepEqual(brushCells({x:0,y:0},1,world),[{x:0,y:0}]);
 assert.equal(brushCells({x:12,y:8},4,world).length,16);
 assert.equal(brushCells({x:0,y:0},15,world).length,64);
});
test('sprite definitions exist but missing sprites cleanly fall back to geometry',()=>{
 assert.equal(SPRITES['resource.wood'].id,'resources/tree');
 assert.equal(new SpriteLibrary().draw({},'resources/tree',0,0,20),false);
});
test('approved UI layout renders in both entrypoints, modules stay separated',async()=>{
 for(const path of ['apps/player-web/index.html','apps/admin-web/index.html']){
  const html=await readFile(new URL('../'+path,import.meta.url),'utf8');
  for(const id of ['game','dock','brushPanel','panel','panelNav','collapse','expand','speed0','speed1','speed2','speed4','woodCount','tooltip']){
   assert.match(html,new RegExp('id="'+id+'"'),path+' missing '+id);
  }
  assert.match(html,/packages|shared-ui/);
  assert.match(html,/lang="pt-BR"/);
 }
 const css=await readFile(new URL('../apps/shared-ui/style.css',import.meta.url),'utf8');
 assert.match(css,/clamp\(360px,29vw,480px\)/);
 assert.match(css,/.context-nav\{/);
});
test('local server provides clock, real NPC inspection and validated brush commands',async()=>{
 const {server}=makePrototype();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address(),base='http://127.0.0.1:'+address.port;
 const post=(path,body)=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 try{
  const initial=await (await fetch(base+'/api/world')).json();
  assert.equal(initial.storageSummary,null);
  assert.equal(initial.playerId,null);
  assert.ok(initial.world.entities.every(e=>!e.ownerId));
  assert.equal(initial.npcViews['npc-npc-init'].mood,75);
  const entity=await (await fetch(base+'/api/inspect?entityId=npc-npc-init')).json();
  assert.equal(entity.attributes.values.health,100);
  assert.equal(entity.route,null);
  assert.equal(entity.activity,null);
  assert.equal((await post('/api/clock',{role:'player',speed:4})).status,403);
  assert.equal((await post('/api/clock',{role:'admin',speed:3})).status,422);
  assert.equal((await post('/api/clock',{role:'admin',speed:0})).status,200);
  const stopped=await (await fetch(base+'/api/world')).json();
  assert.equal(stopped.clock.paused,true);
  const batch=await (await post('/api/brush',{role:'admin',commands:[
   {commandId:'paint-test-one',action:'resource.spawn',position:{x:1,y:1},parameters:{resourceType:'food',quantity:8}},
   {commandId:'paint-test-two',action:'resource.spawn',position:{x:1,y:1},parameters:{resourceType:'food',quantity:8}}
  ]})).json();
  assert.deepEqual(batch.results.map(r=>r.ok),[true,false]);
  assert.equal((await (await fetch(base+'/api/world')).json()).world.entities.length,3);
  assert.equal((await post('/api/brush',{role:'player',commands:[]})).status,403);
  assert.equal((await post('/api/clock',{role:'admin',speed:2})).status,200);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
