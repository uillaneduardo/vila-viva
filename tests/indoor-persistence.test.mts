import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createWorld,applyCommand,advanceTick} from '../packages/engine/src/engine.ts';
import {validateWorld} from '../packages/protocol/src/world-snapshot.ts';
import {FileWorldStore} from '../apps/server/src/world-store.mts';
import {PersistenceWorker} from '../apps/server/src/persistence-worker.mts';
test('sleeping NPC persists and recovers in sync and worker stores; rejected movement is nonmutating',async()=>{
 const w=createWorld('sleep-persistence');
 const god=(id,action,extra)=>applyCommand(w,{worldId:w.id,commandId:id,actorRole:'admin',action,...extra});
 assert.equal(god('home','construction.place',{position:{x:6,y:4},parameters:{blueprintId:'building.community_house',mode:'completed'}}).ok,true);
 assert.equal(god('npc','npc.spawn',{position:{x:5,y:4},parameters:{name:'NPC'}}).ok,true);
 const npc=w.entities.find(e=>e.id==='npc-npc');npc.energy=10;
 for(let i=0;i<3;i++){advanceTick(w);validateWorld(w);}
 assert.equal(npc.sleepingInId,'construction-home');
 const before=structuredClone(w);
 const result=applyCommand(w,{worldId:w.id,commandId:'sleep-move',actorRole:'npc',actorId:npc.id,targetId:npc.id,action:'movement.move',position:{x:4,y:4}});
 assert.equal(result.error,'BLOCKED');assert.deepEqual(w,before);
 const root=mkdtempSync(join(tmpdir(),'oturo-sleep-save-'));
 let worker;
 try{
  const store=new FileWorldStore(root);store.switchWorld(w);
  assert.deepEqual(new FileWorldStore(root).loadActive()?.world,w);
  worker=new PersistenceWorker(root);
  assert.deepEqual((await worker.restored())?.world,w);
  await worker.commit(w);
  const bad=structuredClone(w);bad.entities.find(e=>e.id===npc.id).sleepingInId='bad/id';
  assert.throws(()=>validateWorld(bad),/INVALID_WORLD/);
 }finally{if(worker)await worker.close();rmSync(root,{recursive:true,force:true});}
});
