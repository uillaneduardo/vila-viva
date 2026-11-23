import {Camera,hitTest,brushCells} from './camera.js';
import {SpriteLibrary,resolveWorldSprite} from './sprites.js';
export class Scene {
 constructor(canvas){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.camera=new Camera();
  this.sprites=new SpriteLibrary();this.sprites.preload();this.world=null;this.selected=null;this.hover=null;this.hoverRoute=null;this.pointer=null;this.brush=null;
  this.resize();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
 }
 resize(){
  const dpr=Math.min(devicePixelRatio||1,2),width=this.canvas.clientWidth||innerWidth,height=this.canvas.clientHeight||innerHeight;
  this.camera.setViewport(width,height);this.canvas.width=Math.round(width*dpr);this.canvas.height=Math.round(height*dpr);
  this.ctx.setTransform(dpr,0,0,dpr,0,0);this.dpr=dpr;
 }
 setWorld(world){if(!this.world)this.camera.centerOnWorld(world);this.world=world;}
 setSelection(id){this.selected=id;}
 setHover(id){this.hover=id;}
 setRoute(waypoints){this.hoverRoute=Array.isArray(waypoints)?waypoints:null;}
 setBrush(brush){this.brush=brush;}
 pick(x,y){return this.world?hitTest(this.world.entities,this.camera,x,y):null;}
 paint(now=0){
  const c=this.ctx,k=this.camera,w=k.width,h=k.height,t=k.tile;
  c.clearRect(0,0,w,h);c.fillStyle='#2c4b38';c.fillRect(0,0,w,h);
  if(!this.world)return;
  const topLeft=k.screenToWorld(0,0),bottomRight=k.screenToWorld(w,h);
  const x0=Math.max(0,Math.floor(topLeft.x/t)-1),y0=Math.max(0,Math.floor(topLeft.y/t)-1);
  const x1=Math.min(this.world.width,Math.ceil(bottomRight.x/t)+1),y1=Math.min(this.world.height,Math.ceil(bottomRight.y/t)+1);
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
   const p=k.worldToScreen(x*t,y*t),s=t*k.zoom;
   c.fillStyle=(x+y)%2?'#30523d':'#335640';c.fillRect(p.x,p.y,s+.5,s+.5);
   if((x*17+y*23)%29===0&&s>16){c.fillStyle='rgba(191,214,168,.13)';c.fillRect(p.x+s*.6,p.y+s*.29,2,3);}
  }
  // Only real entities from /api/world are visualized. No fake houses, stocks or paths.
  for(const e of [...this.world.entities].sort((a,b)=>a.position.y-b.position.y)){
   const p=k.worldToScreen((e.position.x+.5)*t,(e.position.y+.5)*t),s=t*k.zoom;
   if(p.x<-s||p.y<-s||p.x>w+s||p.y>h+s)continue;
   const visual=resolveWorldSprite(e);
   const drawn=visual&&this.sprites.draw(c,visual.id,p.x,p.y,s*visual.scale,visual.state);
   if(!drawn){
    c.save();c.translate(p.x,p.y);
    if(e.kind==='character'){
     c.beginPath();c.arc(0,0,Math.max(7,s*.28),0,Math.PI*2);c.fillStyle=e.ownerId?'#e5d19e':'#d6c091';c.fill();
     c.strokeStyle='rgba(35,42,26,.7)';c.lineWidth=1.5;c.stroke();
     c.fillStyle='#29342a';c.font='bold '+Math.max(10,s*.29)+'px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText((e.name||'?').charAt(0).toUpperCase(),0,1);
    }else if(e.resourceType==='wood'){
     c.fillStyle='#6b8f65';c.beginPath();c.arc(-s*.09,0,s*.22,0,Math.PI*2);c.arc(s*.1,-s*.07,s*.22,0,Math.PI*2);c.fill();
     c.fillStyle='#9f8464';c.fillRect(-s*.035,s*.13,s*.07,s*.17);
    }else if(e.resourceType==='stone'){
     c.fillStyle='#a6b0a7';c.beginPath();c.moveTo(-s*.26,s*.16);c.lineTo(-s*.16,-s*.18);c.lineTo(s*.12,-s*.26);c.lineTo(s*.27,s*.07);c.lineTo(s*.14,s*.22);c.closePath();c.fill();
    }else{
     c.fillStyle='#d5bb75';for(let i=0;i<3;i++){c.beginPath();c.arc((i-1)*s*.13,(i%2)*s*.1,s*.095,0,Math.PI*2);c.fill();}
    }
    if(e.kind==='resource'&&e.quantity===0){c.fillStyle='rgba(30,45,33,.58)';c.fillRect(-s*.3,-s*.3,s*.6,s*.6);}
    c.restore();
   }
   if(e.id===this.hover||e.id===this.selected){
    c.beginPath();c.arc(p.x,p.y,s*.4,0,Math.PI*2);
    c.strokeStyle=e.id===this.selected?'#f2e3a7':'rgba(241,251,225,.75)';c.lineWidth=e.id===this.selected?2.7:1.5;c.stroke();
   }
  }
  if(this.hover&&this.hoverRoute?.length>1){
   c.beginPath();
   this.hoverRoute.forEach((point,i)=>{
    const p=k.worldToScreen((point.x+.5)*t,(point.y+.5)*t);
    if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);
   });
   c.setLineDash([5,5]);c.strokeStyle='#e9dca2';c.lineWidth=2;c.stroke();c.setLineDash([]);
  }
  if(this.brush&&this.pointer){
   const center=k.tileAt(this.pointer.x,this.pointer.y),cells=brushCells(center,this.brush.size,this.world);
   for(const cell of cells){
    const point=k.worldToScreen(cell.x*t,cell.y*t),s=t*k.zoom;
    const occupied=this.world.entities.some(e=>e.position.x===cell.x&&e.position.y===cell.y);
    c.fillStyle=occupied?'rgba(220,96,90,.3)':'rgba(170,227,155,.26)';c.fillRect(point.x,point.y,s,s);
    c.strokeStyle=occupied?'#db8983':'#add89b';c.lineWidth=1;c.strokeRect(point.x+1,point.y+1,s-2,s-2);
   }
  }
 }
 dispose(){this.resizeObserver.disconnect();}
}
