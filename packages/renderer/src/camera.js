export class Camera {
 constructor(tile=42){this.tile=tile;this.zoom=1;this.center={x:0,y:0};this.width=1;this.height=1;}
 setViewport(width,height){this.width=Math.max(1,width);this.height=Math.max(1,height);}
 centerOnWorld(world){this.center={x:world.width*this.tile/2,y:world.height*this.tile/2};}
 worldToScreen(x,y){return {x:(x-this.center.x)*this.zoom+this.width/2,y:(y-this.center.y)*this.zoom+this.height/2};}
 screenToWorld(x,y){return {x:(x-this.width/2)/this.zoom+this.center.x,y:(y-this.height/2)/this.zoom+this.center.y};}
 tileAt(x,y){const p=this.screenToWorld(x,y);return {x:Math.floor(p.x/this.tile),y:Math.floor(p.y/this.tile)};}
 pan(dx,dy){this.center.x-=dx/this.zoom;this.center.y-=dy/this.zoom;}
 zoomAt(x,y,factor){const before=this.screenToWorld(x,y);this.zoom=Math.max(.45,Math.min(2.6,this.zoom*factor));const after=this.screenToWorld(x,y);this.center.x+=before.x-after.x;this.center.y+=before.y-after.y;}
}
export function hitTest(entities,camera,screenX,screenY){
 const p=camera.screenToWorld(screenX,screenY);
 const stacks=entities.filter(e=>e.kind==='item'&&e.position.x===Math.floor(p.x/camera.tile)&&e.position.y===Math.floor(p.y/camera.tile)).sort((a,b)=>a.itemId.localeCompare(b.itemId));
 for(let i=0;i<stacks.length;i++){const e=stacks[i],x=(e.position.x+.5+(i%3-1)*.25)*camera.tile,y=(e.position.y+.73+Math.floor(i/3)*.18)*camera.tile;if(Math.hypot(x-p.x,y-p.y)<camera.tile*.16)return e;}
 let result=null,distance=Infinity;
 for(const e of entities){
  if(e.kind==='item')continue;
  if(e.kind==='planting_zone'){
   const x0=e.position.x*camera.tile,y0=e.position.y*camera.tile;
   const x1=x0+e.footprint.width*camera.tile,y1=y0+e.footprint.height*camera.tile;
   if(p.x>=x0&&p.x<x1&&p.y>=y0&&p.y<y1&&result===null)result=e;
   continue;
  }
  if(e.kind==='construction'){
   const x0=e.position.x*camera.tile,y0=e.position.y*camera.tile;
   const x1=x0+e.footprint.width*camera.tile,y1=y0+e.footprint.height*camera.tile;
   if(p.x>=x0&&p.x<x1&&p.y>=y0&&p.y<y1){
    const passableCemetery=e.blueprintId==='building.cemetery'&&e.status==='completed';
    if(!passableCemetery||distance>camera.tile){result=e;distance=passableCemetery?camera.tile:0;}
   }
   continue;
  }
  const x=(e.position.x+.5)*camera.tile,y=(e.position.y+.5)*camera.tile;
  const d=Math.hypot(x-p.x,y-p.y),radius=camera.tile*(e.kind==='character'?.43:.46);
  if(d<radius&&d<distance){result=e;distance=d;}
 }
 return result;
}
export function brushCells(center,size,world,shape='square'){
 const n=Math.max(1,Math.min(15,Math.floor(size))),offset=Math.floor(n/2),cells=[];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const cx=center.x+x-offset,cy=center.y+y-offset;
  if(shape==='circle'&&Math.hypot(x-(n-1)/2,y-(n-1)/2)>n/2)continue;
  if(cx>=0&&cy>=0&&cx<world.width&&cy<world.height)cells.push({x:cx,y:cy});
 }
 return cells;
}
