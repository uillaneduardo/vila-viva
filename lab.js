"use strict";
/* Vila Viva Lab: observability and independent rules. All state lives in the world save. */
window.VilaLab = (() => {
 const weights={wood:2,stone:3,food:.5,ore:3,coins:.01};
 const defaultResources={forest:72,orchard:42,hunt:30,farm:70,quarry:64,mine:50};
 const regeneration={forest:.015,orchard:.05,hunt:.025,farm:.065,quarry:.012,mine:.008};
 const limit=140;
 let panel=null, selected={kind:"player"}, camera=1, following=false, lastPaint=0, pan=null, suppressClick=false;
 const esc=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 const wt=(key,qty)=> (weights[key]||1)*qty;
 const nearby=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const itemText=c=>c?c.qty+" "+(window.VilaNames?.[c.key]||c.key):"Nenhuma";
 function ensure(w,sites){
   if(!w.lab)w.lab={schema:1,resources:{},stats:{},history:[],decisions:[],drops:[],depotCapacity:170,seed:w.seed,board:{x:15,y:7}};
   const L=w.lab; L.resources||={};L.stats||={};L.history||=[];L.decisions||=[];L.drops||=[];L.depotCapacity??=170;L.board||={x:15,y:7};
   for(const s of sites){if(!s.resource)continue;const cap=defaultResources[s.id]||50;L.resources[s.id]??={amount:cap,max:cap,regen:regeneration[s.id]||.015};}
   for(const n of w.npcs){n.hunger??=72;n.sleepNeed??=15;n.health??=100;n.carryCapacity??=20;n.equipment??=({collector:"axe",farmer:"hoe",mason:"pickaxe",builder:"hammer"})[n.id]||null;n.traits??={initiative:55,prudence:55,sociability:55};n.skills??={};n.known??={};const st=L.stats[n.id]||={tasks:0,deliveries:0,failures:0,interruptions:0,minutes:{},produced:0};L.stats[n.id]=st;st.minutes||={};if(n.lastDecision===undefined)n.lastDecision=null;}
   return L;
 }
 function used(w){return Object.entries(w.stock).reduce((sum,[key,qty])=>sum+wt(key,qty),0);}
 function free(w){return Math.max(0,w.lab.depotCapacity-used(w));}
 function record(w,n,what,why){const e={tick:w.ticks,day:w.day,minute:Math.floor(w.minute),npc:n?.id||"world",name:n?.name||"Mundo",action:what,reason:why};w.lab.history.unshift(e);if(w.lab.history.length>200)w.lab.history.length=200;if(n){n.lastDecision=e;w.lab.decisions.unshift(e);if(w.lab.decisions.length>150)w.lab.decisions.length=150;}}
 function source(w,id){return w.lab?.resources[id];}
 function eligible(w,n,s){
   const r=source(w,s.id);if(!r||r.amount<1)return false;
   const qty=Math.max(1,Math.min(s.qty,Math.floor(r.amount)));
   return free(w)>=wt(s.resource,qty) && n.energy>Math.max(12,Math.ceil(nearby(n,s)*.25+10));
 }
 function choose(w,n,sites){
   ensure(w,sites);
   if(n.hunger<32)return null;
   const roleMap={leader:["forest","orchard"],collector:["forest","orchard"],farmer:["farm","orchard"],mason:["quarry","mine"],builder:["build","forest"],merchant:["orchard","forest"]};
   let options=[];
   if(w.project.stage<4 && ["leader","merchant"].includes(n.id)){
     const stages=[{wood:20,stone:12},{wood:30,stone:20},{wood:25,stone:10},{wood:10,stone:5}];
     const target=stages[w.project.stage];
     for(const key of ["wood","stone"]){
       const pending=w.npcs.reduce((sum,p)=>sum+(p.supplyKey===key&&["toBuildPickup","toBuildDelivery"].includes(p.phase)?(p.cargo?.qty||Math.min(5,w.stock[key]||0)):0),0);
       const missing=target[key]-(w.project.delivered[key]||0)-pending;
       if(missing>0 && w.stock[key]>0 && n.energy>22){
         const score=key==="wood"?88:86;
         options.push({id:"supply:"+key,score});
       }
     }
   }
   for(const s of sites){
     if(s.id==="build"){if(n.id==="builder" && w.project.stage<4 && typeof window.VilaStageReady==="function" && window.VilaStageReady(w)) options.push({id:s.id,score:120});continue;}
     if(!eligible(w,n,s))continue;
     const requiredTool=({forest:"axe",quarry:"pickaxe",mine:"pickaxe",farm:"hoe"})[s.id];if(requiredTool&&n.equipment!==requiredTool)continue;
     const stock=w.stock[s.resource]||0;
     const critical=s.resource==="food"&&stock<20?85:0;
     const base=Math.max(0,70-stock*.8);
     const specialty=(roleMap[n.id]||[]).includes(s.id)?22:0;
     const distance=nearby(n,s)*1.2;
     const score=base+critical+specialty-distance;
     options.push({id:s.id,score:Math.round(score)});
   }
   options.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
   const best=options[0];
   if(best){ if(n.lastChosen!==best.id||w.ticks-(n.lastChosenTick||0)>120){record(w,n,"Escolheu "+best.id,"Pontuação "+best.score+"; energia "+Math.round(n.energy)+"; fonte conhecida e capacidade disponível. Alternativas: "+options.slice(1,4).map(x=>x.id+" ("+x.score+")").join(", "));n.lastChosen=best.id;n.lastChosenTick=w.ticks;}return best.id;}
   if(w.ticks-(n.lastBlockedTick||0)>120){record(w,n,"Sem tarefa viável","Fontes exauridas, baixa energia, obra indisponível ou armazenamento cheio");n.lastBlockedTick=w.ticks;}
   return null;
 }
 function needsAction(w,n,approachFn){
   ensure(w,[]);
   if(n.phase==="sleep"){n.energy=Math.min(100,n.energy+.85);n.sleepNeed=Math.max(0,n.sleepNeed-.32);if(n.sleepNeed<12){n.phase="idle";record(w,n,"Acordou","Necessidade de sono satisfeita");}return true;}
   if(n.phase==="toForage"){
     const known=(window.VilaSites||[]).filter(s=>s.resource==="food"&&source(w,s.id)?.amount>=1).sort((a,b)=>nearby(n,a)-nearby(n,b));
     const s=known[0];
     if(!s){n.phase="rest";record(w,n,"Sem alimento","Fontes exauridas; aguardando regeneração");return true;}
     if(approachFn(n,s)){source(w,s.id).amount-=1;n.hunger=Math.min(100,n.hunger+38);n.phase="idle";record(w,n,"Comeu alimento natural","Retirou fisicamente 1 alimento de "+s.name);}
     return true;
   }
   if(n.phase==="toFood"){
     if(approachFn(n,{x:13,y:8})){if(w.stock.food>=1){w.stock.food--;n.hunger=Math.min(100,n.hunger+45);n.phase="idle";record(w,n,"Alimentou-se","Retirou 1 alimento fisicamente do depósito");}else{n.phase="toForage";record(w,n,"Depósito vazio","Procurando alimento natural nas fontes disponíveis");}}return true;
   }
   if(n.phase==="toSleep"){const shelter={x:14,y:9};if(n.energy<8){n.phase="sleep";record(w,n,"Dormiu ao relento","Energia insuficiente para alcançar abrigo");return true;}if(approachFn(n,shelter)){n.phase="sleep";record(w,n,"Iniciou sono","Chegou ao abrigo da vila");}return true;}
   if(n.energy<=0&&n.phase!=="rest"&&n.phase!=="toRest"){n.phase="rest";n.site=null;n.workLeft=0;n.cargo&&record(w,n,"Interrompeu atividade","Exaustão; carga mantida");return true;}
   if(n.phase==="waitStorage"){if(n.cargo && free(w)>=wt(n.cargo.key,n.cargo.qty)){n.phase="toDepot";record(w,n,"Retomar entrega","Espaço no depósito voltou a ficar disponível");}else{n.energy=Math.min(100,n.energy+.1);}return true;}
   if(n.phase==="toDepot"&&n.cargo&&free(w)<wt(n.cargo.key,n.cargo.qty)){n.phase="waitStorage";n.site=null;record(w,n,"Entrega suspensa","Depósito sem capacidade suficiente; carga preservada");return true;}
   if(n.phase==="idle"&&n.cargo){n.phase="toDepot";return true;}
   if(n.hunger<12&&n.phase!=="toFood"&&n.phase!=="toForage"&&n.phase!=="sleep"){n.phase=w.stock.food>0?"toFood":"toForage";n.site=null;n.workLeft=0;record(w,n,"Interrupção imediata","Fome crítica; atividade incompleta descartada e carga preservada");return true;}
   if(n.sleepNeed>96&&n.phase!=="toSleep"&&n.phase!=="sleep"){n.phase="toSleep";n.site=null;n.workLeft=0;record(w,n,"Interrupção imediata","Privação de sono crítica; progresso parcial descartado");return true;}
   if(n.phase==="toDepot"&&n.hunger<12){n.phase="toFood";record(w,n,"Interrompeu transporte","Fome crítica; carga preservada");return true;}
   if(n.phase==="idle"||n.phase==="social"||n.phase==="rest"){
     if(n.hunger<34){n.phase=w.stock.food>0?"toFood":"toForage";n.site=null;record(w,n,"Procurar comida","Saciedade "+Math.round(n.hunger)+"%; alimento "+(w.stock.food>0?"no depósito":"natural"));return true;}
     if(n.sleepNeed>86&&n.energy>14){n.phase="toSleep";n.site=null;record(w,n,"Procurar abrigo","Necessidade diária de sono");return true;}
   }
   return false;
 }
 function beginTick(w,sites){ensure(w,sites);}
 function endTick(w,sites){
   const L=ensure(w,sites);
   for(const s of sites){const r=L.resources[s.id];if(!r)continue;r.amount=Math.min(r.max,r.amount+r.regen);}
   for(const n of w.npcs){
     n.hunger=Math.max(0,n.hunger-(n.phase==="work"?.024:.009));
     if(n.phase!=="sleep")n.sleepNeed=Math.min(100,n.sleepNeed+.028);
     if(n.hunger===0)n.health=Math.max(1,n.health-.015);
     const st=L.stats[n.id];st.minutes[n.phase]=(st.minutes[n.phase]||0)+1;
     
     const old=n._labPrevious||{};if(n.phase!==old.phase){
       if(n.phase==="rest"||n.phase==="toRest")st.interruptions++;
       if(n.phase==="work")record(w,n,"Iniciou trabalho","Local "+n.site);
       if(n.phase==="toDepot"&&n.cargo){st.produced+=n.cargo.qty;st.tasks++;record(w,n,"Produziu recursos","Carga "+itemText(n.cargo)+"; ainda fora do depósito");}
       if(old.phase==="toDepot"&&n.phase==="idle"&&!n.cargo){st.deliveries++;record(w,n,"Entregou carga","Estoque aumentado após chegada ao depósito");}
       n._labPrevious={phase:n.phase};
     }
   }
 }
 function harvest(w,s,qty){const r=source(w,s.id);if(!r)return 0;let n=Math.max(0,Math.min(qty,Math.floor(r.amount),Math.floor(free(w)/(weights[s.resource]||1))));r.amount-=n;return n;}
 function mount(){
   if(panel)return;
   const side=document.querySelector(".side");
   if(!side)return;
   const section=document.createElement("section");section.className="panel";section.id="lab-panel";
   section.innerHTML='<div class="row" style="justify-content:space-between"><h2>🔎 Laboratório ao vivo</h2><button id="lab-export" type="button">Exportar JSON</button></div><div class="row" style="margin:8px 0"><label for="lab-scenario">Cenário</label><select id="lab-scenario"><option value="food">Escassez de alimentos</option><option value="forest">Floresta exaurida</option><option value="storage">Depósito lotado</option><option value="fatigue">Exaustão coletiva</option><option value="normal">Condições normais</option></select><button id="lab-apply">Aplicar</button></div><div class="row" style="margin-bottom:8px"><button id="lab-zoom-in">Zoom +</button><button id="lab-zoom-out">Zoom −</button><button id="lab-follow">Seguir NPC</button></div><div id="lab-summary" class="notice"></div><div id="lab-roster" class="lab-roster" aria-label="Selecionar moradores"></div><div id="lab-inspection"></div><div id="lab-history" class="log" style="max-height:160px"></div>';
   side.prepend(section);panel=section;
   panel.querySelector("#lab-roster").addEventListener("click",e=>{const b=e.target.closest("[data-lab-npc]");if(!b)return;selected={kind:"npc",id:b.dataset.labNpc};window.VilaSelectNPC?.(b.dataset.labNpc);following=false;panel.querySelector("#lab-follow").textContent="Seguir NPC";refresh(cur(),selected,window.VilaSites||[]);});
   panel.querySelector("#lab-apply").onclick=()=>scenario(cur(),panel.querySelector("#lab-scenario").value);
   panel.querySelector("#lab-export").onclick=()=>{const w=cur();const data=JSON.stringify({version:1,seed:w.seed,world:w,exportedAt:new Date().toISOString()},null,2);const url=URL.createObjectURL(new Blob([data],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="vila-viva-lab-dia-"+w.day+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
   panel.querySelector("#lab-zoom-in").onclick=()=>zoom(.2);
   panel.querySelector("#lab-zoom-out").onclick=()=>zoom(-.2);
   panel.querySelector("#lab-follow").onclick=()=>{following=!following;panel.querySelector("#lab-follow").textContent=following?"Parar de seguir":"Seguir NPC";};
   const cv=document.getElementById("map");cv.addEventListener("wheel",e=>{e.preventDefault();zoom(e.deltaY<0?.1:-.1)},{passive:false});
   cv.addEventListener("pointerdown",e=>{if(e.button!==0)return;pan={x:e.clientX,y:e.clientY,sx:cv.parentElement.scrollLeft,sy:cv.parentElement.scrollTop,moved:false};});
   cv.addEventListener("pointermove",e=>{if(!pan||!e.buttons)return;const dx=e.clientX-pan.x,dy=e.clientY-pan.y;if(Math.hypot(dx,dy)>7)pan.moved=true;if(pan.moved){cv.parentElement.scrollLeft=pan.sx-dx;cv.parentElement.scrollTop=pan.sy-dy;}});
   cv.addEventListener("pointerup",()=>{if(pan?.moved)suppressClick=true;pan=null;});
   cv.addEventListener("pointercancel",()=>{pan=null;});
 }
 function zoom(delta){camera=Math.max(1,Math.min(2.5,camera+delta));const cv=document.getElementById("map");cv.style.width=(camera*100)+"%";cv.style.maxWidth="none";cv.style.height="auto";cv.parentElement.style.overflow="auto";}
 function ignoreClick(){if(suppressClick){suppressClick=false;return true;}return false;}
 function pick(e,x,y,w,sites,TILE){
   ensure(w,sites);
   const targets=[{kind:"depot",x:13,y:8},{kind:"board",x:15,y:7},...w.lab.drops.map((d,i)=>({kind:"drop",id:i,x:d.x,y:d.y}))];
   const target=targets.find(t=>Math.hypot(t.x*TILE+20-x,t.y*TILE+20-y)<29);
   if(target){selected=target;refresh(w,target,sites);return true;}return false;
 }
 function refresh(w,current,sites){
   if(!panel||!w)return;ensure(w,sites);if(current&&current.kind!=="lab")selected=current;
   const total=w.lab.stats;const completed=Object.values(total).reduce((v,t)=>v+t.tasks,0);const delivered=Object.values(total).reduce((v,t)=>v+t.deliveries,0);const interruptions=Object.values(total).reduce((v,t)=>v+t.interruptions,0);
   panel.querySelector("#lab-summary").innerHTML="<b>Vila · "+w.npcs.length+" NPCs</b><p>Tarefas: "+completed+" · Entregas: "+delivered+" · Interrupções: "+interruptions+"</p><p>Estoque: "+used(w).toFixed(1)+"/"+w.lab.depotCapacity+" kg · Fontes regenerativas: "+Object.keys(w.lab.resources).length+"</p>";
   if(following && selected.kind==="npc"){const n=w.npcs.find(z=>z.id===selected.id);if(n){const cv=document.getElementById("map"),wrap=cv.parentElement;wrap.scrollLeft=n.x*40*camera-wrap.clientWidth/2;wrap.scrollTop=n.y*40*camera-wrap.clientHeight/2;}}
   const roster=panel.querySelector("#lab-roster");
   if(roster.dataset.world!==w.id||roster.children.length!==w.npcs.length){roster.dataset.world=w.id;roster.innerHTML=w.npcs.map(n=>'<button type="button" data-lab-npc="'+esc(n.id)+'">'+esc(n.name)+'</button>').join("");}
   for(const b of roster.querySelectorAll("button"))b.classList.toggle("selected",selected.kind==="npc"&&selected.id===b.dataset.labNpc);
   const ins=panel.querySelector("#lab-inspection");let out="";
   if(selected.kind==="npc"||selected.kind==="player"){
     const n=selected.kind==="player"?w.player:w.npcs.find(z=>z.id===selected.id);
     if(n){const st=w.lab.stats[n.id]||{tasks:0,deliveries:0,interruptions:0,minutes:{}};const minutes=Object.entries(st.minutes||{}).sort((a,b)=>b[1]-a[1]).slice(0,5);
       const recent=w.lab.decisions.filter(e=>e.npc===n.id).slice(0,6);
       out='<h3>'+esc(n.name||"Aventureiro")+' · '+esc(n.role||"Jogador")+'</h3>'+
       '<p class="muted">'+esc(n.phase)+' · Energia '+Math.round(n.energy)+'% · Saciedade '+Math.round(n.hunger??100)+'% · Sono pendente '+Math.round(n.sleepNeed??0)+'% · Saúde '+Math.round(n.health??100)+'%</p>'+
       '<div class="item"><b>Inventário / carga</b><span>'+esc(itemText(n.cargo))+'</span></div>'+
       '<div class="item"><b>Ferramenta</b><span>'+esc(n.equipment||"Nenhuma")+'</span></div>'+
       '<div class="item"><b>Capacidade da mochila</b><span>'+esc(n.carryCapacity||20)+' kg</span></div>'+
       '<div class="item"><b>Trabalhos / Entregas</b><span>'+st.tasks+' / '+st.deliveries+'</span></div>'+
       '<div class="item"><b>Interrupções</b><span>'+st.interruptions+'</span></div>'+
       '<div class="notice"><b>Última decisão:</b> '+esc(n.lastDecision?.action||"Aguardando")+'<p>'+esc(n.lastDecision?.reason||"Nenhuma registrada")+'</p></div>'+
       '<h3>Atividades acumuladas (minutos de mundo)</h3>'+
       (minutes.length?minutes.map(([phase,time])=>'<div class="item"><b>'+esc(phase)+'</b><span>'+time+'</span></div>').join(""):'<p class="muted">Nenhum dado ainda.</p>')+
       '<h3>Histórico individual de decisões</h3>'+
       (recent.length?recent.map(e=>'<div class="lab-decision"><small>Dia '+e.day+' · '+Math.floor(e.minute/60)+':'+String(e.minute%60).padStart(2,"0")+'</small><b>'+esc(e.action)+'</b><small>'+esc(e.reason)+'</small></div>').join(""):'<p class="muted">Aguardando primeiras decisões.</p>');}
   }else if(selected.kind==="site"){
     const s=sites.find(z=>z.id===selected.id);if(s){const r=source(w,s.id);out='<h3>'+esc(s.icon+" "+s.name)+'</h3><p class="muted">Recurso: '+(r?Math.floor(r.amount)+' / '+r.max:'Canteiro')+'</p><p class="muted">Regeneração: '+(r?r.regen.toFixed(3)+' / min':'não aplicável')+'</p>';}
   }else if(selected.kind==="depot")out='<h3>📦 Depósito</h3><p>'+used(w).toFixed(1)+' / '+w.lab.depotCapacity+' kg</p><p>Capacidade livre: '+free(w).toFixed(1)+' kg</p>'+Object.entries(w.stock).map(([k,v])=>'<div class="item"><b>'+esc(k)+'</b><span>'+v+'</span></div>').join("");
   else if(selected.kind==="board")out='<h3>📋 Quadro comunitário</h3><p class="muted">Demandas atuais observadas</p><p>Alimento: '+w.stock.food+' · Madeira: '+w.stock.wood+' · Pedra: '+w.stock.stone+'</p>';
   else if(selected.kind==="drop"){const d=w.lab.drops[selected.id];out=d?'<h3>📦 Carga abandonada</h3><p>'+esc(itemText(d))+'</p>':'';}
   ins.innerHTML=out;
   panel.querySelector("#lab-history").innerHTML='<b>Histórico de ações e decisões</b>'+w.lab.history.slice(0,12).map(e=>'<div><time>D'+e.day+' '+Math.floor(e.minute/60)+':'+String(e.minute%60).padStart(2,"0")+'</time> · <b>'+esc(e.name)+'</b>: '+esc(e.action)+'<small>'+esc(e.reason)+'</small></div>').join("");
 }
 function draw(w,ctx,tile){
   if(!w.lab)return;
   for(const [id,p] of Object.entries(w.lab.resources)){const s=(window.VilaSites||[]).find(x=>x.id===id);if(!s)continue;ctx.fillStyle="#fff3d0";ctx.font="10px system-ui";ctx.fillText(Math.floor(p.amount)+"/"+p.max,s.x*tile-5,s.y*tile+47);}
   ctx.font="20px sans-serif";ctx.fillText("📋",w.lab.board.x*tile,w.lab.board.y*tile);
   for(const d of w.lab.drops){ctx.font="18px sans-serif";ctx.fillText("📦",d.x*tile,d.y*tile);}
 }
 function scenario(w,id){
   if(!w)return;ensure(w,window.VilaSites||[]);
   if(id==="food")w.stock.food=0;
   if(id==="forest")w.lab.resources.forest.amount=0;
   if(id==="storage")w.lab.depotCapacity=used(w);
   if(id==="fatigue")w.npcs.forEach(n=>n.energy=2);
   if(id==="normal"){w.lab.depotCapacity=Math.max(170,used(w)+50);w.npcs.forEach(n=>{n.energy=Math.max(n.energy,70);n.hunger=Math.max(n.hunger,70)});w.stock.food+=20;}
   record(w,null,"Evento de laboratório: "+id,"Condições do mundo alteradas; NPCs devem reagir às regras normais");
   refresh(w,selected,window.VilaSites||[]);save();
 }
 return {ensure,choose,needsAction,beginTick,endTick,harvest,mount,pick,ignoreClick,refresh,draw,free,used,source};
})();