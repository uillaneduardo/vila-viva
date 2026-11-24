import {CommittedWorld} from './committed-world.mts';
import {TickScheduler} from './tick-scheduler.mts';
import {advanceTick} from '../../../packages/engine/src/engine.ts';
/** Experimental composition of the existing scheduler and committed world.
 * No speculative publication, no overlapping writes, no catch-up on busy pulses.
 * Caller owns the exclusive store and handles administrative serialization.
 */
export class AsyncTickDriver{
 private scheduler=new TickScheduler();
 private world:CommittedWorld;
 private publish:()=>void;
 private failed:unknown=null;
 private pending:Promise<void>|null=null;
 constructor(world:CommittedWorld,publish:()=>void){this.world=world;this.publish=publish;}
 get quantumMs(){return this.scheduler.quantumMs;}
 get fault(){return this.failed;}
 get busy(){return this.pending!==null||this.world.pending;}
 reset(){this.scheduler.reset();}
 pulse(speed:number):boolean{
  if(speed===0){this.reset();return false;}
  if(this.failed||this.busy)return false;
  return this.scheduler.pulse(speed,()=>{
   const job=this.world.mutate((draft,actions)=>{advanceTick(draft,a=>actions.push(a));});
   this.pending=job.then(()=>{this.publish();}).catch(error=>{this.failed=error||Error('TICK_FAILED');this.reset();}).finally(()=>{this.pending=null;});
  });
 }
 async drain(){await this.pending;}
}
