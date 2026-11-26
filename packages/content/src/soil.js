/** Immutable procedural terrain. Version 1 uses continuous patches; legacy worlds are neutral. */
export const SOIL_TYPES=Object.freeze([
 Object.freeze({id:'barren',label:'Solo estéril / rochoso',rate:0,plantable:false,color:'#77736b',overlay:'#b65d53'}),
 Object.freeze({id:'arid',label:'Arenoso',rate:50,plantable:true,color:'#85704b',overlay:'#b99a60'}),
 Object.freeze({id:'poor',label:'Solo pobre',rate:75,plantable:true,color:'#656044',overlay:'#a58b5e'}),
 Object.freeze({id:'normal',label:'Solo comum',rate:100,plantable:true,color:'#335640',overlay:'#7c9560'}),
 Object.freeze({id:'fertile',label:'Solo fértil',rate:125,plantable:true,color:'#3b6244',overlay:'#55965b'}),
 Object.freeze({id:'rich',label:'Solo muito fértil',rate:150,plantable:true,color:'#28583d',overlay:'#286b40'})
]);
export const SOIL_VERSION=1;
const maps=new Map();
function hash(text){let n=2166136261;for(const ch of text)n=Math.imul(n^ch.charCodeAt(0),16777619);return n>>>0;}
function lattice(seed,x,y){
 let n=(seed^Math.imul(x,0x9e3779b1)^Math.imul(y,0x85ebca77))>>>0;
 n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return ((n^(n>>>16))>>>0)/4294967296;
}
const smooth=t=>t*t*(3-2*t);
const mix=(a,b,t)=>a+(b-a)*t;
function noise(seed,x,y,scale){
 const gx=Math.floor(x/scale),gy=Math.floor(y/scale),u=smooth(x/scale-gx),v=smooth(y/scale-gy);
 return mix(mix(lattice(seed,gx,gy),lattice(seed,gx+1,gy),u),mix(lattice(seed,gx,gy+1),lattice(seed,gx+1,gy+1),u),v);
}
export const soilKey=world=>world?.soilVersion===SOIL_VERSION&&typeof world.seed==='string'&&world.seed.length?JSON.stringify([SOIL_VERSION,world.seed,world.width,world.height]):'legacy';
function grid(world,key){
 if(maps.has(key)){const data=maps.get(key);maps.delete(key);maps.set(key,data);return data;}
 const seed=hash('soil-v1:'+world.seed),data=new Uint8Array(world.width*world.height);
 for(let y=0;y<world.height;y++)for(let x=0;x<world.width;x++){
  const n=noise(seed,x,y,6)*.8+noise(seed^0x1234abcd,x,y,13)*.2;
  data[y*world.width+x]=n<.28?0:n<.39?1:n<.48?2:n<.60?3:n<.72?4:5;
 }
 // Extremely barren rolls still need a viable starter area. Only repair the central
 // patch if there is no cultivable 3x3 nearby or too little soil for initial trees.
 const cx=Math.floor(world.width/2),cy=Math.floor(world.height/2);
 let nearby=false,usable=0,central=0;
 for(let y=Math.max(0,cy-4);y<Math.min(world.height,cy+4);y++)for(let x=Math.max(0,cx-4);x<Math.min(world.width,cx+4);x++)if(data[y*world.width+x]>0)central++;
 for(const value of data)if(value>0)usable++;
 for(let y=Math.max(0,cy-5);y<=Math.min(world.height-3,cy+3)&&!nearby;y++)
  for(let x=Math.max(0,cx-5);x<=Math.min(world.width-3,cx+3)&&!nearby;x++){
   let valid=true;for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++)if(data[(y+dy)*world.width+x+dx]===0)valid=false;
   if(valid)nearby=true;
  }
 if(!nearby||usable<64||central<24){
  for(let y=Math.max(0,cy-4);y<Math.min(world.height,cy+4);y++)
   for(let x=Math.max(0,cx-4);x<Math.min(world.width,cx+4);x++)
    if(data[y*world.width+x]===0)data[y*world.width+x]=2;
 }
 maps.set(key,data);if(maps.size>4)maps.delete(maps.keys().next().value);return data;
}
export function soilAt(world,x,y){
 if(x<0||y<0||x>=world.width||y>=world.height||!Number.isInteger(x)||!Number.isInteger(y))return SOIL_TYPES[3];
 const key=soilKey(world);return key==='legacy'?SOIL_TYPES[3]:SOIL_TYPES[grid(world,key)[y*world.width+x]];
}
export function canCultivateCell(world,x,y){
 return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<world.width&&y<world.height&&soilAt(world,x,y).plantable;
}
export function canCultivateArea(world,position,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)return false;
 for(let y=position.y;y<position.y+height;y++)for(let x=position.x;x<position.x+width;x++)
  if(!canCultivateCell(world,x,y))return false;
 return true;
}
export function averageFertility(world,position,width,height){
 let sum=0;for(let y=position.y;y<position.y+height;y++)for(let x=position.x;x<position.x+width;x++)sum+=soilAt(world,x,y).rate;
 return sum/(width*height);
}
export function soilColor(world,x,y,overlay=false){
 if(overlay)return soilAt(world,x,y).overlay;
 if(soilKey(world)==='legacy')return (x+y)%2?'#30523d':'#335640';
 return soilAt(world,x,y).color;
}
