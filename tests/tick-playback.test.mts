import test from 'node:test';
import assert from 'node:assert/strict';
import {TickPlayback} from '../packages/renderer/src/tick-playback.js';
import {createTickRenderAdapter} from '../packages/renderer/src/tick-render-adapter.js';
import {RevisionBuffer} from '../apps/server/src/revision-buffer.mts';
const npc=(x:number)=>({id:'npc',kind:'character',position:{x,y:0},health:100});
const world=(x:number)=>({entities:[npc(x)]});
test('confirmed positions interpolate at 1x, 2x and 4x without mutating input',()=>{
 for(const speed of [1,2,4]){
  const p=new TickPlayback(),period=250/speed,a=world(0),b=world(1);
  p.push(a,{epoch:1,sampleTime:0,receivedAt:50,speed});
  p.push(b,{epoch:1,sampleTime:period,receivedAt:50+period,speed});
  assert.equal(p.position(b.entities[0],50+period*1.5).x,.5);
  assert.equal(p.position(b.entities[0],5000).x,1);
  assert.equal(b.entities[0].position.x,1);
 }
});
test('pause, epoch and teleport do not animate stale movement',()=>{
 const p=new TickPlayback();
 p.push(world(0),{epoch:1,sampleTime:0,receivedAt:0});
 p.push(world(5),{epoch:1,sampleTime:250,receivedAt:250});
 assert.equal(p.position(npc(5),375).x,5);
 p.push(world(9),{epoch:2,sampleTime:500,receivedAt:500});
 assert.equal(p.position(npc(9),500).x,9);
 p.push(world(10),{epoch:2,sampleTime:750,receivedAt:750,paused:true,speed:0});
 assert.equal(p.position(npc(10),750).x,10);
});
test('adapter accepts injected drawing surface and retains authoritative position',()=>{
 let now=0;
 const surface={world:null,setWorld(w){this.world=w;}};
 const adapter=createTickRenderAdapter(surface,{now:()=>now});
 adapter.setWorld(world(0),{speed:1});now=250;adapter.setWorld(world(1),{speed:1});
 assert.equal(surface.world.entities[0].position.x,1);
 assert.equal(surface.positionProvider(surface.world.entities[0],375).x,.5);
});
test('revision buffer bounded by count and bytes',()=>{
 const b=new RevisionBuffer(2,5);b.push(1,'aa');b.push(2,'bb');b.push(3,'cc');assert.equal(b.count,2);assert.equal(b.bytes,4);b.push(4,'123456');assert.equal(b.count,0);
});
