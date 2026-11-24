import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {makePrototype} from '../apps/server/src/index.mts';

for(const asyncPersistence of [false,true]){
 test('tick publication timing: '+(asyncPersistence?'worker':'sync'),async()=>{
  const root=mkdtempSync(join(tmpdir(),'oturo-timing-'));
  const app=makePrototype({dataDir:root,asyncPersistence});
  try{
   app.clock.speed=1;
   const deadline=performance.now()+10000;
   while(!app.timings.summary().tickToPublish?.count&&performance.now()<deadline)await delay(20);
   app.clock.speed=0;
   const s=app.timings.summary();
   assert.ok(s.tickToPublish?.count,'expected published tick');
   for(const name of ['simulation','persistence','publish'])assert.ok(s[name]?.count,name);
   assert.ok(s.tickToPublish.p50>=0);
   if(asyncPersistence)assert.ok(s.clone?.count);
   else assert.equal(s.clone,undefined);
  }finally{await app.shutdown();rmSync(root,{recursive:true,force:true});}
 });
}
