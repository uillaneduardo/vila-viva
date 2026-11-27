import test from 'node:test';
import assert from 'node:assert/strict';
import {TerrainCache} from '../packages/renderer/src/terrain-cache.js';
import {planVisibleEntities} from '../packages/renderer/src/visual-order.js';
import {createLayeredRenderAdapter} from '../packages/renderer/src/layered-render-adapter.js';
const fakeCanvas=(width,height)=>({width,height,getContext:()=>({fillRect(){}})});
test('terrain chunks cache, clip world edges and evict least recently used',()=>{
 const t=new TerrainCache({chunk:8,capacity:2,createCanvas:fakeCanvas});
 const a=t.get(0,0,17,9,42,true);assert.equal(t.get(0,0,17,9,42,true),a);
 const b=t.get(2,1,17,9,42,true);assert.equal(b.canvas.width,42);assert.equal(b.canvas.height,42);
 t.get(1,0,17,9,42,true);assert.equal(t.cache.size,2);assert.equal(t.hits,1);
 assert.notEqual(t.get(0,0,17,9,42,true),a);
 t.clear();assert.equal(t.cache.size,0);
});
test('draw ordering follows visual position and retains large footprints',()=>{
 const entities=[{id:'a',kind:'character',position:{x:2,y:8}},{id:'b',kind:'character',position:{x:2,y:1}},{id:'large',kind:'construction',position:{x:-5,y:0},footprint:{width:6,height:2}},{id:'off',kind:'character',position:{x:100,y:100}}];
 const rows=planVisibleEntities(entities,e=>e.id==='a'?{x:2,y:0}:e.position,{x0:0,y0:0,x1:10,y1:10});
 assert.deepEqual(rows.map(r=>r.entity.id),['a','b','large']);assert.equal(entities[0].position.y,8);
});
test('adapter composes tick playback, terrain and draw plan with disposal',()=>{
 const terrain=new TerrainCache({createCanvas:fakeCanvas});
 let disposed=false,now=0;const surface={setWorld(world){this.world=world;},dispose(){disposed=true;}};
 const a=createLayeredRenderAdapter(surface,{now:()=>now,terrain});
 const world=x=>({entities:[{id:'a',kind:'character',health:100,position:{x,y:0}}]});
 a.setWorld(world(0),{speed:1});now=250;a.setWorld(world(1),{speed:1});
 assert.equal(a.positionProvider(a.world.entities[0],375).x,.5);
 assert.equal(a.entityPlanner,planVisibleEntities);assert.equal(typeof a.terrainPainter,'function');
 a.dispose();assert.equal(disposed,true);
});
test('cache paint uses camera transform and returns false if canvas context unavailable',()=>{
 const ctx={drawImage(...args){this.args=args;}},camera={tile:42,zoom:1,worldToScreen:(x,y)=>({x,y})};
 const bounds={x0:0,y0:0,x1:8,y1:8},world={width:8,height:8};
 assert.equal(new TerrainCache({createCanvas:fakeCanvas}).paint(ctx,camera,world,bounds),true);
 assert.deepEqual(ctx.args.slice(1),[0,0,336,336]);
 assert.equal(new TerrainCache({createCanvas:()=>null}).paint(ctx,camera,world,bounds),false);
});

test('rustic terrain texture is separately cached and overlay remains legible',()=>{
 const t=new TerrainCache({createCanvas:fakeCanvas});
 const w={width:16,height:16,seed:'terrain',soilVersion:1};
 const plain=t.get(0,0,16,16,42,true,w,false,false);
 const textured=t.get(0,0,16,16,42,true,w,false,true);
 assert.notEqual(plain,textured);
 assert.equal(t.get(0,0,16,16,42,true,w,false,true),textured);
 assert.notEqual(t.get(0,0,16,16,42,true,w,true,true),textured);
});
