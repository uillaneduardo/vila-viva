import {t,localizeDOM} from "../../packages/i18n/src/index.js";
const $=id=>document.getElementById(id);
const isAdmin=document.body.dataset.role==="admin";
const role=isAdmin?"admin":"player";
let catalog=null,state=null,selected=null,cursor={x:5,y:5},busy=false;
const tile=28,canvas=$("map"),ctx=canvas.getContext("2d");
const reason=code=>{try{return t("error."+code);}catch{return code;}};
const request=async(path,options)=>{const response=await fetch(path,options);const data=await response.json();if(!response.ok&& !data.result)throw Error(data.error||"Falha de rede");return data;};
const coordinates=(event)=>{const rect=canvas.getBoundingClientRect(),scale=canvas.width/rect.width;return {x:Math.floor((event.clientX-rect.left)*scale/tile),y:Math.floor((event.clientY-rect.top)*scale/tile)};};
function paint(){
 if(!state)return;
 const w=state.world;canvas.width=w.width*tile;canvas.height=w.height*tile;
 ctx.fillStyle="#173026";ctx.fillRect(0,0,canvas.width,canvas.height);
 for(let y=0;y<w.height;y++)for(let x=0;x<w.width;x++){
  ctx.fillStyle=(x+y)%2===0?"#31533b":"#345940";ctx.fillRect(x*tile,y*tile,tile-1,tile-1);
 }
 for(const e of w.entities){
  ctx.beginPath();ctx.arc((e.position.x+.5)*tile,(e.position.y+.5)*tile,tile*.34,0,Math.PI*2);
  ctx.fillStyle=e.kind==="resource"?"#a4c783":e.ownerId?"#f5da91":"#98c0fa";ctx.fill();
  if(e.id===selected){ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.stroke();}
 }
 ctx.strokeStyle="#fbeb89";ctx.lineWidth=2;ctx.strokeRect(cursor.x*tile+2,cursor.y*tile+2,tile-4,tile-4);
 $("tick").textContent=String(w.tick);
 $("world-name").textContent=w.id;
 $("selected-position").textContent=cursor.x+", "+cursor.y;
}
function writeInspector(){
 const e=state.world.entities.find(item=>item.id===selected);
 $("selection").replaceChildren();
 if(!e){$("selection").textContent=t("inspector.empty");return;}
 const title=document.createElement("strong");title.textContent=e.kind==="character"?e.name:(catalog?.resources?.[e.resourceType]??e.resourceType);
 const detail=document.createElement("p");detail.textContent=e.kind==="character"?t("inspector.healthEnergy",{health:e.health,energy:e.energy}):t("inspector.resourceQuantity",{quantity:e.quantity,maximum:e.maximum});
 $("selection").append(title,detail);
}
async function refresh(){
 if(!catalog)catalog=await request("/api/catalog");
 const newState=await request("/api/world");state=newState;
 if(selected&&!state.world.entities.some(e=>e.id===selected))selected=null;
 paint();writeInspector();await updateActions();
}
async function updateActions(){
 if(!state)return;
 const params=new URLSearchParams({role,x:String(cursor.x),y:String(cursor.y)});
 if(selected)params.set("targetId",selected);
 const {actions}=await request("/api/actions?"+params);
 $("actions").replaceChildren();
 for(const a of actions){
  const button=document.createElement("button");button.type="button";button.disabled=busy||!a.enabled;
  button.className="action";
  const label=document.createElement("span");label.textContent=catalog?.actions?.[a.id]??a.label;
  const small=document.createElement("small");small.textContent=a.enabled?t("actions.available"):a.reason?reason(a.reason):t("actions.unavailable");
  button.append(label,small);
  button.addEventListener("click",()=>send(a.id));
  $("actions").append(button);
 }
}
async function send(action){
 if(busy)return;busy=true;$("feedback").textContent=t("feedback.applying");
 try{
  const parameters=action==="npc.spawn"?{name:$("entity-name").value.trim()||t("form.npcFallback")}:action==="resource.spawn"?{resourceType:$("resource-type").value,quantity:Number($("quantity").value)}:{};
  const data=await request("/api/commands",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({commandId:crypto.randomUUID(),role,action,position:cursor,parameters,targetId:selected})});
  $("feedback").textContent=data.result.ok?t("feedback.commandApplied",{tick:data.result.tick}):reason(data.result.error);
  state={...state,world:data.world};paint();writeInspector();
 }catch(e){$("feedback").textContent=t("feedback.failure",{message:e.message});}
 finally{busy=false;await updateActions();}
}
canvas.addEventListener("click",async e=>{
 if(!state)return;
 const point=coordinates(e);if(point.x<0||point.y<0||point.x>=state.world.width||point.y>=state.world.height)return;
 cursor=point;
 const hit=[...state.world.entities].reverse().find(entity=>entity.position.x===cursor.x&&entity.position.y===cursor.y);
 selected=hit?.id||null;paint();writeInspector();await updateActions();
});
$("refresh").addEventListener("click",()=>refresh().catch(e=>$("feedback").textContent=e.message));
localizeDOM();
refresh().catch(e=>$("feedback").textContent=e.message);
