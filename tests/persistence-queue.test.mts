import test from 'node:test';
import assert from 'node:assert/strict';
import {PersistenceQueue} from '../apps/server/src/persistence-queue.mts';
test('queue admits without awaiting writer, preserves order and drains',async()=>{
 let release!:()=>void;
 const gate=new Promise<void>(r=>{release=r;});
 const writes:number[]=[];
 const queue=new PersistenceQueue(async(value:number)=>{writes.push(value);if(value===1)await gate;},{maxItems:2,maxBytes:20});
 const a=queue.enqueue(1,1,10),b=queue.enqueue(2,2,10);
 assert.equal(queue.status().durableRevision,0);
 assert.equal(queue.status().acceptedRevision,2);
 assert.throws(()=>queue.enqueue(3,3,1),/BACKPRESSURE/);
 await Promise.resolve();assert.deepEqual(writes,[1]);
 const closing=queue.close();assert.throws(()=>queue.enqueue(3,3,1),/SEALED/);
 release();await Promise.all([a,b,closing]);
 assert.deepEqual(writes,[1,2]);assert.equal(queue.status().durableRevision,2);assert.equal(queue.status().bytes,0);
});
test('failed writer rejects queued acknowledgements and blocks admission',async()=>{
 const writes:number[]=[];
 const queue=new PersistenceQueue(async(value:number)=>{writes.push(value);throw Error('disk failure');},{maxItems:3,maxBytes:30});
 const a=queue.enqueue(1,1,10),b=queue.enqueue(2,2,10);
 const rejected=Promise.all([assert.rejects(a,/disk failure/),assert.rejects(b,/disk failure/)]);
 await rejected;await assert.rejects(queue.close(),/disk failure/);
 assert.deepEqual(writes,[1]);assert.equal(queue.status().durableRevision,0);
 assert.throws(()=>queue.enqueue(3,3,1),/disk failure/);
});
test('queue rejects gaps and byte overflow without consuming revision',async()=>{
 const queue=new PersistenceQueue(async()=>{},{maxItems:3,maxBytes:10});
 assert.throws(()=>queue.enqueue(2,'gap',1),/INVALID_REVISION/);
 assert.throws(()=>queue.enqueue(1,'large',11),/BACKPRESSURE/);
 await queue.enqueue(1,'ok',10);await queue.close();
 assert.equal(queue.status().durableRevision,1);
});
