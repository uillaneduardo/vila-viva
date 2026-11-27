import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {directionFromDelta,resolveWorldSprite,SpriteLibrary} from '../packages/renderer/src/sprites.js';
import {getWorldVisualPack} from '../packages/renderer/src/visual-packs.js';
test('direction follows visual motion, not a newer authoritative segment',()=>{
 assert.equal(directionFromDelta(1,0),'east');assert.equal(directionFromDelta(-1,0),'west');
 assert.equal(directionFromDelta(0,-1),'north');assert.equal(directionFromDelta(0,1),'south');
 assert.equal(directionFromDelta(0,0),null);
 assert.equal(resolveWorldSprite({kind:'character',movementSegment:{from:{x:0,y:0},to:{x:1,y:0}}},{direction:'west',movingVisually:true}).direction,'west');
});
test('rustic character frames keep the same embedded body for each direction and state',async()=>{
 for(const dir of ['','_north','_south','_east','_west']){
  const svg=await readFile(new URL('../public/assets/world/rustic/human'+dir+'.svg',import.meta.url),'utf8');
  const bodies=[...svg.matchAll(/data:image\/png;base64,([^"]+)/g)].map(m=>m[1]);
  assert.equal(bodies.length,4);assert.equal(new Set(bodies).size,1);
 }
});
test('rectangular construction art can fit without anisotropic distortion',()=>{
 const lib=new SpriteLibrary({pack:getWorldVisualPack()});
 const id='buildings/workshop',definition=lib.pack[id];lib.atlases.set(id,{ready:true,definition,image:{}});
 let args;const ctx={save(){},restore(){},drawImage(...a){args=a;}};
 assert.equal(lib.draw(ctx,id,100,100,90,'completed',{height:60,fit:'contain'}),true);
 assert.deepEqual(args.slice(-4),[70,70,60,60]);
});
