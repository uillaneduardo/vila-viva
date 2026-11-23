import {views} from "./features/navigation/views.js";
import {renderPage} from "./features/navigation/pages.js";
import {renderInspector} from "./features/inspector/render.js";
import {renderActivityMarkup} from "./features/activity/render.js";
import {worlds,createDemoState} from "./mock.js";
import {createMap} from "./map.js";
const $=id=>document.getElementById(id);
let state=createDemoState(),view="world";


function toast(message){const n=document.createElement("div");n.className="toast";n.textContent=message;$("toasts").append(n);setTimeout(()=>n.remove(),3200);}
function event(title,description,icon="◈"){state.events.unshift({title,description,icon,time:"Agora"});state.events=state.events.slice(0,24);renderActivity();}
function updateStats(){$("stat-npcs").textContent=state.npc.length;$("stat-resources").textContent=state.resource.length;$("stat-day").textContent=state.day;$("stat-status").innerHTML=state.paused?"Ⅱ Pausado":'<span class="live-dot"></span> Em execução';$("stat-speed").textContent="Velocidade "+state.speed+"×";$("world-meta").textContent=state.world.name+" · 64 × 48";$("pause-btn").textContent=state.paused?"▶":"Ⅱ";$("speed-select").value=String(state.speed);}
function renderActivity(){$("activity-list").innerHTML=renderActivityMarkup(state.events);}
function inspect(e){state.selected=e;$("inspector-content").innerHTML=renderInspector(e);}
function tool(name){state.tool=name;document.querySelectorAll("[data-tool]").forEach(e=>e.classList.toggle("active",e.dataset.tool===name));$("map-tip").textContent=({inspect:"Arraste para mover · Roda para zoom · Clique para inspecionar",npc:"Clique em um espaço livre para adicionar um NPC fictício",resource:"Clique no mapa para criar uma fonte demonstrativa",event:"Clique no mapa para gerar um evento demonstrativo"})[name];}
function place(p){const x=Math.round(p.x),y=Math.round(p.y);if(state.tool==="npc"){const id="npc-"+Date.now();const e={id,type:"npc",name:"Novo habitante",x,y,health:100,energy:100,hunger:80,task:"Explorando",dx:0,dy:0};state.npc.push(e);inspect(e);event("NPC adicionado",e.name+" foi adicionado ao mapa.","♙");}else if(state.tool==="resource"){const e={id:"res-"+Date.now(),type:"resource",name:"Nova floresta",x,y,qty:100};state.resource.push(e);inspect(e);event("Fonte adicionada","Uma nova fonte foi colocada no mapa.","♧");}else if(state.tool==="event"){event("Evento do administrador","Intervenção demonstrativa em X "+x+", Y "+y+".","ϟ");toast("Evento fictício registrado");}updateStats();if(view!=="world")renderGeneric();}
const map=createMap($("world-canvas"),()=>state,inspect,place,(x,y)=>{$("map-coords").textContent="X: "+x+" · Y: "+y});
function changeView(id){view=id;document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.view===id));$("page-title").textContent=views[id][0];$("breadcrumb-current").textContent=views[id][0];$("page-description").textContent=views[id][1];$("view-world").classList.toggle("active",id==="world");$("view-generic").classList.toggle("active",id!=="world");$("stats").style.display=id==="world"?"grid":"none";$("sidebar").classList.remove("open");if(id!=="world")renderGeneric();}
function renderGeneric(){$("generic-title").textContent=views[view][0];$("generic-description").textContent=views[view][1];$("generic-content").innerHTML=renderPage(view,state,worlds);}
function chooseWorld(id){const w=worlds.find(w=>w.id===id);if(!w)return;state=createDemoState(w);inspect(null);tool("inspect");updateStats();renderActivity();changeView("world");toast("Simulação demonstrativa carregada: "+w.name);}
document.querySelectorAll("[data-view]").forEach(n=>n.addEventListener("click",()=>changeView(n.dataset.view)));
$("generic-content").addEventListener("click",e=>{const c=e.target.closest("[data-world],[data-select]");if(!c)return;if(c.dataset.world)chooseWorld(c.dataset.world);else{const ent=[...state.npc,...state.resource].find(n=>n.id===c.dataset.select);changeView("world");inspect(ent);}});
$("generic-content").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){const c=e.target.closest("[data-world],[data-select]");if(c){e.preventDefault();c.click();}}});
document.querySelectorAll("[data-tool]").forEach(n=>n.addEventListener("click",()=>tool(n.dataset.tool)));
$("pause-btn").addEventListener("click",()=>{state.paused=!state.paused;updateStats();event(state.paused?"Prévia pausada":"Prévia retomada","Controle demonstrativo, sem servidor.","◷");});
$("speed-select").addEventListener("change",e=>{state.speed=Number(e.target.value);updateStats();});
$("zoom-in").addEventListener("click",()=>map.zoom(1.2));$("zoom-out").addEventListener("click",()=>map.zoom(.82));$("reset-view").addEventListener("click",map.reset);
$("clear-selection").addEventListener("click",()=>inspect(null));$("see-events").addEventListener("click",()=>changeView("events"));
$("worlds-button").addEventListener("click",()=>changeView("worlds"));
$("new-world-button").addEventListener("click",()=>$("create-dialog").showModal());
$("dialog-close").addEventListener("click",()=>$("create-dialog").close());$("dialog-cancel").addEventListener("click",()=>$("create-dialog").close());
$("create-form").addEventListener("submit",e=>{e.preventDefault();const name=$("world-name").value.trim();if(!name)return;const id="local-"+Date.now();const w={id,name,day:1,year:1,seed:Number($("world-seed").value)||0};worlds.push(w);$("create-dialog").close();chooseWorld(id);toast("Mundo demonstrativo criado apenas nesta sessão.");});
$("open-menu").addEventListener("click",()=>$("sidebar").classList.add("open"));$("close-menu").addEventListener("click",()=>$("sidebar").classList.remove("open"));
$("help-button").addEventListener("click",()=>toast("Protótipo local da interface. Ainda sem conexão com o motor de simulação."));
window.addEventListener("keydown",e=>{if(e.key==="Escape"){inspect(null);tool("inspect");$("sidebar").classList.remove("open");}});
updateStats();renderActivity();inspect(null);
