import test from 'node:test';
import assert from 'node:assert/strict';
import {VisualClock} from '../packages/renderer/src/visual-clock.js';
test('early and late revisions preserve phase rather than jump or rewind',()=>{
 const c=new VisualClock();c.push(10,0,1);
 const early=c.at(200);c.push(11,200,1);assert.equal(c.at(200),early);
 const late=c.at(480);c.push(12,480,1);assert.equal(c.at(480),late);
 assert.ok(c.at(500)>=late);assert.equal(c.at(10000),13);
});
test('same tick revisions do not change phase; speed transition continuous',()=>{
 const c=new VisualClock();c.push(10,0,1);c.push(10,100,1);
 assert.equal(c.at(125),10.5);c.push(10,125,2);assert.equal(c.at(125),10.5);
 assert.ok(c.at(150)>10.5);assert.equal(c.at(1000),11);
});
test('pause, missed revisions, reset and invalid samples',()=>{
 const c=new VisualClock();c.push(10,0,1);c.push(14,1000,1);assert.equal(c.at(1000),14);
 c.push(14,1050,0,{paused:true});assert.equal(c.at(2000),14);
 c.push(14,2000,4);assert.equal(c.at(2031.25),14.5);
 assert.equal(c.push(15,1999,4),false);assert.equal(c.push(NaN,2100,1),false);
 c.push(1,2200,1,{reset:true});assert.equal(c.at(2200),1);
});
