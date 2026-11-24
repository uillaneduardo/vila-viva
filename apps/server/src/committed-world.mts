import type {World} from '../../../packages/domain/src/contracts.ts';
import type {AcceptedAction,WorldSnapshot} from '../../../packages/domain/src/activity.ts';
type CommitPort={commit(world:World,seed?:string,actions?:AcceptedAction[]):Promise<WorldSnapshot>};
/** Single-flight transaction boundary. Speculative mutations are isolated from readers.
 * Failed writes poison the coordinator until explicitly reconstructed from disk.
 * Acknowledge and publish only the immutable committed copy.
 */
export class CommittedWorld{
 private current:World;
 private busy=false;
 private failure:unknown=null;
 private revision=0;
 private readonly store:CommitPort;
 constructor(initial:World,store:CommitPort){this.current=structuredClone(initial);this.store=store;}
 read(){return structuredClone(this.current);}
 get committedRevision(){return this.revision;}
 get pending(){return this.busy;}
 async mutate<T>(change:(draft:World,actions:AcceptedAction[])=>T):Promise<T>{
  if(this.failure)throw Error('RECOVERY_REQUIRED');
  if(this.busy)throw Error('WORLD_BUSY');
  this.busy=true;
  try{
   const draft=structuredClone(this.current),actions:AcceptedAction[]=[];
   const result=change(draft,actions);
   if(result&&typeof (result as any).then==='function')throw Error('ASYNC_MUTATION_NOT_ALLOWED');
   let checkpoint:WorldSnapshot;
   try{checkpoint=await this.store.commit(draft,draft.seed,actions);}
   catch(error){this.failure=error||Error('COMMIT_FAILED');throw error;}
   this.current=structuredClone(checkpoint.world);this.revision++;
   return result;
  }finally{this.busy=false;}
 }
}
