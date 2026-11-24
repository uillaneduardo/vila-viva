/** Present only previously accepted moves. Never predicts a path or changes logical occupancy. */
import {TickPlayback} from './tick-playback.js';
import {VisualClock} from './visual-clock.js';
export class MotionPlayback{
 constructor(){this.fallback=new TickPlayback();this.clock=new VisualClock();this.reset();}
 reset(){this.epoch=null;this.speed=null;this.tick=null;this.anchor=0;this.paused=true;this.worldId=null;this.fallback.clear();this.clock.clear();}
 push(world,options={}){
  const {epoch=null,speed=1,paused=false,receivedAt,reset=false}=options;
  if(!Number.isFinite(receivedAt))return;
  const discontinuity=reset||epoch!==this.epoch||world.id!==this.worldId||this.tick!==null&&world.tick<this.tick;
  if(discontinuity)this.reset();
  this.fallback.push(world,options);
  if(!this.clock.push(world.tick,receivedAt,speed,{reset:discontinuity,paused}))return;
  this.tick=world.tick;this.epoch=epoch;this.speed=speed;this.paused=paused;this.worldId=world.id;
 }
 position(entity,now){
  if(entity.kind!=='character'||entity.health<=0||entity.bodyCarriedBy||this.paused)return entity.position;
  const m=entity.movementSegment;
  if(!m)return this.fallback.position(entity,now);
  if(!Number.isFinite(this.tick)||!Number.isFinite(m.startTick)||!Number.isFinite(m.endTick)||m.endTick<=m.startTick||
    m.to.x!==entity.position.x||m.to.y!==entity.position.y||Math.abs(m.to.x-m.from.x)+Math.abs(m.to.y-m.from.y)!==1)return entity.position;
  // Advance at most one tick beyond the confirmed clock. A stalled stream cannot run ahead indefinitely.
  const time=this.clock.at(now);
  const alpha=Math.max(0,Math.min(1,(time-m.startTick)/(m.endTick-m.startTick)));
  return {x:m.from.x+(m.to.x-m.from.x)*alpha,y:m.from.y+(m.to.y-m.from.y)*alpha};
 }
}
