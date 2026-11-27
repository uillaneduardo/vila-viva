import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolveFacing} from '../packages/renderer/src/character-visual-state.js';
import {resolveWorldSprite} from '../packages/renderer/src/sprites.js';
import {getWorldVisualPack} from '../packages/renderer/src/visual-packs.js';
test('direction follows visual motion, not a newer authoritative segment',()=>{
 assert.equal(resolveFacing(1,0),'east');assert.equal(resolveFacing(-1,0),'west');
 assert.equal(resolveFacing(0,-1),'north');assert.equal(resolveFacing(0,1),'south');
 assert.equal(resolveFacing(0,0,'west'),'west');
 assert.equal(resolveWorldSprite({kind:'character',movementSegment:{from:{x:0,y:0},to:{x:1,y:0}}},{direction:'west',movingVisually:true}).direction,'west');
});
test('rustic directional frames share one body and retain all eight animation cells',async()=>{
 for(const dir of ['north','south','east','west']){
  const d=getWorldVisualPack('rustic')['entities/human/'+dir];
  const svg=await readFile(new URL('../public'+d.src,import.meta.url),'utf8');
  assert.equal(new Set([...svg.matchAll(/data:image\/png;base64,([^"]+)/g)].map(m=>m[1])).size,1);
  assert.equal(d.frameCount,8);assert.match(svg,/width="768"/);
 }
 const base=await readFile(new URL('../public/assets/world/rustic/human.svg',import.meta.url),'utf8');
 assert.equal(new Set([...base.matchAll(/data:image\/png;base64,([^"]+)/g)].map(m=>m[1])).size,1);
});
