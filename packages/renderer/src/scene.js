import {soilColor,canCultivateCell} from "../../content/src/soil.js";
import {Camera,hitTest,brushCells} from './camera.js';
import {SpriteLibrary,resolveWorldSprite,directionFromDelta} from './sprites.js';
import {createOcclusionResolver} from './occlusion.js';
export class Scene {
 constructor(canvas,{spriteLibrary=new SpriteLibrary()}={}){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.camera=new Camera();
  this.sprites=spriteLibrary;this.sprites.preload();this.world=null;this.motion=new Map();this.facings=new Map();this.selected=null;this.hover=null;this.hoverRoute=null;this.pointer=null;this.brush=null;
  this.resize();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
 }
 resize(){
  const dpr=Math.min(devicePixelRatio||1,2),width=this.canvas.clientWidth||innerWidth,height=this.canvas.clientHeight||innerHeight;
  this.camera.setViewport(width,height);this.canvas.width=Math.round(width*dpr);this.canvas.height=Math.round(height*dpr);
  this.ctx.setTransform(dpr,0,0,dpr,0,0);this.dpr=dpr;
 }
 setWorld(world,{reset=false,paused=false}={}){
  if(!this.world)this.camera.centerOnWorld(world);
  if(reset||paused)this.motion.clear();
  if(this.world?.id!==world.id)this.facings.clear();
  const oldById=new Map(this.world?.entities.map(e=>[e.id,e])??[]);
  const now=performance.now();
  const duration=Math.max(100,Math.min(750,now-(this.lastSample??now-250)));
  this.lastSample=now;
  const ids=new Set(world.entities.map(e=>e.id));
  for(const id of this.motion.keys())if(!ids.has(id))this.motion.delete(id);
  for(const id of this.facings.keys())if(!ids.has(id))this.facings.delete(id);
  for(const entity of world.entities){
   if(entity.kind!=='character'||reset||paused)continue;
   const previous=oldById.get(entity.id);
   if(!previous||previous.position.x===entity.position.x&&previous.position.y===entity.position.y)continue;
   if(Math.abs(previous.position.x-entity.position.x)+Math.abs(previous.position.y-entity.position.y)>1){this.motion.delete(entity.id);continue;}
   const active=this.motion.get(entity.id);
   const progress=active?Math.min(1,(now-active.startedAt)/active.duration):1;
   const from=active&&progress<1?{
    x:active.from.x+(active.to.x-active.from.x)*progress,
    y:active.from.y+(active.to.y-active.from.y)*progress
   }:previous.position;
   this.motion.set(entity.id,{from,to:{...entity.position},startedAt:now,duration});
  }
  this.dropBirth??=new Map();
  for(const e of world.entities)if(e.kind==="item"&&(!oldById.has(e.id)||oldById.get(e.id).quantity<e.quantity))this.dropBirth.set(e.id,now);
  for(const id of this.dropBirth.keys())if(!world.entities.some(e=>e.id===id))this.dropBirth.delete(id);
  this.world=world;
 }
 setSelection(id){this.selected=id;}
 setHover(id){this.hover=id;}
 setRoute(waypoints){this.hoverRoute=Array.isArray(waypoints)?waypoints:null;}
 setBrush(brush){this.brush=brush;}
 pick(x,y){
  if(!this.world)return null;
  const entities=this.world.entities.filter(e=>!e.bodyCarriedBy&&!e.sleepingInId);
  if(!this.positionProvider)return hitTest(entities,this.camera,x,y);
  const now=performance.now(),picked=hitTest(entities.map(e=>e.kind==='character'?{...e,position:this.positionProvider(e,now)}:e),this.camera,x,y);
  return picked?entities.find(e=>e.id===picked.id):null;
 }
 paint(now=0){
  const c=this.ctx,k=this.camera,w=k.width,h=k.height,t=k.tile;
  c.clearRect(0,0,w,h);c.fillStyle='#2c4b38';c.fillRect(0,0,w,h);
  if(!this.world)return;
  const topLeft=k.screenToWorld(0,0),bottomRight=k.screenToWorld(w,h);
  const x0=Math.max(0,Math.floor(topLeft.x/t)-1),y0=Math.max(0,Math.floor(topLeft.y/t)-1);
  const x1=Math.min(this.world.width,Math.ceil(bottomRight.x/t)+1),y1=Math.min(this.world.height,Math.ceil(bottomRight.y/t)+1);
  if(!this.terrainPainter?.(c,k,this.world,{x0,y0,x1,y1}))for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
   const p=k.worldToScreen(x*t,y*t),s=t*k.zoom;
   c.fillStyle=soilColor(this.world,x,y,!!this.soilOverlay);c.fillRect(p.x,p.y,s+.5,s+.5);
   if((x*17+y*23)%29===0&&s>16){c.fillStyle='rgba(191,214,168,.13)';c.fillRect(p.x+s*.6,p.y+s*.29,2,3);}
  }
  // Cultivation zones are passable terrain overlays, drawn before actors and crops.
  for(const zone of this.world.entities.filter(e=>e.kind==='planting_zone')){
   const start=k.worldToScreen(zone.position.x*t,zone.position.y*t),size=t*k.zoom;
   c.fillStyle=this.soilOverlay?'rgba(98,66,36,.12)':'rgba(98,66,36,.39)';
   c.fillRect(start.x,start.y,zone.footprint.width*size,zone.footprint.height*size);
   c.strokeStyle=zone.id===this.selected?'#f6d789':'rgba(200,172,112,.68)';
   c.lineWidth=zone.id===this.selected?3:1.3;
   c.setLineDash([5,4]);c.strokeRect(start.x+1,start.y+1,zone.footprint.width*size-2,zone.footprint.height*size-2);c.setLineDash([]);
   c.strokeStyle='rgba(168,132,88,.23)';c.lineWidth=1;
   for(let yy=1;yy<zone.footprint.height;yy++){const y=start.y+yy*size;c.beginPath();c.moveTo(start.x,y);c.lineTo(start.x+zone.footprint.width*size,y);c.stroke();}
   for(let xx=1;xx<zone.footprint.width;xx++){const x=start.x+xx*size;c.beginPath();c.moveTo(x,start.y);c.lineTo(x,start.y+zone.footprint.height*size);c.stroke();}
  }
  // Completed cemeteries are passable marked plots, rendered under NPCs.
  for(const graveyard of this.world.entities.filter(e=>e.kind==='construction'&&
   e.blueprintId==='building.cemetery'&&e.status==='completed')){
   const start=k.worldToScreen(graveyard.position.x*t,graveyard.position.y*t),size=t*k.zoom;
   const width=graveyard.footprint.width*size,height=graveyard.footprint.height*size;
   const visual=resolveWorldSprite(graveyard);
   const drawn=this.sprites.draw(c,visual.id,start.x+width/2,start.y+height/2,width,visual.state,{height,level:visual.level});
   if(!drawn){
   c.fillStyle='rgba(104,103,75,.5)';c.fillRect(start.x,start.y,width,height);
   c.strokeStyle='#b2aa83';c.lineWidth=2;c.strokeRect(start.x+2,start.y+2,width-4,height-4);
   }
   // Each marker represents a real burial. Keep markers proportional at every level.
   const capacity=[12,24,48][Math.min(2,Math.max(0,(graveyard.level??1)-1))];
   const cols=capacity===48?8:capacity===24?6:4,rows=Math.ceil(capacity/cols);
   const cellW=width*.8/cols,cellH=height*.8/rows,unit=Math.min(cellW,cellH);
   for(let i=0;i<Math.min(graveyard.burials?.length??0,capacity);i++){
    const x=start.x+width*.1+(i%cols+.5)*cellW,y=start.y+height*.1+(Math.floor(i/cols)+.5)*cellH;
    c.fillStyle='#454b42';c.fillRect(x-unit*.27,y-unit*.33,unit*.54,unit*.66);
    c.fillStyle='#a9aaa0';c.fillRect(x-unit*.2,y-unit*.28,unit*.4,unit*.48);
    c.fillStyle='#d6d2b6';c.fillRect(x-unit*.04,y-unit*.22,unit*.08,unit*.28);
    c.fillRect(x-unit*.12,y-unit*.13,unit*.24,unit*.08);
   }
   if(graveyard.id===this.selected){
    c.strokeStyle='#f2e3a7';c.lineWidth=3;c.strokeRect(start.x+2,start.y+2,width-4,height-4);
   }
  }
  const opacityFor=createOcclusionResolver(this.world.entities,e=>this.positionProvider?this.positionProvider(e,now):e.position);
  // Only real entities from /api/world are visualized. No fake houses, stocks or paths.
  const positionFor=e=>this.positionProvider?this.positionProvider(e,now):e.position;
  const visible=this.world.entities.filter(e=>!e.sleepingInId);
  const drawPlan=this.entityPlanner?this.entityPlanner(visible,positionFor,{x0,y0,x1,y1}):
   visible.filter(e=>e.kind!=='item'&&e.kind!=='planting_zone'&&
   !(e.kind==='character'&&e.bodyCarriedBy)&&
   !(e.kind==='construction'&&e.blueprintId==='building.cemetery'&&e.status==='completed')).sort((a,b)=>(a.position.y+(a.kind==='construction'?a.footprint.height:1))-(b.position.y+(b.kind==='construction'?b.footprint.height:1))).map(entity=>({entity,pos:positionFor(entity)}));
  for(const row of drawPlan){
   const e=row.entity;let pos=row.pos;
   if(e.kind==='character'&&!this.positionProvider){
    const animation=this.motion.get(e.id);
    if(animation){
     const alpha=Math.min(1,(now-animation.startedAt)/animation.duration);
     const eased=alpha;
     pos={x:animation.from.x+(animation.to.x-animation.from.x)*eased,
      y:animation.from.y+(animation.to.y-animation.from.y)*eased};
     if(alpha>=1)this.motion.delete(e.id);
    }
   }
   const p=k.worldToScreen((pos.x+(e.kind==='construction'?e.footprint.width/2:.5))*t,
     (pos.y+(e.kind==='construction'?e.footprint.height/2:.5))*t),s=t*k.zoom;
   if(!this.entityPlanner&&(p.x<-s||p.y<-s||p.x>w+s||p.y>h+s))continue;
   let direction,movingVisually=false;
   if(e.kind==='character'){
    const prior=this.positionProvider?this.positionProvider(e,now-16):this.motion.get(e.id)?.from??pos;
    const later=this.positionProvider?this.positionProvider(e,now+16):this.motion.get(e.id)?.to??pos;
    const observed=directionFromDelta(later.x-prior.x,later.y-prior.y);
    movingVisually=!!observed;
    const m=e.movementSegment;
    direction=observed??this.facings.get(e.id)??(m&&directionFromDelta(m.to.x-m.from.x,m.to.y-m.from.y))??'south';
    this.facings.set(e.id,direction);
   }
   const visual=resolveWorldSprite(e,{movingVisually,direction});
   c.save();c.globalAlpha*=opacityFor(e);
   if(e.kind==='construction'&&e.status==='site'){
    c.strokeStyle='rgba(214,187,130,.65)';c.lineWidth=1;c.setLineDash([4,3]);
    c.strokeRect(p.x-s*e.footprint.width/2,p.y-s*e.footprint.height/2,s*e.footprint.width,s*e.footprint.height);c.setLineDash([]);
   }
   const drawn=visual&&this.sprites.draw(c,visual.id,p.x,p.y,e.kind==='construction'?s*e.footprint.width:s*visual.scale,visual.state,e.kind==='construction'?{height:s*e.footprint.height,level:visual.level,fit:'contain'}:{direction:visual.direction,now});
   if(!drawn){
    c.save();c.translate(p.x,p.y);
    if(e.kind==='construction'){
     const width=s*e.footprint.width,height=s*e.footprint.height;
     const left=-width/2,top=-height/2,phase=e.status==='destroyed'?-1:e.status==='completed'?4:e.stageIndex;
     c.fillStyle='rgba(13,29,21,.22)';c.fillRect(left+s*.06,top+s*.15,width-s*.12,height-s*.19);
     if(phase===-1){
      c.fillStyle='#6b7772';c.fillRect(left+s*.12,top+s*.35,width-s*.24,height-s*.48);
      c.fillStyle='#9a9482';
      for(let i=0;i<8;i++){
       const xx=left+s*(.16+(i%4)*.4),yy=top+s*(.45+Math.floor(i/4)*.5);
       c.fillRect(xx,yy,s*.22,s*.18);
      }
      c.strokeStyle='#c5a78f';c.lineWidth=Math.max(1,s*.03);
      c.strokeRect(left+s*.08,top+s*.13,width-s*.16,height-s*.20);
     }else{
     // Per-stage, geometry-only placeholder for the eventual registered sprites.
     c.strokeStyle='#d6bb82';c.lineWidth=Math.max(2,s*.04);
     c.strokeRect(left+s*.06,top+s*.08,width-s*.12,height-s*.16);
     c.strokeStyle='#bdac7f';c.lineWidth=Math.max(1,s*.025);
     c.setLineDash([s*.12,s*.09]);c.strokeRect(left+s*.14,top+s*.16,width-s*.28,height-s*.32);c.setLineDash([]);
     if(phase>=1){
      c.fillStyle='#a29d80';c.fillRect(left+s*.10,top+s*.10,width-s*.20,height-s*.20);
      c.fillStyle='#777f69';c.fillRect(left+s*.22,top+s*.22,width-s*.44,height-s*.44);
     }
     if(phase>=2){
      c.fillStyle='#9b8060';
      for(const xx of [left+s*.12,left+width-s*.25])for(const yy of [top+s*.12,top+height-s*.25])c.fillRect(xx,yy,s*.13,s*.13);
      c.strokeStyle='#c1a071';c.lineWidth=s*.055;c.beginPath();
      c.moveTo(left+s*.15,top+s*.15);c.lineTo(left+width-s*.15,top+height-s*.15);
      c.moveTo(left+width-s*.15,top+s*.15);c.lineTo(left+s*.15,top+height-s*.15);c.stroke();
     }
     if(phase>=3){
      c.fillStyle=phase===4?'#a46c4e':'#96765b';
      c.beginPath();c.moveTo(left+s*.06,top+height*.46);c.lineTo(0,top-s*.23);
      c.lineTo(left+width-s*.06,top+height*.46);c.closePath();c.fill();
      c.beginPath();c.moveTo(left+s*.1,top+height*.48);c.lineTo(left+s*.1,top+height-s*.12);
      c.lineTo(left+width-s*.1,top+height-s*.12);c.lineTo(left+width-s*.1,top+height*.48);c.closePath();c.fill();
     }
     if(phase===4){
      c.fillStyle='#594737';c.fillRect(-s*.17,top+height*.49,s*.34,height*.42);
      c.fillStyle='#d9c89b';c.fillRect(-s*.06,top+height*.59,s*.06,s*.09);
      if(e.blueprintId==='building.workshop'){
       // Temporary top-down forge/bellows marker; later replace with a sprite atlas.
       c.fillStyle='#52635a';c.fillRect(left+s*.32,top+height*.18,s*.9,s*.75);
       c.strokeStyle='#a8b4a0';c.lineWidth=Math.max(1,s*.04);
       c.strokeRect(left+s*.32,top+height*.18,s*.9,s*.75);
       c.fillStyle='#e8a868';c.fillRect(left+s*.52,top+height*.37,s*.48,s*.28);
       c.fillStyle='#d9c39a';c.fillRect(left+width-s*.95,top+height*.19,s*.67,s*.25);
       c.fillStyle='#9d8670';c.fillRect(left+width-s*.78,top+height*.41,s*.38,s*.52);
      }
      if(e.blueprintId==='building.depot'){
       c.fillStyle='#d8b277';c.fillRect(left+s*.12,top+height*.65,s*.32,s*.32);
       c.fillRect(left+width-s*.44,top+height*.65,s*.32,s*.32);
       c.strokeStyle='#6a4b36';c.lineWidth=Math.max(1,s*.035);
       c.strokeRect(left+s*.12,top+height*.65,s*.32,s*.32);
       c.strokeRect(left+width-s*.44,top+height*.65,s*.32,s*.32);
       c.strokeRect(left+s*.17,top+height*.7,s*.22,s*.22);
       c.strokeRect(left+width-s*.39,top+height*.7,s*.22,s*.22);
      }
     }
     }
    }else if(e.kind==='character'&&e.health<=0){
     c.fillStyle='#ece4cc';c.font='bold '+Math.max(20,s*.64)+'px serif';
     c.textAlign='center';c.textBaseline='middle';c.fillText('☠',0,1);
    }else if(e.kind==='character'){
     c.beginPath();c.arc(0,0,Math.max(7,s*.28),0,Math.PI*2);c.fillStyle=e.ownerId?'#e5d19e':'#d6c091';c.fill();
     c.strokeStyle='rgba(35,42,26,.7)';c.lineWidth=1.5;c.stroke();
     c.fillStyle='#29342a';c.font='bold '+Math.max(10,s*.29)+'px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText((e.name||'?').charAt(0).toUpperCase(),0,1);
    }else if(e.kind==='obstacle'){
     c.lineWidth=Math.max(1,s*.025);c.strokeStyle='#283c33';
     if(e.obstacleType==='wall'){
      c.fillStyle='#87968e';c.fillRect(-s*.43,-s*.29,s*.86,s*.59);c.strokeRect(-s*.43,-s*.29,s*.86,s*.59);
      c.strokeStyle='#5b7068';c.beginPath();c.moveTo(-s*.43,0);c.lineTo(s*.43,0);c.moveTo(0,-s*.29);c.lineTo(0,0);c.moveTo(-s*.20,0);c.lineTo(-s*.20,s*.29);c.moveTo(s*.22,0);c.lineTo(s*.22,s*.29);c.stroke();
     }else if(e.obstacleType==='statue'){
      c.fillStyle='#a8b8ae';c.fillRect(-s*.3,s*.05,s*.6,s*.23);c.fillStyle='#839a8d';c.fillRect(-s*.19,-s*.15,s*.38,s*.22);
      c.beginPath();c.arc(0,-s*.25,s*.15,0,Math.PI*2);c.fill();
     }else{
      c.fillStyle='#8a9993';c.beginPath();c.moveTo(-s*.37,s*.17);c.lineTo(-s*.3,-s*.12);c.lineTo(-s*.10,-s*.34);c.lineTo(s*.25,-s*.24);c.lineTo(s*.39,s*.16);c.lineTo(s*.12,s*.29);c.lineTo(-s*.31,s*.25);c.closePath();c.fill();c.stroke();
      c.fillStyle='#b3bfb6';c.beginPath();c.moveTo(-s*.3,-s*.12);c.lineTo(-s*.1,-s*.3);c.lineTo(s*.18,-s*.2);c.lineTo(0,0);c.closePath();c.fill();
     }
    }else if(e.kind==='resource'&&(e.sourceId==='carrot'||e.sourceId==='potato'||e.sourceId==='medicinal_herb')){
     const herb=e.sourceId==='medicinal_herb',potato=e.sourceId==='potato',stage=e.life?.stage??'seedling';
     const mature=stage==='mature'||stage==='old',height=stage==='seedling'?.12:stage==='young'?.25:.34;
     const count=mature?(potato?3:4):stage==='young'?2:1;
     c.strokeStyle='#345d31';c.lineWidth=Math.max(1,s*.035);
     c.fillStyle=herb?'#57b99a':potato?'#84ad65':'#79b26b';
     for(let i=0;i<count;i++){
      const x=(i-(count-1)/2)*s*.12,y=(i%2)*s*.045;
      c.beginPath();c.moveTo(x,s*.22);c.quadraticCurveTo(x-s*.08,y-s*height,x-s*.04,y-s*height);c.stroke();
      c.beginPath();c.ellipse(x-s*.06,y-s*height,s*.07,s*.035,-.5,0,Math.PI*2);c.fill();
      c.beginPath();c.ellipse(x+s*.04,y-s*height*.76,s*.07,s*.035,.6,0,Math.PI*2);c.fill();
     }
     if(mature){
      c.fillStyle=herb?'#c29ade':potato?'#c5ac76':'#e88a43';
      for(let i=0;i<(potato?3:2);i++){
       const x=(i-1)*s*.13;
       c.beginPath();c.ellipse(x,herb?-s*.3:s*.19,herb?s*.05:s*.085,herb?s*.05:s*.09,0,0,Math.PI*2);c.fill();
      }
     }
     if(stage==='old'){c.fillStyle='rgba(97,67,38,.4)';c.fillRect(-s*.3,-s*.25,s*.6,s*.54);}
    }else if(e.resourceType==='wood'){
     c.fillStyle='#6b8f65';c.beginPath();c.arc(-s*.09,0,s*.22,0,Math.PI*2);c.arc(s*.1,-s*.07,s*.22,0,Math.PI*2);c.fill();
     c.fillStyle='#9f8464';c.fillRect(-s*.035,s*.13,s*.07,s*.17);
    }else if(e.resourceType==='iron_ore'||e.resourceType==='copper_ore'){
     c.fillStyle=e.resourceType==='iron_ore'?'#6f8290':'#bc845f';
     c.beginPath();c.moveTo(-s*.29,s*.2);c.lineTo(-s*.2,-s*.21);
     c.lineTo(s*.04,-s*.29);c.lineTo(s*.3,-s*.06);
     c.lineTo(s*.23,s*.25);c.closePath();c.fill();
     c.fillStyle=e.resourceType==='iron_ore'?'#b6c3cb':'#dcb08d';
     c.fillRect(-s*.1,-s*.14,s*.13,s*.1);c.fillRect(s*.07,s*.03,s*.1,s*.14);
    }else if(e.resourceType==='stone'){
     c.fillStyle='#a6b0a7';c.beginPath();c.moveTo(-s*.26,s*.16);c.lineTo(-s*.16,-s*.18);c.lineTo(s*.12,-s*.26);c.lineTo(s*.27,s*.07);c.lineTo(s*.14,s*.22);c.closePath();c.fill();
    }else{
     c.fillStyle='#d5bb75';for(let i=0;i<3;i++){c.beginPath();c.arc((i-1)*s*.13,(i%2)*s*.1,s*.095,0,Math.PI*2);c.fill();}
    }
    if(e.kind==='resource'&&e.quantity===0){c.fillStyle='rgba(30,45,33,.58)';c.fillRect(-s*.3,-s*.3,s*.6,s*.6);}
    c.restore();
   }
   c.restore();
   if(e.id===this.hover||e.id===this.selected){
    c.beginPath();
    if(e.kind==='construction')c.rect(p.x-s*e.footprint.width/2,p.y-s*e.footprint.height/2,s*e.footprint.width,s*e.footprint.height);
    else c.arc(p.x,p.y,s*.4,0,Math.PI*2);
    c.strokeStyle=e.id===this.selected?'#f2e3a7':'rgba(241,251,225,.75)';c.lineWidth=e.id===this.selected?2.7:1.5;c.stroke();
   }
  }
  // Ground stacks are rendered above the terrain with a short drop bounce and persistent glint.
  const groups=new Map();
  for(const item of this.world.entities.filter(e=>e.kind==='item')){
   const key=item.position.x+','+item.position.y;
   if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);
  }
  const colors={wood:'#b68a58',stone:'#bac2c4',iron_ore:'#8ea6b7',copper_ore:'#d69a68',apple:'#e36d65',carrot:'#ef9e49',potato:'#cfb17b',medicinal_herb:'#69c6a2'};
  for(const items of groups.values())items.sort((a,b)=>a.itemId.localeCompare(b.itemId)).forEach((e,i)=>{
   const p=k.worldToScreen((e.position.x+.5)*t,(e.position.y+.5)*t),s=t*k.zoom;
   const x=p.x+(i%3-1)*s*.25,y=p.y+s*.23+Math.floor(i/3)*s*.18;
   const age=Math.max(0,now-(this.dropBirth?.get(e.id)??now)),bounce=age<550?Math.sin(age/550*Math.PI)*s*.3:0;
   const radius=Math.max(4,s*.12),pulse=.6+.4*Math.sin(now/240+i);
   c.save();c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(x,y+radius*.5,radius*1.2,radius*.45,0,0,Math.PI*2);c.fill();
   c.shadowBlur=7+pulse*5;c.shadowColor='#e7d48e';c.fillStyle=colors[e.itemId]??'#b8d68a';
   c.strokeStyle='#f6e5b3';c.lineWidth=1.2;c.beginPath();c.arc(x,y-bounce,radius,0,Math.PI*2);c.fill();c.stroke();c.shadowBlur=0;
   if(s>22){c.font='bold '+Math.max(9,s*.19)+'px system-ui';c.textAlign='center';c.fillStyle='#fff3cc';c.fillText(String(e.quantity),x,y-bounce-radius-3);}
   c.restore();
  });
  if(this.hover&&this.hoverRoute?.length>1){
   c.beginPath();
   this.hoverRoute.forEach((point,i)=>{
    const p=k.worldToScreen((point.x+.5)*t,(point.y+.5)*t);
    if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);
   });
   c.setLineDash([5,5]);c.strokeStyle='#e9dca2';c.lineWidth=2;c.stroke();c.setLineDash([]);
  }
  if(this.brush&&this.pointer){
   const center=k.tileAt(this.pointer.x,this.pointer.y),cells=brushCells(center,this.brush.size,this.world,this.brush.shape);
   for(const anchor of ['house','farm'].includes(this.brush.kind)?[center]:cells) {
    const width=this.brush.kind==='house'?(this.brush.footprint?.width??2):
     this.brush.kind==='farm'?this.brush.size:1;
    const height=this.brush.kind==='house'?(this.brush.footprint?.height??2):width;
    let blocked=false;
    for(let y=anchor.y;y<anchor.y+height;y++)for(let x=anchor.x;x<anchor.x+width;x++){
     if(x<0||y<0||x>=this.world.width||y>=this.world.height||
      (['farm','food'].includes(this.brush.kind)&&!canCultivateCell(this.world,x,y))||
      this.world.entities.some(e=>e.kind==='planting_zone'?
       (this.brush.kind==='farm'&&x>=e.position.x&&x<e.position.x+e.footprint.width&&y>=e.position.y&&y<e.position.y+e.footprint.height):
       (this.brush.kind==='farm'&&e.kind==='character')?false:e.kind==='construction'?
       x>=e.position.x&&x<e.position.x+e.footprint.width&&y>=e.position.y&&y<e.position.y+e.footprint.height:
       e.position.x===x&&e.position.y===y))blocked=true;
    }
    const point=k.worldToScreen(anchor.x*t,anchor.y*t),s=t*k.zoom;
    c.fillStyle=blocked?'rgba(220,96,90,.3)':this.brush.kind==='farm'?'rgba(151,108,60,.46)':'rgba(170,227,155,.26)';
    c.fillRect(point.x,point.y,s*width,s*height);
    c.strokeStyle=blocked?'#db8983':'#add89b';c.lineWidth=1;c.strokeRect(point.x+1,point.y+1,s*width-2,s*height-2);
   }
  }
 }
 dispose(){this.resizeObserver.disconnect();}
}
