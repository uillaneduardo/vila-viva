import test from 'node:test';
import assert from 'node:assert/strict';
import {MotionPlayback} from '../packages/renderer/src/motion-playback.js';
import {createMotionRenderAdapter} from '../packages/renderer/src/motion-render-adapter.js';
import {validateWorld} from '../packages/protocol/src/world-snapshot.ts';
const npc={id:'npc',kind:'character',name:'NPC',health:100,energy:100,position:{x:1,y:0},nextMoveTick:14,movementSegment:{from:{x:0,y:0},to:{x:1,y:0},startTick:10,endTick:14}};
const world=(tick=10)=>({id:'world',width:8,height:8,tick,appliedCommands:[],entities:[structuredClone(npc)]});
test('accepted movement uses charged duration at each speed and never predicts next cell',()=>{
 for(const speed of [1,2,4]){
  const p=new MotionPlayback(),w=world();
  p.push(w,{epoch:1,speed,receivedAt:0});
  assert.equal(p.position(w.entities[0],125/speed).x,.125);
  assert.equal(p.position(w.entities[0],10000).x,.25);
  p.push(world(12),{epoch:1,speed,receivedAt:500/speed});
  assert.equal(p.position(w.entities[0],500/speed).x,.5);
  assert.equal(w.entities[0].position.x,1);
 }
});
test('same tick revisions do not restart phase; pause, death and invalid destination snap',()=>{
 const p=new MotionPlayback(),w=world();
 p.push(w,{receivedAt:0});p.push(w,{receivedAt:100});
 assert.equal(p.position(w.entities[0],125).x,.125);
 assert.equal(p.position({...w.entities[0],health:0},125).x,1);
 assert.equal(p.position({...w.entities[0],position:{x:5,y:0}},125).x,5);
 p.push(w,{receivedAt:150,paused:true,speed:0});assert.equal(p.position(w.entities[0],150).x,1);
});
test('old saves accepted, malformed segment rejected',()=>{
 const w=world();validateWorld(w);
 delete w.entities[0].movementSegment;validateWorld(w);
 w.entities[0].movementSegment={...npc.movementSegment,endTick:9};assert.throws(()=>validateWorld(w));
});
test('motion adapter preserves authoritative world and provides fractional drawing position',()=>{
 let now=0;const surface={setWorld(w){this.world=w;}};
 const adapter=createMotionRenderAdapter(surface,{now:()=>now});
 adapter.setWorld(world(),{speed:1});now=125;
 assert.equal(adapter.positionProvider(surface.world.entities[0],now).x,.125);
 assert.equal(surface.world.entities[0].position.x,1);
});
