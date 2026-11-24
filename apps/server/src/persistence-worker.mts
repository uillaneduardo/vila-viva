import {Worker} from 'node:worker_threads';
import type {World} from '../../../packages/domain/src/contracts.ts';
import type {AcceptedAction,WorldSnapshot} from '../../../packages/domain/src/activity.ts';
type Pending={id:number;resolve:(value:WorldSnapshot)=>void;reject:(reason:Error)=>void};
/** Experimental exclusive store owner. One outstanding write, no unbounded queue.
 * Acknowledgement means FileWorldStore.commit/switchWorld returned successfully.
 * Never run against a directory simultaneously owned by another store.
 */
export class PersistenceWorker{
 private worker:Worker;
 private pending:Pending|null=null;
 private sequence=0;
 private failed:Error|null=null;
 private closing=false;
 private ready:Promise<void>;
 constructor(root:string){
  this.worker=new Worker(new URL('./persistence-worker-thread.mts',import.meta.url),{workerData:{root}});
  this.ready=new Promise<void>((resolve,reject)=>{
   this.worker.on('message',m=>{
    if(m.type==='ready'){resolve();return;}
    if(m.type==='failed'){this.fail(Error(m.error));return;}
    if(m.type==='ack'&&this.pending?.id===m.id){const p=this.pending;this.pending=null;p.resolve(m.snapshot);}
   });
   this.worker.on('error',e=>{this.fail(e);reject(e);});
   this.worker.on('exit',code=>{const e=Error('PERSISTENCE_WORKER_EXIT:'+code);this.fail(e);reject(e);});
  });
  // Avoid an unhandled rejection when startup fails before the first request.
  void this.ready.catch(()=>{});
 }
 private fail(e:Error){this.failed=e;const p=this.pending;this.pending=null;p?.reject(e);}
 private async submit(type:string,world:World,seed?:string,actions:AcceptedAction[]=[]):Promise<WorldSnapshot>{
  if(this.closing||this.failed)throw this.failed??Error('PERSISTENCE_CLOSED');
  if(this.pending)throw Error('PERSISTENCE_BUSY');
  // Reserve the slot synchronously, including during startup.
  const id=++this.sequence;
  const input=structuredClone({type,id,world,seed,actions});
  return new Promise<WorldSnapshot>((resolve,reject)=>{
   this.pending={id,resolve,reject};
   void this.ready.then(()=>{
    if(this.failed||this.closing){this.fail(this.failed??Error('PERSISTENCE_CLOSED'));return;}
    try{this.worker.postMessage(input);}catch(e){this.fail(e instanceof Error?e:Error(String(e)));}
   },e=>this.fail(e));
  });
 }
 commit(world:World,seed?:string,actions:AcceptedAction[]=[]){return this.submit('commit',world,seed,actions);}
 switchWorld(world:World,seed?:string){return this.submit('switch',world,seed);}
 async close(){if(this.pending)throw Error('PERSISTENCE_BUSY');this.closing=true;await this.worker.terminate();}
}
