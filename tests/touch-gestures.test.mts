import test from 'node:test';
import assert from 'node:assert/strict';
import {createTouchGestures} from '../packages/ui/src/touch-gestures.js';
import {Camera} from '../packages/renderer/src/camera.js';

function setup(){
 const camera=new Camera();camera.setViewport(360,640);
 const taps=[],cancels=[];
 const g=createTouchGestures({pan:(x,y)=>camera.pan(x,y),zoom:(x,y,f)=>camera.zoomAt(x,y,f),tap:p=>taps.push(p),cancel:()=>cancels.push(true)});
 return {g,camera,taps,cancels};
}
const p=(x,y)=>({x,y});
test('single tap is committed once on release, not on down',()=>{
 const {g,taps}=setup();g.down(1,p(50,50));assert.equal(taps.length,0);
 g.move(1,p(52,51));g.up(1,p(52,51));assert.deepEqual(taps,[p(52,51)]);
});
test('one finger drag pans without firing the tap action',()=>{
 const {g,camera,taps}=setup();g.down(1,p(50,50));g.move(1,p(54,50));g.move(1,p(70,60));g.up(1,p(70,60));
 assert.deepEqual(camera.center,p(-20,-10));assert.equal(taps.length,0);
});
test('pinch keeps the original midpoint anchored at the new midpoint',()=>{
 const {g,camera,taps}=setup();const before=camera.screenToWorld(150,100);
 g.down(1,p(100,100));g.down(2,p(200,100));g.move(2,p(240,100));
 const after=camera.screenToWorld(170,100);
 assert.ok(Math.abs(camera.zoom-1.4)<1e-9);
 assert.ok(Math.abs(after.x-before.x)<1e-9&&Math.abs(after.y-before.y)<1e-9);
 g.up(2,p(240,100));g.up(1,p(100,100));assert.equal(taps.length,0);
});
test('pinch transition to one finger pans smoothly and never taps',()=>{
 const {g,camera,taps}=setup();g.down(1,p(100,100));g.down(2,p(200,100));g.move(2,p(240,100));g.up(2,p(240,100));
 const prior=camera.center.x;g.move(1,p(110,100));g.up(1,p(110,100));
 assert.ok(Math.abs(camera.center.x-prior+10/camera.zoom)<1e-9);assert.equal(taps.length,0);
});
test('cancel clears pending commands and allows the next intentional tap',()=>{
 const {g,taps,cancels}=setup();g.down(1,p(1,2));g.abort();g.up(1,p(1,2));
 assert.equal(taps.length,0);assert.equal(cancels.length,1);assert.equal(g.active,false);
 g.down(2,p(5,5));g.up(2,p(5,5));assert.equal(taps.length,1);
});
test('third finger and final large displacement never produce a tap',()=>{
 const {g,taps}=setup();g.down(1,p(1,2));g.down(2,p(10,20));g.down(3,p(30,40));g.up(2,p(10,20));g.up(3,p(30,40));g.up(1,p(1,2));
 g.down(4,p(1,2));g.up(4,p(90,2));assert.equal(taps.length,0);
});
