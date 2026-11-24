import test from 'node:test';
import assert from 'node:assert/strict';
import {brushCells} from '../packages/renderer/src/camera.js';

const world={width:24,height:16};
test('square brush preserves existing footprint',()=>{
 assert.equal(brushCells({x:8,y:8},4,world).length,16);
 assert.deepEqual(brushCells({x:8,y:8},1,world,'square'),[{x:8,y:8}]);
});
test('circle brush masks cells consistently at even and odd sizes',()=>{
 assert.equal(brushCells({x:8,y:8},4,world,'circle').length,12);
 assert.equal(brushCells({x:8,y:8},5,world,'circle').length,21);
 assert.deepEqual(brushCells({x:8,y:8},1,world,'circle'),[{x:8,y:8}]);
});
test('circle brush clips against world borders',()=>{
 const cells=brushCells({x:0,y:0},5,world,'circle');
 assert.ok(cells.length>0&&cells.length<21);
 assert.ok(cells.every(({x,y})=>x>=0&&y>=0&&x<world.width&&y<world.height));
});
