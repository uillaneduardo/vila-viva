"use strict";
(function(){
 const $=id=>document.getElementById(id), app=()=>window.VilaApp,world=()=>app()?.current(),sites=()=>window.VilaSites||[];
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const names={wood:"Madeira",stone:"Pedra",food:"Alimentos",ore:"Minério",coins:"Moedas"},weights={wood:2,stone:3,food:.5,ore:3,coins:.01};
 const stages=[{label:"Fundação",wood:20,stone:12,time:80},{label:"Estrutura",wood:30,stone:20,time:120},{label:"Telhado",wood:25,stone:10,time:100},{label:"Acabamento",wood:10,stone:5,time:70}];
 const presets={forest:"🌲 Floresta",orchard:"🍎 Pomar",hunt:"🐾 Caça",farm:"🌾 Fazenda",quarry:"🪨 Pedreira",mine:"⛏ Mina"};
 let selection={kind:"overview"},mode="observe",modalOpen=false,historyOpen=false,worldId="",inspectCache="",worldsCache="",historyCache="";
 const tm=w=>"Dia "+w.day+" · "+String(Math.floor(w.minute/60)).padStart(2,"0")+":"+String(Math.floor(w.minute%60)).padStart(2,"0");
 const used=w=>Object.entries(w.stock||{}).reduce((v,[k,n])=>v+n*(weights[k]||1),0);
 const row=(label,value,sub="")=>'<div class="god-metric"><span>'+esc(label)+(sub?'<small class="muted"> · '+esc(sub)+'</small>':"")+'</span><strong>'+esc(value)+'</strong></div>';
 const bar=(a,b)=>'<div class="god-progress"><i style="width:'+Math.max(0,Math.min(100,100*a/Math.max(1,b)))+'%"></i></div>';
 const header=(icon,title,subtitle)=>'<div class="god-header"><span class="god-header-icon">'+icon+'</span><div><h3>'+esc(title)+'</h3><p>'+esc(subtitle)+'</p></div></div>';
 const section=label=>'<div class="god-section-title">'+label+'</div>';
 const note=txt=>'<div class="god-note">'+esc(txt)+'</div>';
 const link=(text,kind,id,meta)=>'<button type="button" data-god-kind="'+kind+'" data-god-id="'+esc(id||"")+'"><span>'+text+'</span><small>'+esc(meta||"")+'</small></button>';
 function inspector(w){
  const npcs=w.npcs||[],lab=w.lab||{},resources=lab.resources||{};
  if(selection.kind==="npc"){
   const n=npcs.find(x=>x.id===selection.id);if(!n)return note("Morador não encontrado.");
   const s=lab.stats?.[n.id]||{},d=n.lastDecision,events=(lab.decisions||[]).filter(e=>e.npc===n.id).slice(0,5);
   return header("🧑",n.name,n.role||"Morador")+row("Atividade",n.phase)+row("Energia",Math.round(n.energy)+"%")+bar(n.energy,100)+
     row("Saciedade",Math.round(n.hunger??100)+"%")+bar(n.hunger??100,100)+row("Sono pendente",Math.round(n.sleepNeed||0)+"%")+
     row("Saúde",Math.round(n.health??100)+"%")+section("Inventário e trabalho")+
     row("Carregando",n.cargo?n.cargo.qty+" "+(names[n.cargo.key]||n.cargo.key):"Sem carga")+row("Ferramenta",n.equipment||"Nenhuma")+
     row("Capacidade",String(n.carryCapacity||20)+" kg")+row("Tarefas / entregas",(s.tasks||0)+" / "+(s.deliveries||0))+
     row("Interrupções",s.interruptions||0)+section("Última decisão")+note((d?.action||"Aguardando decisão")+(d?.reason?" — "+d.reason:""))+
     section("Histórico recente")+(events.length?events.map(e=>'<div class="god-event"><small>Dia '+e.day+'</small><div>'+esc(e.action)+'</div></div>').join(""):note("Nenhuma decisão registrada."));
  }
  if(selection.kind==="depot"){
   const cap=lab.depotCapacity||170,load=npcs.filter(n=>n.cargo&&n.phase==="toDepot");
   return header("📦","Depósito comunitário","Estoque físico da vila")+row("Capacidade ocupada",used(w).toFixed(1)+" / "+cap+" kg")+
     bar(used(w),cap)+row("Capacidade livre",Math.max(0,cap-used(w)).toFixed(1)+" kg")+
     row("Cargas a caminho",load.length)+section("Recursos armazenados")+
     Object.entries(w.stock||{}).map(([k,v])=>row(names[k]||k,v,"a caminho: "+load.filter(n=>n.cargo.key===k).reduce((a,n)=>a+n.cargo.qty,0))).join("")+
     note("O estoque só aumenta quando a carga é entregue fisicamente no depósito.");
  }
  if(selection.kind==="build"||(selection.kind==="site"&&selection.id==="build")){
   const p=w.project||{},st=stages[p.stage],onway=npcs.filter(n=>n.phase==="toBuildDelivery"&&n.cargo);
   if(!st)return header("🏠","Casa comunitária","Construção concluída")+note("Moradia disponível para seis habitantes.");
   const mat=k=>row(names[k],(p.delivered?.[k]||0)+" / "+st[k],"a caminho: "+onway.filter(n=>n.cargo.key===k).reduce((a,n)=>a+n.cargo.qty,0)+" · faltam "+Math.max(0,st[k]-(p.delivered?.[k]||0)));
   const ready=(p.delivered?.wood||0)>=st.wood&&(p.delivered?.stone||0)>=st.stone;
   return header("🏗","Casa comunitária","Canteiro em construção")+row("Etapa",(p.stage+1)+"/4 — "+st.label)+
     section("Materiais necessários")+mat("wood")+mat("stone")+section("Execução")+
     row("Trabalho realizado",(p.work||0)+" / "+st.time)+bar(p.work||0,st.time)+
     row("Equipe",npcs.filter(n=>n.site==="build"&&["work","travel"].includes(n.phase)).length+" / 4")+
     note(ready?"Materiais suficientes. Aguardando trabalho da equipe.":"Aguardando entrega dos recursos necessários.");
  }
  if(selection.kind==="site"){
   const s=sites().find(x=>x.id===selection.id),r=resources[selection.id];if(!s)return note("Fonte não encontrada.");
   const workers=npcs.filter(n=>n.site===s.id&&["travel","work"].includes(n.phase));
   return header(s.icon||"🌱",s.name,"Fonte renovável · "+(names[s.resource]||s.resource))+
     row("Disponível",Math.floor(r?.amount||0)+" / "+(r?.max||0))+bar(r?.amount||0,r?.max||1)+
     row("Regeneração",(r?.regen||0).toFixed(3)+" / minuto")+row("Vagas ocupadas",workers.length+" / "+s.cap)+
     row("Produção / ciclo",s.qty+" unidades")+row("Tempo / ciclo",s.work+" min")+
     section("Moradores no local")+(workers.length?'<div class="god-list">'+workers.map(n=>link(esc(n.name),"npc",n.id,n.phase)).join("")+'</div>':note("Sem moradores trabalhando agora."))+
     note("Mesmo esgotada, esta fonte permanece no mapa e recupera recursos ao longo do tempo.");
  }
  if(selection.kind==="roster")return header("👥","Moradores","Agentes autônomos")+
    '<div class="god-list">'+npcs.map(n=>link(esc(n.name),"npc",n.id,n.role+" · "+n.phase)).join("")+'</div>';
  if(selection.kind==="sources")return header("🌲","Fontes de recursos","Produção natural do mundo")+
    '<div class="god-list">'+sites().filter(s=>s.resource).map(s=>link(esc(s.icon+" "+s.name),"site",s.id,Math.floor(resources[s.id]?.amount||0)+" disponíveis")).join("")+'</div>';
  const tasks=Object.values(lab.stats||{}).reduce((a,s)=>a+(s.deliveries||0),0);
  return header("🌿",w.name,"Visão geral do mundo")+row("Relógio",tm(w))+row("Moradores",npcs.length)+
    row("Em atividade",npcs.filter(n=>["work","travel","toDepot","toBuildDelivery"].includes(n.phase)).length)+
    row("Entregas concluídas",tasks)+row("Estoque",used(w).toFixed(1)+" kg")+section("Inspeção rápida")+
    '<div class="god-list">'+link("👥 Moradores","roster","","Ver atividades")+link("📦 Depósito","depot","","Estoque e cargas")+
    link("🏗 Construção","build","","Etapas e requisitos")+link("🌲 Fontes","sources","","Produção e regeneração")+'</div>'+
    note("Clique em NPCs, fontes, depósito ou canteiro no mapa para inspecioná-los.");
 }
 function select(kind,id){if(kind==="lab")return;selection={kind,id};mode="observe";paint();if(kind==="npc")window.VilaSelectNPC?.(id)}
 function paint(){
  const w=world();if(!w)return;
  if(worldId!==w.id){worldId=w.id;selection={kind:"overview"};inspectCache=""}
  const html=inspector(w);if(html!==inspectCache){$("god-inspector-content").innerHTML=html;inspectCache=html}
  $("god-clock").textContent=tm(w);$("god-population").textContent=w.npcs.filter(n=>n.phase!=="dead").length;
  $("god-stock").textContent=used(w).toFixed(1)+" kg";$("god-food").textContent=(w.stock?.food||0)+" un.";const alive=w.npcs.filter(n=>n.phase!=="dead");$("god-health").textContent=Math.round(alive.reduce((sum,n)=>sum+(n.health??100),0)/Math.max(1,alive.length))+"%";$("god-blocked").textContent=w.npcs.filter(n=>n.phase==="waitStorage"||["idle","social"].includes(n.phase)&&n.lastDecision?.action==="Sem tarefa viável").length;$("god-building").textContent=Math.min(w.project?.stage||0,4)+"/4";
  $("god-live-state").textContent=w.run?.paused?"⏸ Pausada":window.VilaRemote?.connected?"● Ao vivo":"○ Local";
  const rFood=$("god-ribbon-food");if(rFood){
   const alive=w.npcs.filter(n=>n.phase!=="dead");
   rFood.textContent=(w.stock?.food||0)+" un.";
   $("god-ribbon-health").textContent=Math.round(alive.reduce((v,n)=>v+(n.health??100),0)/Math.max(1,alive.length))+"%";
   $("god-ribbon-storage").textContent=used(w).toFixed(0)+"/"+(w.lab?.depotCapacity||170)+" kg";
   $("god-ribbon-blocked").textContent=alive.filter(n=>n.phase==="waitStorage"||["idle","social"].includes(n.phase)&&n.lastDecision?.action==="Sem tarefa viável").length;
   const roster=$("god-roster-strip");
   const markup=alive.map(n=>'<button type="button" data-roster-npc="'+esc(n.id)+'" class="god-roster-unit '+(selection.kind==="npc"&&selection.id===n.id?"active":"")+'"><span class="god-roster-face">'+esc(n.name.slice(0,1))+'</span><span class="god-roster-info"><b>'+esc(n.name)+'</b><small>'+esc(n.phase==="waitStorage"?"Depósito cheio":n.phase==="toFood"?"Buscando alimento":n.phase==="work"?"Trabalhando":n.phase==="social"?"Socializando":n.phase)+'</small></span><span class="god-roster-health"><i style="width:'+Math.max(0,n.health??100)+'%"></i></span></button>').join("");
   if(roster.dataset.markup!==markup){roster.innerHTML=markup;roster.dataset.markup=markup;}
  }
  if(modalOpen)paintWorlds();if(historyOpen)paintHistory(w);
 }
 function paintWorlds(){
  const html=(app()?.worlds()||[]).map(w=>'<div class="god-world-card '+(w.id===world()?.id?"active":"")+'"><div><b>'+esc(w.name)+'</b><small>'+tm(w)+' · '+w.npcs.length+' moradores · '+(w.run?.paused?"Pausada":"Em andamento")+'</small></div><button data-open-world="'+esc(w.id)+'">'+(w.id===world()?.id?"Aberta":"Abrir")+'</button></div>').join("");
  if(worldsCache!==html){$("god-world-list").innerHTML=html;worldsCache=html}
 }
 function paintHistory(w){
  const rows=[...(w.lab?.history||[]).slice(0,15),...(w.logs||[]).slice(0,8).map(x=>({...x,action:x.text,name:"Assentamento"}))].sort((a,b)=>b.day-a.day||b.minute-a.minute);
  const html=rows.slice(0,18).map(x=>'<div class="god-event"><small>Dia '+x.day+'</small><div><b>'+esc(x.name||"Mundo")+'</b>: '+esc(x.action)+'</div></div>').join("")||'<p class="muted">Sem eventos registrados.</p>';
  if(html!==historyCache){$("god-events-body").innerHTML=html;historyCache=html}
 }
 function tools(kind){
  mode=kind;const panel=$("god-tool-content");
  document.querySelectorAll("[data-god-tool]").forEach(b=>b.classList.toggle("is-active",b.dataset.godTool===kind));
  if(kind==="source"){
   panel.innerHTML='<label class="muted" for="god-source-type">Fonte de recursos</label><select id="god-source-type">'+Object.entries(presets).map(([k,n])=>'<option value="'+k+'">'+n+'</option>').join("")+'</select><div class="row"><button id="god-source-start">Posicionar no mapa</button><button id="god-source-cancel">Cancelar</button></div><p class="muted" id="god-source-help">Configure a fonte e escolha sua posição no mapa.</p>';
   $("god-source-start").onclick=()=>{const original=$("source-preset");if(!original){$("god-source-help").textContent="Conecte ao servidor primeiro.";return}original.value=$("god-source-type").value;$("source-place")?.click();$("god-source-help").textContent="Clique num local livre no mapa para criar a fonte."};
   $("god-source-cancel").onclick=()=>{$("source-cancel")?.click();tools("observe")};
  }else if(kind==="event"){
   panel.innerHTML='<label class="muted">Evento</label><select id="god-event-type"><option value="random">🎲 Aleatório</option><option value="harvest">🌾 Colheita abundante</option><option value="drought">☀️ Seca</option><option value="caravan">🛒 Caravana</option><option value="storm">⛈️ Tempestade</option><option value="beasts">🐺 Animais</option></select><div class="row"><button id="god-event-apply">Disparar evento</button></div>';
   $("god-event-apply").onclick=()=>{$("event").value=$("god-event-type").value;$("trigger")?.click();tools("observe")};
  }else if(kind==="test"){
   panel.innerHTML='<label class="muted">Cenário de teste</label><select id="god-test-type"><option value="food">Alimento escasso</option><option value="forest">Floresta esgotada</option><option value="storage">Depósito lotado</option><option value="fatigue">Exaustão</option><option value="normal">Condições normais</option></select><div class="row"><button id="god-test-apply">Aplicar cenário</button></div>';
   $("god-test-apply").onclick=()=>{$("lab-scenario").value=$("god-test-type").value;$("lab-apply")?.click();tools("observe")};
  }else panel.innerHTML="";
 }
 function toggleModal(force){modalOpen=typeof force==="boolean"?force:!modalOpen;$("god-modal").hidden=!modalOpen;if(modalOpen){worldsCache="";paintWorlds();$("god-close-worlds").focus()}}
 function setup(){
  const headerEl=document.querySelector(".top"),worldBtn=document.createElement("button");worldBtn.id="god-worlds";worldBtn.textContent="☰ Mundos";headerEl.append(worldBtn);worldBtn.onclick=()=>toggleModal();
  const ribbon=document.createElement("div");ribbon.id="god-survival-ribbon";
  ribbon.innerHTML='<div><small>🍎 Alimentos</small><strong id="god-ribbon-food">—</strong></div><div><small>❤ Saúde média</small><strong id="god-ribbon-health">—</strong></div><div><small>📦 Depósito</small><strong id="god-ribbon-storage">—</strong></div><div><small>⚠ Bloqueios</small><strong id="god-ribbon-blocked">—</strong></div>';
  headerEl.after(ribbon);
  const rosterStrip=document.createElement("div");rosterStrip.id="god-roster-strip";
  document.querySelector(".layout>main").append(rosterStrip);
  rosterStrip.addEventListener("click",e=>{const b=e.target.closest("[data-roster-npc]");if(b)select("npc",b.dataset.rosterNpc)});
  const side=document.querySelector(".side"),toolbar=document.createElement("section");toolbar.id="god-tools";toolbar.className="panel";
  toolbar.innerHTML='<h2>Intervir no mundo</h2><div class="god-tools-row">'+
   '<button class="god-tool is-active" data-god-tool="observe"><span class="tool-icon">◉</span>Observar</button>'+
   '<button class="god-tool" data-god-tool="source"><span class="tool-icon">🌳</span>Recursos</button>'+
   '<button class="god-tool" data-god-tool="event"><span class="tool-icon">⚡</span>Eventos</button>'+
   '<button class="god-tool" data-god-tool="test"><span class="tool-icon">🧪</span>Testes</button></div><div id="god-tool-content"></div>';
  side.prepend(toolbar);toolbar.addEventListener("click",e=>{const b=e.target.closest("[data-god-tool]");if(b)tools(b.dataset.godTool)});
  const inspect=document.createElement("section");inspect.className="panel";inspect.id="god-inspector";inspect.innerHTML='<h2>Inspeção contextual</h2><div id="god-inspector-content"></div>';
  side.append(inspect);inspect.addEventListener("click",e=>{const b=e.target.closest("[data-god-kind]");if(b)select(b.dataset.godKind,b.dataset.godId)});
  const dock=document.createElement("div");dock.id="god-dock";dock.innerHTML='<div class="god-dock-stat"><small>Relógio</small><strong id="god-clock"></strong></div>'+
   '<div class="god-dock-stat"><small>Moradores</small><strong id="god-population"></strong></div>'+
   '<div class="god-dock-stat"><small>Estoque</small><strong id="god-stock"></strong></div>'+
   '<div class="god-dock-stat"><small>Alimento</small><strong id="god-food"></strong></div>'+
   '<div class="god-dock-stat"><small>Saúde média</small><strong id="god-health"></strong></div>'+
   '<div class="god-dock-stat"><small>Bloqueados</small><strong id="god-blocked"></strong></div>'+
   '<div class="god-dock-stat"><small>Obra</small><strong id="god-building"></strong></div>'+
   '<div class="god-dock-stat"><small>Estado</small><strong id="god-live-state"></strong></div><button id="god-history">☷ Histórico</button>';
  document.querySelector(".layout>main").append(dock);
  // Visible camera controls: the original zoom controls lived in a hidden laboratory panel.
  const map=document.querySelector(".mapwrap"),camera=document.createElement("div");
  camera.className="god-map-controls";
  camera.setAttribute("aria-label","Controles de navegação do mapa");
  camera.innerHTML='<button type="button" id="god-zoom-out" aria-label="Diminuir zoom" title="Diminuir zoom">−</button><span id="god-map-zoom">100%</span><button type="button" id="god-zoom-in" aria-label="Aumentar zoom" title="Aumentar zoom">+</button><button type="button" id="god-map-center" title="Centralizar mapa">Centrar</button>';
  map.append(camera);
  const cv=$("map"),zoomLabel=$("god-map-zoom");
  const hover=document.createElement("div");hover.id="god-npc-hover";hover.hidden=true;document.body.append(hover);
  cv.addEventListener("pointermove",e=>{
   if(e.pointerType==="touch"||e.buttons){hover.hidden=true;return;}
   const w=world(),r=cv.getBoundingClientRect();if(!w||!r.width)return;
   const x=(e.clientX-r.left)*cv.width/r.width,y=(e.clientY-r.top)*cv.height/r.height;
   const n=w.npcs.find(n=>{const p=window.VilaMotion?.(n)||n;return Math.hypot(p.x*40+20-x,p.y*40+23-y)<25});
   if(!n){hover.hidden=true;return;}
   hover.innerHTML="<strong>"+esc(n.name)+"</strong><small>"+esc(n.role)+" · "+esc(n.phase)+"</small><span>❤ "+Math.round(n.health??100)+"% &nbsp; 🍎 "+Math.round(n.hunger??100)+"% &nbsp; ⚡ "+Math.round(n.energy)+"%</span><small>"+esc(n.lastDecision?.action||"Sem decisão recente")+"</small>";
   hover.style.left=Math.min(innerWidth-230,e.clientX+16)+"px";hover.style.top=Math.max(8,Math.min(innerHeight-116,e.clientY+14))+"px";hover.hidden=false;
  });
  cv.addEventListener("pointerleave",()=>hover.hidden=true);
  function syncZoom(){zoomLabel.textContent=Math.round(cv.getBoundingClientRect().width/map.clientWidth*100)+"%";}
  $("god-zoom-out").onclick=()=>{$("lab-zoom-out")?.click();syncZoom()};
  $("god-zoom-in").onclick=()=>{$("lab-zoom-in")?.click();syncZoom()};
  $("god-map-center").onclick=()=>{cv.style.width="100%";map.scrollTo({left:0,top:0,behavior:"smooth"});syncZoom()};
  window.addEventListener("resize",syncZoom,{passive:true});syncZoom();

  const events=document.createElement("div");events.id="god-events-drawer";events.hidden=true;events.innerHTML='<div class="row" style="justify-content:space-between"><h3>Atividades e decisões</h3><button id="god-close-history">Fechar ×</button></div><div id="god-events-body"></div>';document.body.append(events);
  $("god-history").onclick=()=>{historyOpen=!historyOpen;events.hidden=!historyOpen;historyCache="";paint()};$("god-close-history").onclick=()=>{historyOpen=false;events.hidden=true};
  const modal=document.createElement("div");modal.id="god-modal";modal.className="god-modal-backdrop";modal.hidden=true;
  modal.innerHTML='<div class="god-modal" role="dialog" aria-modal="true" aria-label="Gerenciar simulações"><div class="god-modal-header"><h2>🌍 Minhas simulações</h2><button id="god-close-worlds">Fechar ×</button></div><p class="muted">Os mundos continuam evoluindo no servidor enquanto você está fora.</p><div id="god-world-list"></div><div class="row"><button id="god-create-world" class="god-new-world">+ Criar nova simulação</button><button id="god-rename-world">Renomear</button><button id="god-delete-world" class="danger">Excluir</button></div></div>';
  document.body.append(modal);$("god-close-worlds").onclick=()=>toggleModal(false);
  modal.addEventListener("click",e=>{if(e.target===modal)toggleModal(false);const b=e.target.closest("[data-open-world]");if(b){$("settlements").value=b.dataset.openWorld;$("settlements").dispatchEvent(new Event("change",{bubbles:true}));toggleModal(false);inspectCache=""}});
  $("god-create-world").onclick=()=>{$("new").click();worldsCache=""};$("god-rename-world").onclick=()=>{$("rename").click();worldsCache=""};$("god-delete-world").onclick=()=>{$("delete").click();worldsCache=""};
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){toggleModal(false);if(mode!=="observe"){$("source-cancel")?.click();tools("observe")}else if(historyOpen){historyOpen=false;events.hidden=true}}});
  window.VilaGodView={select,render:paint,openWorlds:()=>toggleModal(true)};
  paint();setInterval(paint,750);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});else setup();
})();
