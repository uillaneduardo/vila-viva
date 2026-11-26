/** Immutable procedural terrain. Version 1 uses continuous patches; legacy worlds are neutral. */
export const SOIL_TYPES=Object.freeze([
 Object.freeze({id:'arid',label:'Arenoso',rate:50,color:'#85704b',overlay:'#b99a60'}),
 Object.freeze({id:'poor',label:'Solo pobre',rate:75,color:'#656044',overlay:'#a58b5e'}),
 Object.freeze({id:'normal',label:'Solo comum',rate:100,color:'#335640',overlay:'#7c9560'}),
 Object.freeze({id:'fertile',label:'Solo fértil',rate:125,color:'#3b6244',overlay:'#55965b'}),
 Object.freeze({id:'rich',label:'Solo muito fértil',rate:150,color:'#28583d',overlay:'#286b40'})
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
  data[y*world.width+x]=n<.24?0:n<.40?1:n<.60?2:n<.76?3:4;
 }
 maps.set(key,data);if(maps.size>4)maps.delete(maps.keys().next().value);return data;
}
export function soilAt(world,x,y){
 if(x<0||y<0||x>=world.width||y>=world.height||!Number.isInteger(x)||!Number.isInteger(y))return SOIL_TYPES[2];
 const key=soilKey(world);return key==='legacy'?SOIL_TYPES[2]:SOIL_TYPES[grid(world,key)[y*world.width+x]];
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
