import {Worker} from 'node:worker_threads';
import type {World} from '../../../packages/domain/src/contracts.ts';
import type {AcceptedAction,WorldSnapshot,ActivityTick} from '../../../packages/domain/src/activity.ts';
import type {FileWorldStore} from './world-store.mts';
type Pending={id:number;resolve:(value:any)=>void;reject:(reason:Error)=>void};
type Operation='commit'|'switch'|'saveNamed'|'loadNamed'|'listSaves'|'getLog'|'recentLog'|'listLogs'|'snapshot';
/** Exclusive store RPC. One outstanding operation, including reads.
 * The caller must not instantiate another store against the same directory.
 */
export class PersistenceWorker{
 private worker:Worker;
 private pending:Pending|null=null;
 private sequence=0;
 private failed:Error|null=null;
 private closing=false;
 private ready:Promise<WorldSnapshot|null>;
 constructor(root:string){
  this.worker=new Worker(new URL('./persistence-worker-thread.mts',import.meta.url),{workerData:{root}});
  this.ready=new Promise((resolve,reject)=>{
   this.worker.on('message',m=>{
    if(m.type==='ready'){resolve(m.restored);return;}
    if(m.type==='failed'){
     if(m.fatal){this.fail(Error(m.error));return;}
     if(this.pending?.id===m.id){const p=this.pending;this.pending=null;p.reject(Error(m.error));}
     return;
    }
    if(m.type==='ack'&&this.pending?.id===m.id){const p=this.pending;this.pending=null;p.resolve(m.result);}
   });
   this.worker.on('error',e=>{this.fail(e);reject(e);});
   this.worker.on('exit',code=>{const e=Error('PERSISTENCE_WORKER_EXIT:'+code);this.fail(e);reject(e);});
  });
  void this.ready.catch(()=>{});
 }
 private fail(e:Error){this.failed=e;const p=this.pending;this.pending=null;p?.reject(e);}
 async restored(){return structuredClone(await this.ready);}
 private async submit<T>(type:Operation,args:Record<string,unknown>={}):Promise<T>{
  if(this.closing||this.failed)throw this.failed??Error('PERSISTENCE_CLOSED');
  if(this.pending)throw Error('PERSISTENCE_BUSY');
  const id=++this.sequence,input=structuredClone({type,id,...args});
  return new Promise<T>((resolve,reject)=>{
   this.pending={id,resolve,reject};
   void this.ready.then(()=>{
    if(this.failed||this.closing){this.fail(this.failed??Error('PERSISTENCE_CLOSED'));return;}
    try{this.worker.postMessage(input);}catch(e){this.fail(e instanceof Error?e:Error(String(e)));}
   },e=>this.fail(e));
  });
 }
 commit(world:World,seed?:string,actions:AcceptedAction[]=[]){return this.submit<WorldSnapshot>('commit',{world,seed,actions});}
 switchWorld(world:World,seed?:string){return this.submit<WorldSnapshot>('switch',{world,seed});}
 saveNamed(name:string,world:World,seed?:string){return this.submit<WorldSnapshot>('saveNamed',{name,world,seed});}
 loadNamed(name:string){return this.submit<WorldSnapshot>('loadNamed',{name});}
 listSaves(){return this.submit<ReturnType<FileWorldStore['listSaves']>>('listSaves');}
 getLog(timelineId?:string){return this.submit<string>('getLog',{timelineId});}
 recentLog(limit=80){return this.submit<ActivityTick[]>('recentLog',{limit});}
 listLogs(){return this.submit<ReturnType<FileWorldStore['listLogs']>>('listLogs');}
 snapshot(world:World,seed?:string){return this.submit<WorldSnapshot>('snapshot',{world,seed});}
 async close(){if(this.pending)throw Error('PERSISTENCE_BUSY');if(this.closing)return;this.closing=true;await this.worker.terminate();}
}
