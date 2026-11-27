import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export const READY_LABEL='batch:ready';
export const QUIET_SECONDS=300;
const SHA=/^[a-f0-9]{40}$/;
export function dependencies(body=''){
 return [...new Set([...String(body??'').matchAll(/^\s*Depends-on:\s*#(\d+)\s*$/gmi)].map(m=>Number(m[1])))];
}
export function approved(pr,reviews=[]){
 if(pr.draft||pr.state!=='open')return false;
 const last=new Map();
 for(const r of reviews)if(['APPROVED','CHANGES_REQUESTED','DISMISSED'].includes(r.state)&&['OWNER','MEMBER','COLLABORATOR'].includes(r.author_association))last.set(r.user?.login,r);
 if([...last.values()].some(r=>r.state==='CHANGES_REQUESTED'))return false;
 return pr.labels?.some(l=>l.name===READY_LABEL)||[...last.values()].some(r=>r.state==='APPROVED'&&r.commit_id===pr.head.sha);
}
export function orderBatch(candidates,merged=[]){
 const remaining=new Map(candidates.map(p=>[p.number,p]));
 const done=new Set(merged),result=[];
 while(remaining.size){
  const next=[...remaining.values()].filter(p=>p.dependencies.every(n=>done.has(n))).sort((a,b)=>a.number-b.number)[0];
  if(!next)break;
  result.push(next);done.add(next.number);remaining.delete(next.number);
 }
 return result;
}
export function samePlan(a,b){return JSON.stringify(a)===JSON.stringify(b);}
export function hasGreenCI(runs,sha,number){
 return runs.some(r=>r.path==='.github/workflows/vnext-ci.yml'&&r.head_sha===sha&&r.event==='pull_request'&&r.status==='completed'&&r.conclusion==='success'&&r.pull_requests?.some(p=>p.number===number&&p.base?.ref==='main'));
}
const exec=(cmd,args,opts={})=>execFileSync(cmd,args,{encoding:'utf8',maxBuffer:16*1024*1024,...opts}).trim();
const git=(...a)=>exec('git',a);
const repo=()=>{const r=process.env.GITHUB_REPOSITORY;if(!r||!/^[\w.-]+\/[\w.-]+$/.test(r))throw Error('Invalid repository');return r;};
const api=(p)=>JSON.parse(exec('gh',['api',p]));
const pages=(p)=>JSON.parse(exec('gh',['api','--paginate','--slurp',p])).flat();
const baseHead=()=>api('repos/'+repo()+'/branches/main').commit.sha;
function output(key,value){appendFileSync(process.env.GITHUB_OUTPUT,key+'='+value+'\n');}
export function fetchPlan(){
 const r=repo(),prs=pages('repos/'+r+'/pulls?state=open&base=main&per_page=100');
 const candidates=[],merged=new Set();
 for(const pr of prs){
  // The release runner is trusted: never automatically integrate fork code.
  if(pr.head.repo?.full_name!==r||pr.base.ref!=='main'||pr.draft||!SHA.test(pr.head.sha))continue;
  const reviews=pages('repos/'+r+'/pulls/'+pr.number+'/reviews?per_page=100');
  if(!approved(pr,reviews))continue;
  const runs=api('repos/'+r+'/actions/runs?head_sha='+pr.head.sha+'&event=pull_request&per_page=100').workflow_runs;
  if(!hasGreenCI(runs,pr.head.sha,pr.number))continue;
  const deps=dependencies(pr.body);
  for(const n of deps)if(!merged.has(n)&&!prs.some(p=>p.number===n)){
   const other=api('repos/'+r+'/pulls/'+n);if(other.merged)merged.add(n);
  }
  candidates.push({number:pr.number,sha:pr.head.sha,dependencies:deps});
 }
 return orderBatch(candidates,[...merged]);
}
function stage(){
 const base=baseHead(),plan=fetchPlan();
 output('base',base);output('plan',JSON.stringify(plan));
 if(!plan.length){output('candidate','');return;}
 if(!SHA.test(base))throw Error('Invalid main SHA');
 git('fetch','origin','main');git('checkout','--detach',base);
 git('config','user.name','oturo-integration[bot]');git('config','user.email','41898282+github-actions[bot]@users.noreply.github.com');
 for(const p of plan){
  git('fetch','origin','refs/pull/'+p.number+'/head');
  if(git('rev-parse','FETCH_HEAD')!==p.sha)throw Error('PR changed: #'+p.number);
  try{git('merge','--no-ff','--no-edit',p.sha);}catch(e){try{git('merge','--abort');}catch{}throw Error('Merge conflict in PR #'+p.number+'; main unchanged');}
 }
 const candidate=git('rev-parse','HEAD');
 const previous=git('ls-remote','origin','refs/heads/integration').split(/\s+/)[0];
 if(previous&&!SHA.test(previous))throw Error('Invalid integration SHA');
 // Only the disposable integration branch is rewritten, and only with an exact lease.
 git('push','--force-with-lease=refs/heads/integration:'+previous,'origin',candidate+':refs/heads/integration');
 output('candidate',candidate);console.log('Staged '+plan.map(p=>'#'+p.number).join(', ')+' at '+candidate);
}
function check(){
 const base=process.env.BATCH_BASE,candidate=process.env.BATCH_CANDIDATE;
 if(!SHA.test(base??'')||!SHA.test(candidate??''))throw Error('Invalid batch refs');
 const plan=JSON.parse(process.env.BATCH_PLAN);
 const unchanged=baseHead()===base&&api('repos/'+repo()+'/branches/integration').commit.sha===candidate&&samePlan(plan,fetchPlan());
 output('unchanged',String(unchanged));
 if(!unchanged)console.log('Batch changed: defer without touching main.');
 return unchanged;
}
function promote(){
 if(!check())return;
 const candidate=process.env.BATCH_CANDIDATE,base=process.env.BATCH_BASE;
 git('fetch','origin','main','integration');
 git('merge-base','--is-ancestor',base,candidate);
 // No force on main; a concurrent change will reject this push.
 git('push','origin',candidate+':refs/heads/main');
 // GITHUB_TOKEN pushes do not trigger workflows. Explicit workflow_dispatch is supported.
 exec('gh',['workflow','run','vnext-ci.yml','--ref','main','-f','expected_sha='+candidate]);
 output('promoted','true');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const command=process.argv[2];
 if(command==='stage')stage();else if(command==='check')check();else if(command==='promote')promote();else throw Error('Unknown batch command');
}
