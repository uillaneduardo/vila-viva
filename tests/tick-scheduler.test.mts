import test from 'node:test';
import assert from 'node:assert/strict';
import {TickScheduler} from '../apps/server/src/tick-scheduler.mts';
test('preserves 4/8/16 TPS exactly for nominal pulses',()=>{
 for(const speed of [1,2,4]){
  const s=new TickScheduler();let ticks=0;
  for(let i=0;i<160;i++)s.pulse(speed,()=>ticks++);
  assert.equal(ticks,40*speed);assert.equal(s.quantumMs,62.5);
 }
});
test('independent cadence tasks run after committed logical ticks',()=>{
 const s=new TickScheduler();let ticks=0;const events:number[]=[];
 const remove=s.register('rare',3,tick=>{assert.equal(tick,ticks);events.push(tick);});
 for(let i=0;i<10;i++)s.pulse(4,()=>ticks++);
 assert.deepEqual(events,[3,6,9]);remove();s.pulse(4,()=>ticks++);assert.equal(events.length,3);
});
test('pause and reset discard fractional phase; no hidden ticks',()=>{
 const s=new TickScheduler();let ticks=0;
 s.pulse(2,()=>ticks++);s.pulse(0,()=>ticks++);s.pulse(2,()=>ticks++);
 assert.equal(ticks,0);s.pulse(2,()=>ticks++);assert.equal(ticks,1);
 s.reset();s.pulse(1,()=>ticks++);assert.equal(ticks,1);
 assert.throws(()=>s.pulse(60,()=>ticks++));
});
test('failed tick does not execute observers',()=>{
 const s=new TickScheduler();let observed=0;s.register('observer',1,()=>observed++);
 assert.throws(()=>s.pulse(4,()=>{throw Error('commit failed');}));assert.equal(observed,0);
});
