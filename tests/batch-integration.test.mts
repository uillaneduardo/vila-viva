import test from 'node:test';
import assert from 'node:assert/strict';
import {dependencies,approved,orderBatch,samePlan,hasGreenCI,QUIET_SECONDS} from '../infra/batch-integration.mjs';
const sha='a'.repeat(40),pr={number:1,state:'open',draft:false,head:{sha},labels:[]};
test('requires explicit queue authorization or review on exact revision; rejects change requests',()=>{
 const review={state:'APPROVED',commit_id:sha,user:{login:'owner'},author_association:'OWNER'};
 assert.equal(approved(pr,[]),false);assert.equal(approved(pr,[review]),true);
 assert.equal(approved(pr,[{...review,commit_id:'b'.repeat(40)}]),false);
 const labeled={...pr,labels:[{name:'batch:ready'}]};
 assert.equal(approved(labeled),true);
 assert.equal(approved(labeled,[{...review,state:'CHANGES_REQUESTED'}]),false);
 assert.equal(approved({...labeled,draft:true}),false);
});
test('exact successful PR workflow only',()=>{
 const run={path:'.github/workflows/vnext-ci.yml',head_sha:sha,event:'pull_request',status:'completed',conclusion:'success',pull_requests:[{number:1,base:{ref:'main'}}]};
 assert.equal(hasGreenCI([run],sha,1),true);
 assert.equal(hasGreenCI([{...run,conclusion:'failure'}],sha,1),false);
 assert.equal(hasGreenCI([run],'b'.repeat(40),1),false);
 assert.equal(hasGreenCI([run],sha,2),false);
});
test('dependencies order a batch and withhold cycles and missing prerequisites',()=>{
 assert.deepEqual(dependencies('Depends-on: #9\nDepends-on: #7\nDepends-on: #9'),[9,7]);
 const p=(number,dependencies=[])=>({number,dependencies,sha});
 assert.deepEqual(orderBatch([p(1,[3]),p(3),p(2,[99]),p(4,[5]),p(5,[4])]).map(p=>p.number),[3,1]);
 assert.deepEqual(orderBatch([p(2,[99])],[99]).map(p=>p.number),[2]);
 assert.equal(samePlan([p(1)],[p(1)]),true);assert.equal(samePlan([p(1)],[p(2)]),false);
 assert.equal(QUIET_SECONDS,300);
});
