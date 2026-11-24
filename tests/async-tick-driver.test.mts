import test from 'node:test';
import assert from 'node:assert/strict';
import {CommittedWorld} from '../apps/server/src/committed-world.mts';
import {AsyncTickDriver} from '../apps/server/src/async-tick-driver.mts';
import {createWorld,advanceTick} from '../packages/engine/src/engine.ts';
import {PersistenceWorker} from '../apps/server/src/persistence-worker.mts';
import {FileWorldStore} from '../apps/server/src/world-store.mts';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('async driver publishes only after acknowledgement, skips busy pulses',async()=>{
 let ack:any;const initial=createWorld('async');
 const world=new CommittedWorld(initial,{commit:draft=>new Promise(resolve=>{ack=()=>resolve({world:draft});})});
 const seen:number[]=[];const driver=new AsyncTickDriver(world,()=>seen.push(world.read().tick));
 assert.equal(driver.pulse(4),true);assert.equal(driver.pulse(4),false);
 assert.equal(world.read().tick,0);assert.deepEqual(seen,[]);
 ack();await driver.drain();assert.deepEqual(seen,[1]);assert.equal(driver.busy,false);
});
test('failed commit halts driver without publication',async()=>{
 const world=new CommittedWorld(createWorld('async'),{commit:async()=>{throw Error('disk');}});
 const driver=new AsyncTickDriver(world,()=>assert.fail('uncommitted publication'));
 driver.pulse(4);await driver.drain();assert.ok(driver.fault);assert.equal(world.read().tick,0);assert.equal(driver.pulse(4),false);
});
test('worker driver matches synchronous engine and recovers committed ticks',async()=>{
 const root=mkdtempSync(join(tmpdir(),'oturo-async-driver-'));const worker=new PersistenceWorker(root);
 try{
  const initial=createWorld('async');await worker.switchWorld(initial);
  const world=new CommittedWorld(initial,worker);const expected=structuredClone(initial);
  const seen:number[]=[];const driver=new AsyncTickDriver(world,()=>seen.push(world.read().tick));
  for(let i=0;i<8;i++){advanceTick(expected);assert.equal(driver.pulse(4),true);await driver.drain();}
  assert.deepEqual(world.read(),expected);assert.deepEqual(seen,[1,2,3,4,5,6,7,8]);
  await worker.close();assert.deepEqual(new FileWorldStore(root).loadActive()?.world,expected);
 }finally{await worker.close();rmSync(root,{recursive:true,force:true});}
});
