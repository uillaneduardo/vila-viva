import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PersistenceWorker} from '../apps/server/src/persistence-worker.mts';
import {FileWorldStore} from '../apps/server/src/world-store.mts';
import {createWorld} from '../packages/engine/src/engine.ts';
test('worker acknowledges isolated checkpoint, bounds outstanding writes and recovers after exit',async()=>{
 const root=mkdtempSync(join(tmpdir(),'oturo-worker-'));const worker=new PersistenceWorker(root);
 try{
  const world=createWorld('worker');
  const first=worker.switchWorld(world);
  await assert.rejects(worker.commit(world),/PERSISTENCE_BUSY/);
  world.tick=7;
  const initial=await first;assert.equal(initial.world.tick,0);
  const committed=await worker.commit(world);assert.equal(committed.world.tick,7);
  assert.equal(committed.timelineId,initial.timelineId);
  await worker.close();
  const recovered=new FileWorldStore(root).loadActive();
  assert.equal(recovered?.world.tick,7);assert.equal(recovered?.timelineId,initial.timelineId);
 }finally{await worker.close();rmSync(root,{recursive:true,force:true});}
});
test('worker fails closed on invalid world and rejects further writes',async()=>{
 const root=mkdtempSync(join(tmpdir(),'oturo-worker-fail-'));const worker=new PersistenceWorker(root);
 try{
  const world=createWorld('worker');await worker.switchWorld(world);
  await assert.rejects(worker.commit({...world,width:0}),/INVALID_WORLD/);
  await assert.rejects(worker.commit(world));
 }finally{await worker.close();rmSync(root,{recursive:true,force:true});}
});

test('exclusive worker supports named saves, snapshot, logs, startup recovery and read errors',async()=>{
 const root=mkdtempSync(join(tmpdir(),'oturo-worker-rpc-'));let worker=new PersistenceWorker(root);
 try{
  assert.equal(await worker.restored(),null);
  const world=createWorld('rpc');await worker.switchWorld(world);
  world.tick=3;await worker.commit(world);await worker.saveNamed('checkpoint',world);
  assert.equal((await worker.listSaves())[0].name,'checkpoint');
  assert.equal((await worker.loadNamed('checkpoint')).world.tick,3);
  assert.equal((await worker.snapshot(world)).world.tick,3);
  assert.equal(await worker.getLog(),'');assert.deepEqual(await worker.recentLog(),[]);
  assert.deepEqual(await worker.listLogs(),[]);
  await assert.rejects(worker.loadNamed('missing'));
  assert.equal((await worker.listSaves()).length,1);
  await worker.close();worker=new PersistenceWorker(root);
  assert.equal((await worker.restored())?.world.tick,3);
 }finally{await worker.close();rmSync(root,{recursive:true,force:true});}
});
