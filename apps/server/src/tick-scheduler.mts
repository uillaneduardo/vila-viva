/** Fixed quantum scheduler with independent task cadences.
 * Default 16 Hz pulse, logical 4 TPS at 1x. No catch-up burst after stalls.
 * Tasks observe completed logical ticks; they cannot change the clock.
 */
export class TickScheduler {
 readonly quantumMs=62.5;
 private phase=0;
 private ticks=0;
 private tasks=new Map<string,{every:number,run:(tick:number)=>void}>();
 reset(){this.phase=0;this.ticks=0;}
 register(id:string,every:number,run:(tick:number)=>void){
  if(!id||this.tasks.has(id)||!Number.isSafeInteger(every)||every<1)throw Error("INVALID_TASK");
  this.tasks.set(id,{every,run});
  return ()=>this.tasks.delete(id);
 }
 pulse(speed:number,advance:()=>void){
  if(![0,1,2,4].includes(speed))throw Error("INVALID_SPEED");
  if(speed===0){this.reset();return false;}
  this.phase+=speed;
  if(this.phase<4)return false;
  this.phase-=4;
  advance();this.ticks++;
  for(const task of this.tasks.values())if(this.ticks%task.every===0)task.run(this.ticks);
  return true;
 }
}
