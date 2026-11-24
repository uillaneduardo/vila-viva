/** Static procedural terrain cache, independent of engine and camera implementation. */
export function drawTerrainCells(ctx,x0,y0,x1,y1,tile,originX=0,originY=0,detail=true){
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
  const px=(x-originX)*tile,py=(y-originY)*tile;
  ctx.fillStyle=(x+y)%2?'#30523d':'#335640';ctx.fillRect(px,py,tile+.5,tile+.5);
  if(detail&&(x*17+y*23)%29===0){ctx.fillStyle='rgba(191,214,168,.13)';ctx.fillRect(px+tile*.6,py+tile*.29,2,3);}
 }
}
export class TerrainCache{
 constructor({chunk=8,capacity=64,createCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;}}={}){
  this.chunk=chunk;this.capacity=capacity;this.createCanvas=createCanvas;this.cache=new Map();this.hits=0;this.misses=0;
 }
 clear(){this.cache.clear();}
 get(cx,cy,width,height,tile,detail){
  const key=[cx,cy,width,height,tile,detail].join(':');
  if(this.cache.has(key)){const value=this.cache.get(key);this.cache.delete(key);this.cache.set(key,value);this.hits++;return value;}
  const x=cx*this.chunk,y=cy*this.chunk,nx=Math.min(this.chunk,width-x),ny=Math.min(this.chunk,height-y);
  if(nx<=0||ny<=0)return null;
  const canvas=this.createCanvas(nx*tile,ny*tile),ctx=canvas?.getContext('2d');
  if(!ctx)return null;
  drawTerrainCells(ctx,x,y,x+nx,y+ny,tile,x,y,detail);
  const value={canvas,x,y,nx,ny};this.cache.set(key,value);this.misses++;
  while(this.cache.size>this.capacity)this.cache.delete(this.cache.keys().next().value);
  return value;
 }
 paint(ctx,camera,world,{x0,y0,x1,y1}){
  const s=camera.tile*camera.zoom;
  // Keep raster tiles integral and bounded; detail flag matches the original zoom threshold.
  const raster=Math.max(1,Math.round(camera.tile)),detail=s>16;
  for(let cy=Math.floor(y0/this.chunk);cy<Math.ceil(y1/this.chunk);cy++)for(let cx=Math.floor(x0/this.chunk);cx<Math.ceil(x1/this.chunk);cx++){
   const v=this.get(cx,cy,world.width,world.height,raster,detail);
   if(!v)return false;
   const p=camera.worldToScreen(v.x*camera.tile,v.y*camera.tile);
   ctx.drawImage(v.canvas,p.x,p.y,v.nx*s,v.ny*s);
  }
  return true;
 }
}
