import {worlds,createDemoState} from "../../../packages/demo-world/src/fixtures.js";
import {createMap} from "../../../packages/renderer/src/map.js";
import {actionsFor} from "../../../packages/protocol/src/actions.js";
const $=id=>document.getElementById(id);
let state=createDemoState(),toastTimer;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const notice=message=>{const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2500)};
function inspect(e){state.selected=e;if(!e){$("inspection").textContent="Selecione um NPC, recurso ou construção.";return;}const rows=e.type==="npc"?[["Atividade",e.task],["Saúde",e.health+"%"],["Energia",e.energy+"%"],["Saciedade",e.hunger+"%"]]:e.type==="resource"?[["Quantidade",e.qty+" unidades"],["Regeneração","Ativa"]]:[["Progresso",e.progress+"%"]];$("inspection").innerHTML="<h2>"+escape(e.name)+"</h2>"+rows.map(([k,v])=>'<div class="detail"><span>'+escape(k)+'</span><strong>'+escape(v)+'</strong></div>').join("");}
const renderer=createMap($("map"),()=>state,inspect,()=>notice("Criação de entidades é exclusiva do administrador."),()=>{});
for(const w of worlds){const opt=document.createElement("option");opt.value=w.id;opt.textContent=w.name;$("world").append(opt);}
$("world").addEventListener("change",e=>{state=createDemoState(worlds.find(w=>w.id===e.target.value));$("title").textContent=state.world.name;inspect(null);renderer.reset();});
$("clear").addEventListener("click",()=>inspect(null));$("plus").addEventListener("click",()=>renderer.zoom(1.2));$("minus").addEventListener("click",()=>renderer.zoom(.83));$("reset").addEventListener("click",renderer.reset);
for(const a of actionsFor("player")){const b=document.createElement("button");b.className="action";b.disabled=a.status!=="demo";const label=document.createElement("strong");label.textContent=a.label;const status=document.createElement("span");status.textContent=a.status==="demo"?"Prévia":"Planejado";b.append(label,status);if(!b.disabled)b.addEventListener("click",()=>notice("Selecione e inspecione entidades no mapa."));$("actions").append(b);}
