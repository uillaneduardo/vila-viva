/** Temporal position projection, independent of DOM, network, engine and sprites.
 * Only confirmed adjacent positions are interpolated. The input world is never mutated.
 */
export class TickPlayback {
 constructor({capacity=32,maxDelay=1000}={}){this.capacity=capacity;this.maxDelay=maxDelay;this.clear();}
 clear(){this.frames=[];this.offset=null;this.epoch=null;this.speed=null;this.delay=0;}
 push(world,{epoch=null,sampleTime,receivedAt,speed=1,paused=false,reset=false}={}){
  const t=Number.isFinite(sampleTime)?sampleTime:receivedAt;
  if(!Number.isFinite(t)||!Number.isFinite(receivedAt))return;
  if(reset||this.epoch!==epoch||this.speed!==speed||paused)this.clear();
  this.epoch=epoch;this.speed=speed;
  const last=this.frames.at(-1);
  if(last&&t<last.time)return;
  const observed=receivedAt-t;
  this.offset=this.offset===null?observed:Math.min(this.offset,observed);
  const period=250/Math.max(1,speed);
  this.delay=paused?0:Math.min(this.maxDelay,Math.max(period,period+Math.max(0,observed-this.offset)));
  const positions=new Map(world.entities.filter(e=>e.kind==='character').map(e=>[e.id,{x:e.position.x,y:e.position.y,health:e.health,carried:!!e.bodyCarriedBy}]));
  const frame={time:t,positions};
  if(last&&t===last.time)this.frames[this.frames.length-1]=frame;else this.frames.push(frame);
  while(this.frames.length>this.capacity)this.frames.shift();
 }
 position(entity,now){
  if(entity.kind!=='character'||entity.health<=0||entity.bodyCarriedBy||!this.frames.length||this.offset===null)return entity.position;
  const target=now-this.offset-this.delay;
  let a=this.frames[0],b=a;
  for(const frame of this.frames){b=frame;if(frame.time>=target)break;a=frame;}
  const from=a.positions.get(entity.id),to=b.positions.get(entity.id);
  if(!from||!to||from.health<=0||to.health<=0||from.carried||to.carried)return entity.position;
  if(Math.abs(from.x-to.x)+Math.abs(from.y-to.y)>1)return to;
  const alpha=a===b?1:Math.max(0,Math.min(1,(target-a.time)/(b.time-a.time)));
  return {x:from.x+(to.x-from.x)*alpha,y:from.y+(to.y-from.y)*alpha};
 }
}
