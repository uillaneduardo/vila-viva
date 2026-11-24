/** Monotonic presentation clock. Never crosses the last confirmed tick + 1.
 * Reconcile jitter by bounded rate correction instead of resetting each arrival.
 * No authority over simulation; time is in logical ticks, timestamps in ms.
 */
export class VisualClock {
 constructor(){this.clear();}
 clear(){this.confirmed=null;this.anchorTick=0;this.anchorTime=0;this.speed=0;this.rate=0;}
 at(now){
  if(this.confirmed===null)return null;
  return Math.min(this.confirmed+1,this.anchorTick+Math.max(0,now-this.anchorTime)*this.rate);
 }
 push(tick,now,speed,{reset=false,paused=false}={}){
  if(!Number.isSafeInteger(tick)||tick<0||!Number.isFinite(now)||![0,1,2,4].includes(speed))return false;
  const effective=paused?0:speed;
  if(reset||this.confirmed===null||tick<this.confirmed){
   this.confirmed=tick;this.anchorTick=tick;this.anchorTime=now;this.speed=effective;this.rate=effective/250;return true;
  }
  if(now<this.anchorTime)return false;
  if(tick===this.confirmed&&effective===this.speed)return true;
  const current=this.at(now);
  const missed=tick-this.confirmed>1;
  this.confirmed=tick;
  // A pause is an explicit discontinuity: freeze at authoritative logical time.
  if(effective===0){this.anchorTick=tick;this.anchorTime=now;this.speed=0;this.rate=0;return true;}
  // Preserve continuity for small phase errors; large gaps rebase to avoid a stale queue.
  this.anchorTick=missed||Math.abs(tick-current)>1?tick:current;
  this.anchorTime=now;this.speed=effective;
  const error=tick-this.anchorTick;
  this.rate=effective/250*Math.max(.75,Math.min(1.25,1+error*.25));
  return true;
 }
}
