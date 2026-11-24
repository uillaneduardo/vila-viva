import test from 'node:test';
import assert from 'node:assert/strict';
import {CommittedWorld} from '../apps/server/src/committed-world.mts';
import {createWorld} from '../packages/engine/src/engine.ts';
test('readers see only acknowledged state, concurrent writes rejected',async()=>{
 let ack:any;
 const c=new CommittedWorld(createWorld('c'),{commit:world=>new Promise(resolve=>{ack=()=>resolve({world});})});
 const p=c.mutate(w=>{w.tick=1;return 'ok';});
 assert.equal(c.read().tick,0);assert.equal(c.pending,true);
 await assert.rejects(c.mutate(w=>{w.tick=2;}),/WORLD_BUSY/);
 ack();assert.equal(await p,'ok');assert.equal(c.read().tick,1);assert.equal(c.committedRevision,1);
 const copy=c.read();copy.tick=9;assert.equal(c.read().tick,1);
});
test('failed commit leaves last acknowledged state visible and requires recovery',async()=>{
 const c=new CommittedWorld(createWorld('c'),{commit:async()=>{throw Error('disk');}});
 await assert.rejects(c.mutate(w=>{w.tick=5;}),/disk/);
 assert.equal(c.read().tick,0);assert.equal(c.committedRevision,0);
 await assert.rejects(c.mutate(w=>{w.tick=6;}),/RECOVERY_REQUIRED/);
});
