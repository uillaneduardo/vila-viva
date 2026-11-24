import test from 'node:test';
import assert from 'node:assert/strict';
import {PerformanceWindow} from '../packages/renderer/src/performance-window.js';
import {TimingMetrics} from '../apps/server/src/timing-metrics.mts';
test('bounded rolling quantiles ignore invalid values',()=>{
 const w=new PerformanceWindow(3);for(const x of [1,2,3,4,NaN,-1])w.add(x);
 assert.deepEqual(w.summary(),{count:3,p50:3,p95:4,p99:4,max:4});w.clear();assert.equal(w.summary().p95,null);
});
test('server timing samples remain bounded and measure failures without swallowing them',()=>{
 const m=new TimingMetrics(2);m.record('tick',1);m.record('tick',2);m.record('tick',3);
 assert.deepEqual(m.summary().tick,{count:2,p50:2,p95:3,p99:3,max:3});
 assert.equal(m.measure('ok',()=>42),42);assert.throws(()=>m.measure('failed',()=>{throw Error('test');}));
 assert.equal(m.summary().failed.count,1);
});
