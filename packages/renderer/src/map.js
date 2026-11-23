const TILE=18;
export function createMap(canvas,getState,onSelect,onPlace,onCoords){
 const ctx=canvas.getContext("2d");
 let W=0,H=0,scale=1,offsetX=0,offsetY=0,down=null,frame=0,last=performance.now();
 const resize=()=>{const r=canvas.getBoundingClientRect();W=r.width;H=r.height;const ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*ratio);canvas.height=Math.round(H*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);};
 const worldPoint=(x,y)=>({x:(x-W/2-offsetX)/(TILE*scale)+32,y:(y-H/2-offsetY)/(TILE*scale)+24});
 const screenPoint=(x,y)=>({x:(x-32)*TILE*scale+W/2+offsetX,y:(y-24)*TILE*scale+H/2+offsetY});
 const hash=(x,y)=>{let n=(x*374761393+y*668265263)|0;n=(n^(n>>>13))*1274126177;return ((n^(n>>>16))>>>0)%100};
 function draw(t){
  const dt=Math.min((t-last)/1000,.05);last=t;const state=getState();if(!state.paused){for(const n of state.npc){n.dx+=dt*(Math.sin(t/2300+n.x*2)*.38)*state.speed;n.dy+=dt*(Math.cos(t/2800+n.y)*.30)*state.speed;n.dx=Math.max(-1.2,Math.min(1.2,n.dx));n.dy=Math.max(-1.2,Math.min(1.2,n.dy));}}
  ctx.clearRect(0,0,W,H);ctx.fillStyle="#193422";ctx.fillRect(0,0,W,H);
  const tl=worldPoint(0,0),br=worldPoint(W,H);
  for(let y=Math.max(0,Math.floor(tl.y)-1);y<Math.min(48,Math.ceil(br.y)+1);y++)for(let x=Math.max(0,Math.floor(tl.x)-1);x<Math.min(64,Math.ceil(br.x)+1);x++){const p=screenPoint(x,y),s=TILE*scale,v=hash(x,y);ctx.fillStyle=v<12?"#2f5b37":v<38?"#305e3b":v<70?"#36643e":"#3d6941";ctx.fillRect(p.x,p.y,s+.5,s+.5);if(v>95){ctx.fillStyle="#688c55";ctx.fillRect(p.x+s*.35,p.y+s*.35,s*.17,s*.14)}}
  const center=screenPoint(32,24);ctx.strokeStyle="#85b58b44";ctx.lineWidth=1;ctx.strokeRect(center.x-32*TILE*scale,center.y-24*TILE*scale,64*TILE*scale,48*TILE*scale);
  for(const r of state.resource){const p=screenPoint(r.x,r.y),s=TILE*scale;ctx.fillStyle="#183c2a";ctx.beginPath();ctx.ellipse(p.x+s/2,p.y+s*.78,s*.65,s*.28,0,0,7);ctx.fill();ctx.fillStyle="#235939";ctx.beginPath();ctx.arc(p.x+s/2,p.y+s*.33,s*.58,0,7);ctx.fill();ctx.fillStyle="#71a66b";ctx.beginPath();ctx.arc(p.x+s*.44,p.y+s*.26,s*.4,0,7);ctx.fill();}
  for(const b of state.building){const p=screenPoint(b.x,b.y),s=TILE*scale;ctx.fillStyle="#886b4c";ctx.fillRect(p.x-s*.4,p.y-s*.3,s*2.1,s*1.8);ctx.fillStyle=b.progress===100?"#a57e5d":"#aa8d6b";ctx.beginPath();ctx.moveTo(p.x-s*.55,p.y-s*.3);ctx.lineTo(p.x+s*.55,p.y-s*1.2);ctx.lineTo(p.x+s*1.85,p.y-s*.3);ctx.closePath();ctx.fill();ctx.fillStyle="#d0b58a";ctx.fillRect(p.x+s*.35,p.y+s*.45,s*.35,s*.65);}
  for(const n of state.npc){const p=screenPoint(n.x+n.dx,n.y+n.dy),s=TILE*scale;ctx.fillStyle="#102a1bd0";ctx.beginPath();ctx.ellipse(p.x+s*.5,p.y+s*.9,s*.42,s*.17,0,0,7);ctx.fill();ctx.fillStyle="#d9b982";ctx.beginPath();ctx.arc(p.x+s*.5,p.y+s*.33,s*.28,0,7);ctx.fill();ctx.fillStyle="#d3c4a5";ctx.fillRect(p.x+s*.32,p.y+s*.55,s*.36,s*.33);}
  if(state.selected){const e=state.selected;const p=screenPoint(e.x+(e.dx||0),e.y+(e.dy||0));ctx.strokeStyle="#f4e2a5";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x+TILE*scale*.5,p.y+TILE*scale*.6,TILE*scale*.68,TILE*scale*.52,0,0,7);ctx.stroke();}
  frame=requestAnimationFrame(draw);
 }
 const pos=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
 canvas.addEventListener("pointerdown",e=>{const p=pos(e);down={...p,ox:offsetX,oy:offsetY,moved:false};canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener("pointermove",e=>{const p=pos(e);const w=worldPoint(p.x,p.y);onCoords(Math.floor(w.x),Math.floor(w.y));if(down){const dx=p.x-down.x,dy=p.y-down.y;if(Math.abs(dx)+Math.abs(dy)>5)down.moved=true;offsetX=down.ox+dx;offsetY=down.oy+dy;}});
 canvas.addEventListener("pointerup",e=>{if(!down)return;const moved=down.moved;down=null;if(moved)return;const p=pos(e),w=worldPoint(p.x,p.y),s=getState();if(w.x<0||w.x>64||w.y<0||w.y>48)return;if(s.tool!=="inspect"){onPlace(w);return;}const all=[...s.npc,...s.building,...s.resource];let closest=null,distance=2.3;for(const item of all){const d=Math.hypot(item.x+(item.dx||0)-w.x,item.y+(item.dy||0)-w.y);if(d<distance){distance=d;closest=item;}}onSelect(closest)});
 canvas.addEventListener("pointercancel",()=>{down=null});
 canvas.addEventListener("wheel",e=>{e.preventDefault();zoom(e.deltaY<0?1.13:.88)},{passive:false});
 function zoom(f){scale=Math.max(.55,Math.min(2.8,scale*f));}
 resize();window.addEventListener("resize",resize);frame=requestAnimationFrame(draw);
 return {zoom,reset:()=>{scale=1;offsetX=0;offsetY=0},destroy:()=>{cancelAnimationFrame(frame);window.removeEventListener("resize",resize)}};
}
