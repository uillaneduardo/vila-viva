import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {resolveWorldSprite,WORLD_ATLASES} from '../packages/renderer/src/sprites.js';
import {makePrototype} from '../apps/server/src/index.mts';

test('food source sprite variants depend only on actual quantities',()=>{
 const source={kind:'resource',resourceType:'food',quantity:30,maximum:30};
 assert.equal(resolveWorldSprite(source).state,'fruit_ripe');
 assert.equal(resolveWorldSprite({...source,quantity:6}).state,'fruit_sparse');
 assert.equal(resolveWorldSprite({...source,quantity:0}).state,'foliage');
 assert.equal(resolveWorldSprite({...source,visualState:'leafless'}).state,'leafless');
 assert.equal(resolveWorldSprite({...source,resourceType:'wood'}).id,'resources/tree');
 assert.equal(resolveWorldSprite({kind:'character'}).id,'entities/human');
});
test('tree atlas metadata and packed PNG size match',async()=>{
 const atlas=WORLD_ATLASES['vegetation/apple_tree'];
 assert.deepEqual(atlas.states,['leafless','foliage','fruit_sparse','fruit_ripe']);
 const bytes=await readFile(new URL('../public'+atlas.src,import.meta.url));
 assert.equal(bytes.subarray(1,4).toString(),'PNG');
 assert.equal(bytes.readUInt32BE(16),atlas.frameWidth*atlas.frameCount);
 assert.equal(bytes.readUInt32BE(20),atlas.frameHeight);
});
test('world sprite route serves valid atlas and blocks arbitrary binary',async()=>{
 const {server}=makePrototype();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const valid=await fetch(base+'/assets/world/vegetation/apple_tree_atlas_96.png');
  assert.equal(valid.status,200);
  assert.match(valid.headers.get('content-type'),/image\/png/);
  const manifest=await fetch(base+'/assets/world/vegetation/apple_tree.json');
  assert.equal(manifest.status,200);
  assert.equal((await manifest.json()).frameWidth,96);
  const wrong=await fetch(base+'/packages/renderer/src/sprites.png');
  assert.equal(wrong.status,404);
  const before=(await (await fetch(base+'/api/world')).json()).world;
  assert.equal(before.entities.length,2); // autonomous NPC and resource, no avatar
  assert.ok(before.entities.every(e=>!e.ownerId));
  const placed=await fetch(base+'/api/brush',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({role:'admin',commands:[{commandId:'sprite-tree-test',action:'resource.spawn',position:{x:8,y:8},parameters:{resourceType:'food',quantity:8}}]})});
  assert.equal(placed.status,200);
  const world=(await (await fetch(base+'/api/world')).json()).world;
  assert.equal(world.entities.find(e=>e.id==='resource-sprite-tree-test').resourceType,'food');
 }finally{await new Promise(resolve=>server.close(resolve));}
});
