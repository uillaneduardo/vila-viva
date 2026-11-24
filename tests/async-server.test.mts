import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {makePrototype} from '../apps/server/src/index.mts';
test('opt-in async server confirms commands, saves, timeline switches and recovery',async()=>{
 const root=mkdtempSync(join(tmpdir(),'oturo-async-http-'));
 const {server,shutdown}=makePrototype({dataDir:root,asyncPersistence:true});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address();if(!address||typeof address==='string')throw Error('address');
 const base='http://127.0.0.1:'+address.port;
 const get=async(path:string)=>(await fetch(base+path)).json();
 const post=async(path:string,data:object)=>{const response=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({role:'admin',...data})});assert.equal(response.status,200,await response.clone().text());return response.json();};
 try{
  const before=await get('/api/world');
  await post('/api/commands',{commandId:'async-source',action:'resource.spawn',position:{x:8,y:7},parameters:{resourceType:'wood',quantity:5}});
  const after=await get('/api/world');assert.equal(after.world.entities.length,before.world.entities.length+1);
  await post('/api/world/save',{name:'async-save'});
  assert.equal((await get('/api/world/saves')).saves[0].name,'async-save');
  const next=await post('/api/world/new',{width:24,height:16});
  assert.equal(next.paused,true);
  const switched=await get('/api/world');assert.notEqual(switched.timelineId,before.timelineId);
  await post('/api/world/load',{name:'async-save'});
  const loaded=await get('/api/world');assert.deepEqual(loaded.world,after.world);
  assert.deepEqual((await get('/api/world/export')).world,loaded.world);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await shutdown();rmSync(root,{recursive:true,force:true});}
});

test('async server does not expose competing store and shutdown waits for durable state',async()=>{
 const root=mkdtempSync(join(tmpdir(),'oturo-async-stop-'));
 const app=makePrototype({dataDir:root,asyncPersistence:true});
 try{
  assert.equal(app.store,null);
  await new Promise<void>(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const address=app.server.address();if(!address||typeof address==='string')throw Error('address');
  const base='http://127.0.0.1:'+address.port;
  const response=await fetch(base+'/api/commands',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({role:'admin',commandId:'shutdown-source',action:'resource.spawn',position:{x:8,y:7},parameters:{resourceType:'wood',quantity:5}})});
  assert.equal(response.status,200);
  const expected=app.world.tick;
  await new Promise<void>(resolve=>app.server.close(()=>resolve()));
  await Promise.all([app.shutdown(),app.shutdown()]);
  const {FileWorldStore}=await import('../apps/server/src/world-store.mts');
  assert.equal(new FileWorldStore(root).loadActive()?.world.tick,expected);
 }finally{if(app.server.listening)await new Promise<void>(resolve=>app.server.close(()=>resolve()));await app.shutdown();rmSync(root,{recursive:true,force:true});}
});
