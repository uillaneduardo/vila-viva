"use strict";
(function(){
 const api="/api/simulations",app=window.VilaApp,el=id=>document.getElementById(id);
 const remote=window.VilaRemote={connected:false};
 let pending=false,selectedSource=null,updating=false;
 const notify=message=>{let target=el("server-state");if(target)target.textContent=message;};
 async function request(url,method="GET",data){
  const resp=await fetch(url,{method,headers:{"Content-Type":"application/json"},body:data?JSON.stringify(data):undefined,cache:"no-store",signal:AbortSignal.timeout(4000)});
  const result=await resp.json();if(!resp.ok)throw Error(result.error||"Falha na API");return result;
 }
 async function syncList(){
  const {worlds}=await request(api);
  return Promise.all(worlds.map(async m=>{const existing=app.worlds().find(x=>x.id===m.id);
   if(existing)return existing;return (await request(api+"/"+m.id)).world;
  }));
 }
 async function send(cmd){if(pending||!remote.connected)return;pending=true;try{
  const r=await request(api+"/"+app.current().id+"/commands","POST",cmd);app.replaceWorld(r.world);app.refresh();notify("● Servidor ativo");
 }catch(err){notify("⚠ "+err.message)}finally{pending=false}}
 function connectControls(){
  const choose=el("settlements");
  choose.onchange=async e=>{app.switchTo(e.target.value);localStorage.setItem("vilaviva.remote.current",e.target.value);try{app.replaceWorld((await request(api+"/"+e.target.value)).world);app.refresh()}catch(err){notify("⚠ "+err.message)}};
  el("new").onclick=async()=>{const name=prompt("Nome da nova simulação:","Nova Vila");if(!name)return;try{const r=await request(api,"POST",{name});const worlds=await syncList();app.setWorlds(worlds,r.world.id);app.replaceWorld(r.world);localStorage.setItem("vilaviva.remote.current",r.world.id)}catch(err){notify("⚠ "+err.message)}};
  el("rename").onclick=async()=>{const name=prompt("Renomear simulação:",app.current().name);if(!name)return;try{app.replaceWorld((await request(api+"/"+app.current().id,"PATCH",{name})).world);app.refresh();choose.querySelector("option:checked").textContent=name}catch(err){notify("⚠ "+err.message)}};
  el("delete").onclick=async()=>{if(!confirm("Excluir permanentemente esta simulação do servidor?"))return;try{await request(api+"/"+app.current().id,"DELETE");const worlds=await syncList();app.setWorlds(worlds,worlds[0].id)}catch(err){notify("⚠ "+err.message)}};
  el("pause").onclick=()=>{const w=app.current();send({type:"pause",value:!w.run.paused})};
  document.querySelectorAll("[data-speed]").forEach(b=>b.onclick=()=>send({type:"speed",value:Number(b.dataset.speed)}));
  el("nextday").onclick=()=>send({type:"nextday"});
  el("trigger").onclick=()=>send({type:"event",value:el("event").value});
  el("lab-apply").onclick=()=>send({type:"scenario",value:el("lab-scenario").value});
  el("reset").style.display="none";
  el("server-state").textContent="● Servidor ativo · mundos persistentes";
  el("server-description").textContent="Os mundos continuam avançando no servidor com o navegador fechado. As mudanças são salvas em volume persistente.";
  const box=document.createElement("section");box.className="panel";box.innerHTML='<h2>🌳 Intervir no mundo</h2><p class="muted">Escolha uma fonte e clique no mapa para posicioná-la.</p><div class="row"><select id="source-preset" aria-label="Fonte de recursos"><option value="forest">🌲 Floresta</option><option value="orchard">🍎 Pomar</option><option value="hunt">🐾 Caça</option><option value="farm">🌾 Fazenda</option><option value="quarry">🪨 Pedreira</option><option value="mine">⛏ Mina</option></select><button id="source-place">Adicionar fonte</button><button id="source-cancel" hidden>Cancelar</button></div><p id="source-hint" class="muted"></p>';
  document.querySelector(".side").prepend(box);
  el("source-place").onclick=()=>{selectedSource=el("source-preset").value;el("source-hint").textContent="Clique em uma posição livre do mapa para criar a fonte de recursos.";el("source-cancel").hidden=false;el("map").style.cursor="copy"};
  el("source-cancel").onclick=cancelPlace;
  function cancelPlace(){selectedSource=null;el("source-hint").textContent="";el("source-cancel").hidden=true;el("map").style.cursor="crosshair"}
  el("map").addEventListener("click",async e=>{
   if(!selectedSource)return;
   e.stopImmediatePropagation();e.preventDefault();
   const cv=el("map"),r=cv.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)*cv.width/r.width/40),y=Math.floor((e.clientY-r.top)*cv.height/r.height/40),preset=selectedSource;
   await send({type:"source",preset,x,y});cancelPlace();
  },true);
 }
 async function initialize(){
  try{
   const {worlds:meta}=await request(api);if(!meta.length)return;
   const full=await Promise.all(meta.map(x=>request(api+"/"+x.id).then(r=>r.world)));
   const saved=localStorage.getItem("vilaviva.remote.current");
   const id=full.some(w=>w.id===saved)?saved:full[0].id;
   remote.connected=true;app.setWorlds(full,id);connectControls();app.refresh();
   setInterval(async()=>{if(updating||pending)return;updating=true;try{
    const id=app.current().id;
    const r=await request(api+"/"+id);
    if(app.current()?.id===id){app.replaceWorld(r.world);notify("● Servidor ativo · mundos persistentes")}
    const selector=el("settlements");if(!selector.options.length)app.refresh();
    el("pause").textContent=r.world.run.paused?"▶":"⏸";
    document.querySelectorAll("[data-speed]").forEach(b=>b.classList.toggle("active-speed",Number(b.dataset.speed)===r.world.run.speed&&!r.world.run.paused));
   }catch(err){notify("⚠ Sem conexão com o servidor: "+err.message)}finally{updating=false}},900);
  }catch(err){notify("⚠ Modo local: "+err.message)}
 }
 initialize();
})();
