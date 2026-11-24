import {createUiVisual} from '../assets/visual.js';
const names={overview:'Resumo',health:'Atributos',effects:'Efeitos',box:'Inventário'};
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const row=(k,v)=>'<div class="data-row"><span>'+safe(k)+'</span><strong>'+safe(v)+'</strong></div>';
const bar=(label,value,color)=>{
 const n=Math.max(0,Math.min(100,Number(value)||0));
 return '<div class="stat"><div class="stat-head"><span>'+safe(label)+'</span><strong>'+Math.round(n)+'%</strong></div><div class="track"><div class="fill" style="width:'+n+'%;background:'+color+'"></div></div></div>';
};
export function createInspector({onHarvest=()=>{},onConstruction=()=>{}}={}){
 const el=id=>document.getElementById(id);
 let selectedId=null,active='overview',collapsed=false,sections='',lastContent='';
 const open=()=>{el('panel').hidden=false;el('expand').hidden=true;};
 const close=()=>{el('panel').hidden=true;el('expand').hidden=true;};
 const collapse=()=>{collapsed=true;el('panel').hidden=true;el('expand').hidden=false;};
 el('collapse').replaceChildren(createUiVisual('control.collapse',{size:18}));
 el('expand').replaceChildren(createUiVisual('control.expand',{size:18}));
 el('collapse').addEventListener('click',collapse);
 el('expand').addEventListener('click',()=>{collapsed=false;open();});
 el('follow').replaceChildren(createUiVisual('control.follow',{size:17}));el('follow').disabled=true;el('follow').title='Seguir NPC disponível após implementação do movimento';
 function setSelection(id){
  if(selectedId!==id){selectedId=id;active='overview';sections='';lastContent='';collapsed=false;}
  if(!id)close();else if(collapsed)collapse();else open();
 }
 function render(entity,details,catalog,options={}){
  if(!entity||selectedId!==entity.id)return;
  const isNpc=entity.kind==='character';
  el('portrait').textContent=isNpc?entity.name?.charAt(0).toUpperCase()||'?':
   entity.kind==='construction'?'⌂':entity.kind==='obstacle'?'▣':({wood:'♣',stone:'◆',food:'●'})[entity.resourceType]||'■';
  el('panelName').textContent=isNpc?entity.name:entity.kind==='construction'?
   (catalog?.buildingBlueprints?.[entity.blueprintId]?.label||'Construção'):entity.kind==='obstacle'?
   (catalog?.scenery?.[entity.obstacleType]||'Obstáculo'):
   (entity.sourceId?catalog?.naturalSources?.[entity.sourceId]?.label:catalog?.resources?.[entity.resourceType])||'Recurso';
  el('panelDesc').textContent=isNpc?'Personagem · Sem atividade registrada':entity.kind==='construction'?
   (entity.status==='completed'?'Edificação concluída':'Canteiro de obras · Construção em andamento'):entity.kind==='obstacle'?
   'Elemento estático · Não coletável':entity.sourceId?'Fonte viva · Produção renovável':'Fonte de recurso';
  const allowed=isNpc?['overview','health','effects']:['overview'];
  if(!allowed.includes(active))active='overview';
  const signature=allowed.join(',');
  if(signature!==sections){
   const nav=el('panelNav');nav.replaceChildren();
   for(const id of allowed){
    const b=document.createElement('button');b.type='button';b.dataset.section=id;
    b.className='nav-item';b.title=names[id];b.setAttribute('aria-label',names[id]);
    b.replaceChildren(createUiVisual(({overview:'section.overview',health:'section.attributes',effects:'section.effects'})[id]||'ui.unavailable',{size:19}));
    const text=document.createElement('span');text.textContent=names[id];b.append(text);
    b.addEventListener('click',()=>{active=id;lastContent='';render(entity,details,catalog);});
    nav.append(b);
   }
   sections=signature;
  }
  for(const b of el('panelNav').children)b.classList.toggle('active',b.dataset.section===active);
  let html='';
  if(isNpc){
   const values=details?.attributes?.values;
   if(active==='overview'){
    html='<div class="quick-state"><strong>Sem atividade registrada</strong><small>IA e tarefas ainda não implementadas</small></div>';
    html+='<h3>Condição do habitante</h3><div class="stat-grid">'+bar('Saúde',entity.health,'#a8cca1')+bar('Energia',entity.energy,'#d9c18b')+
      (values?bar('Humor',values.mood,'#9ec6cd'):'')+'</div>';
    html+='<h3>Informações</h3>'+row('Posição',entity.position.x+', '+entity.position.y)+row('Atividade','Não disponível')+row('Rota','Pathfinder pendente');
    html+='<h3>Inventário carregado</h3>'+row('Maçãs',entity.inventory?.apple??0)+row('Capacidade',Object.values(entity.inventory??{}).reduce((a,b)=>a+b,0)+' / 12');
   } else if(active==='health'){
    if(values){
     html='<h3>Atributos efetivos</h3>';
     for(const [id,label] of [['strength','Força'],['endurance','Resistência'],['agility','Agilidade'],['sociability','Sociabilidade'],['mood','Humor'],['moodMax','Limite de humor'],['movementSpeed','Velocidade'],['workRate','Produtividade'],['carryCapacity','Capacidade de carga']]){
      const value=values[id];const part=details.attributes.breakdown[id];
      html+=row(label,Number(value).toFixed(1)+(part?.sources?.length?' • Modificado':''));
     }
    }else html='<p class="empty">Atributos indisponíveis.</p>';
   } else if(active==='effects'){
    const effects=details?.effects??[];
    html='<h3>Efeitos ativos</h3>'+(effects.length?effects.map(e=>'<article class="effect">'+createUiVisual('section.effects',{size:18}).outerHTML+'<div><strong>'+safe(e.name)+'</strong><small>Fonte: '+safe(e.sourceId)+' · '+(e.expiresAtTick===null?'Condicional/permanente':'Expira no tick '+safe(e.expiresAtTick))+'</small></div></article>').join(''):'<p class="empty">Nenhum efeito ativo.</p>');
   }
  }else if(entity.kind==='construction'){
   const blueprint=catalog?.buildingBlueprints?.[entity.blueprintId];
   const stage=blueprint?.stages?.[entity.stageIndex];
   const completed=entity.status==='completed';
   const capabilities=details?.construction?.capabilities??{};
   html='<h3>'+ (completed?'Construção concluída':'Etapa '+(entity.stageIndex+1)+' / '+(blueprint?.stages?.length??'—')) +'</h3>';
   html+=row('Projeto',blueprint?.label||entity.blueprintId)+row('Área',entity.footprint.width+' × '+entity.footprint.height+' células');
   html+=row('Estado',completed?'Disponível':stage?.label||'Canteiro');
   if(completed){
    html+='<h3>Capacidades desbloqueadas</h3>';
    for(const effect of blueprint?.effects??[])html+=row(effect.capability,capabilities[effect.capability]===undefined?'Inativa':capabilities[effect.capability]+' '+effect.unit);
    html+='<p class="empty">Capacidades disponíveis para sistemas de moradia e convivência. Ainda não existem moradores atribuídos automaticamente.</p>';
   }else if(stage){
    html+='<h3>Materiais da etapa</h3>';
    for(const [material,required] of Object.entries(stage.materials)){
     const delivered=entity.delivered?.[material]??0,remaining=Math.max(0,required-delivered);
     html+=row(material==='wood'?'Madeira':material==='stone'?'Pedra':material,delivered+' / '+required);
     if(options.role==='admin'&&remaining>0)
      html+='<button type="button" class="context-action" data-construction-action="construction.admin_supply" data-material="'+safe(material)+'" data-amount="'+remaining+'">Adicionar '+remaining+' '+(material==='wood'?'madeiras':material==='stone'?'pedras':safe(material))+' (Modo Deus)</button>';
    }
    const ready=Object.entries(stage.materials).every(([material,required])=>(entity.delivered?.[material]??0)>=required);
    html+='<h3>Trabalho</h3>'+bar('Etapa',Math.round(entity.workDone/stage.workUnits*100),'#a8cca1')+
     row('Progresso',entity.workDone+' / '+stage.workUnits)+row('Bloqueio',ready?'Materiais entregues':'Aguardando materiais');
    if(options.role==='admin')
     html+='<button type="button" class="context-action" data-construction-action="construction.admin_work" data-amount="'+Math.min(15,stage.workUnits-entity.workDone)+'" '+(ready?'':'disabled')+'>Aplicar trabalho +'+Math.min(15,stage.workUnits-entity.workDone)+' (Modo Deus)</button>';
    html+='<p class="empty">Materiais de homologação são adicionados explicitamente pelo Modo Deus. Entrega física e trabalho por NPC estão disponíveis no motor, mas a IA logística ainda não foi implementada.</p>';
   }
   html+=row('Posição',entity.position.x+', '+entity.position.y);
  }else if(entity.kind==='obstacle'){
   html='<h3>Elemento de cenário</h3>'+row('Tipo',catalog?.scenery?.[entity.obstacleType]||entity.obstacleType)+
    row('Impede passagem',entity.blocksMovement?'Sim':'Não')+row('Minerável','Não')+
    row('Coletável','Não')+row('Posição',entity.position.x+', '+entity.position.y);
  }else if(entity.sourceId&&entity.life){
   const stages={seedling:'Muda',young:'Jovem',mature:'Adulta',old:'Envelhecida',dead:'Morta'};
   const def=catalog?.naturalSources?.[entity.sourceId];
   html='<h3>Ciclo de vida · '+safe(def?.label||entity.sourceId)+'</h3>'+
    row('Etapa',stages[entity.life.stage]||entity.life.stage)+row('Idade',entity.life.ageTicks+' ticks')+
    bar('Saúde',entity.life.health,'#a8cca1')+
    row('Produz','Maçãs')+row('Disponível',entity.quantity+' / '+entity.maximum)+
    row('Produção',entity.life.stage==='mature'||entity.life.stage==='old'?
      '+'+def?.production?.amount+' / '+def?.production?.intervalTicks+' ticks':'Inativa nesta etapa')+
    row('Progresso',entity.life.productionProgress+' / '+(def?.production?.intervalTicks??'—')+' ticks')+
    row('Colisão','Bloqueia passagem')+row('Posição',entity.position.x+', '+entity.position.y);
   html+='<h3>Coleta física</h3><p class="empty">A colheita coloca maçãs no inventário do personagem, não no depósito.</p>';
   if(options.role==='admin'||options.role==='player')
    html+='<button type="button" id="harvestSelected" class="context-action" '+(options.canHarvest?'':'disabled')+'>'+
     (options.role==='admin'?'Testar coleta com NPC adjacente':'Colher frutos')+'</button>'+
     (options.canHarvest?'':'<p class="empty">Requer personagem adjacente, energia e espaço livre.</p>');
  }else html='<h3>Fonte de recurso</h3>'+row('Tipo',catalog?.resources?.[entity.resourceType]||entity.resourceType)+row('Disponível',entity.quantity+' unidades')+row('Capacidade',entity.maximum+' unidades')+row('Posição',entity.position.x+', '+entity.position.y);
  if(lastContent!==html){const scroll=el('panelScroll');const previous=scroll.scrollTop;el('panelBody').innerHTML=html;scroll.scrollTop=previous;lastContent=html;
   el('harvestSelected')?.addEventListener('click',()=>onHarvest(entity.id));
   for(const button of el('panelBody').querySelectorAll('[data-construction-action]')){
    button.addEventListener('click',()=>onConstruction(entity.id,button.dataset.constructionAction,
     button.dataset.constructionAction==='construction.admin_supply'?
      {materialId:button.dataset.material,quantity:Number(button.dataset.amount)}:
      {workUnits:Number(button.dataset.amount)}));
   }}
 }
 return {setSelection,render,close};
}
