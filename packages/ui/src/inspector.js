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
 el('follow').replaceChildren(createUiVisual('control.follow',{size:17}));el('follow').disabled=true;el('follow').title='Rota do NPC pode ser observada ao passar o mouse';
 function setSelection(id){
  if(selectedId!==id){selectedId=id;active='overview';sections='';lastContent='';collapsed=false;}
  if(!id)close();else if(collapsed)collapse();else open();
 }
 function render(entity,details,catalog,options={}){
  if(!entity||selectedId!==entity.id)return;
  const isNpc=entity.kind==='character';
  el('portrait').textContent=isNpc?(entity.health<=0?'☠':entity.name?.charAt(0).toUpperCase()||'?'):
   entity.kind==='construction'?'⌂':entity.kind==='planting_zone'?'▦':entity.kind==='obstacle'?'▣':({wood:'♣',stone:'◆',food:'●'})[entity.resourceType]||'■';
  el('panelName').textContent=entity.kind==='item'?(catalog?.items?.[entity.itemId]?.label??entity.itemId):isNpc?entity.name:entity.kind==='planting_zone'?
   ('Plantio · '+(catalog?.naturalSources?.[entity.sourceId]?.label??entity.sourceId)):entity.kind==='construction'?
   (catalog?.buildingBlueprints?.[entity.blueprintId]?.label||'Construção'):entity.kind==='obstacle'?
   (catalog?.scenery?.[entity.obstacleType]||'Obstáculo'):
   (entity.sourceId?catalog?.naturalSources?.[entity.sourceId]?.label:catalog?.resources?.[entity.resourceType])||'Recurso';
  el('panelDesc').textContent=entity.kind==='item'?'Item no chão · Disponível para recolhimento':isNpc?(entity.health<=0?'Falecido · Aguardando sepultamento':
    entity.ownerId?'Personagem jogador · Controle manual':
    entity.communityRole==='leader'?'Líder · Planejamento da comunidade':'Habitante · Decisões autônomas'):entity.kind==='planting_zone'?
   'Área de plantio · Sem bloqueio de passagem':entity.kind==='construction'?
   (entity.status==='destroyed'?'Ruína · Edificação destruída':entity.status==='completed'?'Edificação concluída':'Canteiro de obras · Construção em andamento'):entity.kind==='obstacle'?
   'Elemento estático · Não coletável':entity.sourceId?'Fonte viva · Cultivo':'Fonte de recurso';
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
    b.addEventListener('click',()=>{active=id;lastContent='';render(entity,details,catalog,options);});
    nav.append(b);
   }
   sections=signature;
  }
  for(const b of el('panelNav').children)b.classList.toggle('active',b.dataset.section===active);
  let html='';
  if(isNpc){
   const values=details?.attributes?.values;
   if(active==='overview'){
    const ai=entity.ai;
    html='<div class="quick-state"><strong>'+safe(entity.health<=0?'☠ Falecido':ai?.activity??'Aguardando')+
     '</strong><small>'+safe(entity.health<=0?
      ('Causa: '+(entity.causeOfDeath??'Indeterminada')+' · Morte no tick '+(entity.deathTick??'—')+
       (entity.bodyCarriedBy?' · Sendo transportado':' · Corpo no mapa')):
      ai?.reason??'Aguardando atribuição de tarefa')+'</small></div>';
    html+='<h3>Condição do habitante</h3><div class="stat-grid">'+bar('Saúde',entity.health,'#a8cca1')+bar('Energia',entity.energy,'#d9c18b')+
     bar('Saciedade',entity.satiety??100,'#e4ae81')+
     (values?bar('Humor',values.mood,'#9ec6cd'):'')+'</div>';
    html+='<h3>Informações</h3>'+row('Posição',entity.position.x+', '+entity.position.y)+row('Atividade',ai?.activity??'Aguardando')+
     row('Rota',ai?.route?.length?Math.max(0,ai.route.length-1)+' passos planejados':'Sem rota')+
     row('Destino',ai?.targetId??'Nenhum');
    html+='<h3>Últimas decisões</h3>';
    const decisions=details?.decisions??[];
    html+=decisions.length?decisions.slice(-6).reverse().map(item=>'<div class="data-row"><span>Tick '+safe(item.tick)+' · '+safe(item.activity)+'</span><strong style="max-width:50%;white-space:normal;text-align:right">'+safe(item.reason)+'</strong></div>').join(''):
     '<p class="empty">Nenhuma decisão autônoma registrada.</p>';
    if(entity.communityRole==='leader'){
     const plan=details?.leadership??entity.leadership;
     html+='<h3>Liderança e planejamento</h3>'+
      row('Função','Líder comunitário')+
      row('Último projeto',catalog?.buildingBlueprints?.[plan?.lastBlueprintId]?.label??'Nenhum')+
      row('Última avaliação',plan?.lastPlanTick??'—')+
      '<p class="empty">'+safe(plan?.lastReason??'Avaliando as necessidades do assentamento')+'</p>'+
      row('Última receita',catalog?.recipes?.[plan?.lastRecipeId]?.label??'Nenhuma')+
      row('Tick de produção',plan?.lastProductionTick??'—')+
      '<p class="empty">'+safe(plan?.productionReason??'Ainda sem necessidade produtiva')+'</p>';
    }
    html+='<h3>Identidade e traços</h3>';
    for(const id of entity.traits??[]){
     const trait=catalog?.traits?.[id];
     const affinities=Object.entries(trait?.affinities??{}).map(([domain,factor])=>
      domain+' ×'+Number(factor).toFixed(2)).join(' · ');
     html+=row(trait?.label??id,(trait?.description??'Característica pessoal')+
      (affinities?' · '+affinities:''));
    }
    html+='<h3>Equipamentos e riscos</h3>';
    const gear=entity.equipment?.tool;
    const risk=details?.survival?.risk;
    html+=row('Ferramenta',catalog?.tools?.[gear]??'Nenhuma')+row('Ferimentos sofridos',entity.injuries??0);
    if(risk)html+=row('Risco madeira',(risk.wood*100).toFixed(1)+'%')+
      row('Risco mineração',(risk.stone*100).toFixed(1)+'%')+
      row('Risco de obra',(risk.building*100).toFixed(1)+'%')+
      row('Risco ferro',(risk.iron*100).toFixed(1)+'%')+
      row('Risco cobre',(risk.copper*100).toFixed(1)+'%')+
      row('Risco fabricação',(risk.manufacturing*100).toFixed(1)+'%');
    if(options.role==='admin'&&!entity.ownerId&&entity.health>0){
     html+='<label class="equipment-label">Equipamento de teste <select id="equipmentChoice" aria-label="Ferramenta do NPC">'+
      '<option value="">Sem ferramenta</option>'+
      Object.entries(catalog?.tools??{}).map(([id,label])=>'<option value="'+safe(id)+'" '+(gear===id?'selected':'')+'>'+safe(label)+'</option>').join('')+
      '</select></label><button class="context-action" id="equipNpc" type="button">Aplicar equipamento (Modo Deus)</button>';
    }
    html+='<h3>Inventário carregado</h3>';
    for(const [id,quantity] of Object.entries(entity.inventory??{}))
     if(quantity>0)html+=row(catalog?.items?.[id]?.label??id,quantity);
    if(!Object.values(entity.inventory??{}).some(quantity=>quantity>0))
     html+='<p class="empty">Inventário vazio.</p>';
    html+=row('Capacidade',Object.values(entity.inventory??{}).reduce((a,b)=>a+b,0)+' / 12');
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
   const completed=entity.status==='completed',destroyed=entity.status==='destroyed';
   const capabilities=details?.construction?.capabilities??{};
   html='<h3>'+ (destroyed?'Construção destruída':completed?'Construção concluída':'Etapa '+(entity.stageIndex+1)+' / '+(blueprint?.stages?.length??'—')) +'</h3>';
   html+=row('Projeto',blueprint?.label||entity.blueprintId)+row('Área',entity.footprint.width+' × '+entity.footprint.height+' células');
   html+=row('Estado',destroyed?'Destruída · bloqueia passagem':completed?'Disponível':stage?.label||'Canteiro');
   if(completed){
    html+='<h3>Capacidades desbloqueadas</h3>';
    for(const effect of blueprint?.effects??[])html+=row(effect.capability,capabilities[effect.capability]===undefined?'Inativa':capabilities[effect.capability]+' '+effect.unit);
    if(details?.construction?.housing){
     const housing=details.construction.housing;
     html+='<h3>Camas e reservas</h3>'+row('Camas',housing.beds)+row('Reservadas',housing.reserved)+row('Disponíveis',housing.beds-housing.reserved)+row('Vagas infantis',housing.dependentBeds??0)+row('Moradores permanentes',(housing.residents??[]).length);
     html+=housing.reservations.length?housing.reservations.map(r=>row(r.name,'Reserva até tick '+r.expiresTick)).join(''):
      '<p class="empty">Nenhuma cama reservada.</p>';
    }
    if(details?.construction?.cemetery){
     const graveyard=details.construction.cemetery;
     html+='<h3>Memorial · sepultamentos</h3>'+row('Vagas',graveyard.capacity)+
      row('Ocupadas',graveyard.burials.length)+row('Disponíveis',graveyard.free);
     html+=graveyard.burials.length?graveyard.burials.map(record=>
      '<div class="data-row"><span>'+safe(record.name)+'</span><strong>Tick '+safe(record.burialTick)+'</strong></div>').join(''):
      '<p class="empty">Nenhum habitante sepultado.</p>';
    }
    if(details?.construction?.mining){html+='<h3>Reservas subterrâneas</h3>'+Object.entries(details.construction.mining.remaining).map(([id,n])=>row(catalog?.items?.[id]?.label??id,n)).join('');}
    if(details?.construction?.production){
     const prod=details.construction.production;
     html+='<h3>Oficina · fabricação</h3>'+row('Estado',prod.active?
      (prod.ready?'Pronta para trabalhar':'Aguardando insumos'):'Sem ordens');
     for(const order of prod.orders){
      const recipe=catalog?.recipes?.[order.recipeId];
      html+=row(recipe?.label??order.recipeId,order.quantity+' lote(s) · '+
       order.workDone+' / '+(recipe?.workUnits??'?')+' trabalho');
     }
     for(const [item,missing] of Object.entries(prod.missing??{}))
      if(missing>0)html+=row('Necessário: '+(catalog?.items?.[item]?.label??item),missing);
     if(options.role==='admin')html+='<h4>Solicitar receita (homologação)</h4>'+
      prod.recipes.map(id=>'<button type="button" class="context-action" data-construction-action="production.order" data-recipe="'+safe(id)+'">'+
      safe(catalog?.recipes?.[id]?.label??id)+'</button>').join('');
    }
    if(details?.construction?.storage){
     const storage=details.construction.storage;
     html+='<h3>Estoque físico</h3>'+row('Ocupação',storage.total+' / '+storage.capacity)+
      row('Espaço livre',storage.free);
     for(const [category,title] of Object.entries(catalog?.itemCategories??{})){
      const accepted=storage.accepted.filter(id=>catalog?.items?.[id]?.category===category);
      if(!accepted.length)continue;
      const count=accepted.reduce((sum,id)=>sum+(storage.stock?.[id]??0),0);
      html+='<details class="stock-category" data-category="'+safe(category)+'" '+(count>0?'open':'')+'>'+
       '<summary>'+safe(title)+' <strong>'+count+'</strong></summary>';
      for(const item of accepted){
       const name=catalog?.items?.[item]?.label??item,quantity=storage.stock?.[item]??0;
       html+='<div class="stock-item"><span>'+safe(name)+'</span><strong>'+quantity+'</strong>';
       if(options.role==='admin'&&storage.free>0)
        html+='<button type="button" class="stock-add" title="Adicionar para testes" data-construction-action="storage.admin_supply" data-material="'+safe(item)+'" data-amount="'+Math.min(12,storage.free)+'">+</button>';
       html+='</div>';
      }
      html+='</details>';
     }
     html+='<p class="empty">Os estoques só aumentam por entregas físicas, conclusão de receitas ou suprimento explícito do Modo Deus.</p>';
    }else html+='<p class="empty">Capacidades ativadas somente após concluir a construção.</p>';
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
   if(destroyed)html+='<p class="empty">Ruína: sem efeitos ou serviços. O terreno permanece bloqueado até a remoção.</p>';
   if(options.role==='admin'){
    html+='<h3>Gerenciar construção</h3>';
    if(!destroyed)html+='<button type="button" class="context-action" data-construction-action="construction.destroy">Destruir construção (manter ruína)</button>';
    html+='<button type="button" class="context-action" data-construction-action="construction.remove">Remover construção do mapa</button>';
    html+='<p class="empty">A remoção descarta todo material/estoque associado. Não há reembolso nesta versão.</p>';
   }
   html+=row('Posição',entity.position.x+', '+entity.position.y);
  }else if(entity.kind==='planting_zone'){
   const def=catalog?.naturalSources?.[entity.sourceId],farm=details?.farming;
   html='<h3>Zona de cultivo</h3>'+
    row('Espécie',def?.label??entity.sourceId)+
    row('Área',entity.footprint.width+' × '+entity.footprint.height+' células')+
    row('Plantadas',farm?.planted??0)+
    row('Livres',Math.max(0,(farm?.capacity??0)-(farm?.planted??0)))+
    row('Prontas para colher',farm?.ready??0)+
    row('Semente exigida',def?.seedItem??'—')+
    row('Sementes por colheita',def?.seedsPerHarvest??0)+
    row('Ciclo',def?.growthMode==='perennial'?'Perene':'Safra única')+
    row('Colisão','Área atravessável');
   html+='<p class="empty">Os habitantes precisam carregar sementes reais ou retirá-las do depósito para plantar.</p>';
   if(options.role==='admin')html+='<button type="button" class="context-action" data-construction-action="farming.zone.remove">Remover zona (manter plantas)</button>';
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
    row('Produz',catalog?.foods?.[entity.productId]?.label??entity.productId)+row('Disponível',entity.quantity+' / '+entity.maximum)+
    row('Semente gerada',def?.seedItem+' × '+def?.seedsPerHarvest)+
    row('Ciclo',def?.growthMode==='single_harvest'?'Safra única':'Perene')+
    row('Produção',entity.life.stage==='mature'||entity.life.stage==='old'?
      def?.growthMode==='single_harvest'?'Colheita única':'+'+def?.production?.amount+' / '+def?.production?.intervalTicks+' ticks':'Inativa nesta etapa')+
    row('Progresso',entity.life.productionProgress+' / '+(def?.production?.intervalTicks??'—')+' ticks')+
    row('Colisão',def?.blocksMovement?'Bloqueia passagem':'Atravessável')+row('Posição',entity.position.x+', '+entity.position.y);
   html+='<h3>Coleta física</h3><p class="empty">A colheita produz alimento e sementes no inventário do personagem, não no depósito.</p>';
   if(options.role==='admin'||options.role==='player')
    html+='<button type="button" id="harvestSelected" class="context-action" '+(options.canHarvest?'':'disabled')+'>'+
     (options.role==='admin'?'Testar colheita com NPC adjacente':'Colher alimento')+'</button>'+
     (options.canHarvest?'':'<p class="empty">Requer personagem adjacente, energia e espaço livre.</p>');
  }else if(entity.kind==='item')html='<h3>Item físico</h3>'+row('Quantidade',entity.quantity)+row('Posição',entity.position.x+', '+entity.position.y);
  else html='<h3>Fonte de recurso</h3>'+row('Tipo',catalog?.resources?.[entity.resourceType]||entity.resourceType)+row('Disponível',entity.quantity+' unidades')+row('Capacidade',entity.maximum+' unidades')+row('Posição',entity.position.x+', '+entity.position.y);
  if(lastContent!==html){const scroll=el('panelScroll');const previous=scroll.scrollTop;
   const expanded=new Map([...el('panelBody').querySelectorAll('.stock-category')].map(e=>[e.dataset.category,e.open]));
   el('panelBody').innerHTML=html;
   for(const category of el('panelBody').querySelectorAll('.stock-category'))
    if(expanded.has(category.dataset.category))category.open=expanded.get(category.dataset.category);
   scroll.scrollTop=previous;lastContent=html;
   el('harvestSelected')?.addEventListener('click',()=>onHarvest(entity.id));
   el('equipNpc')?.addEventListener('click',()=>onConstruction(entity.id,'npc.admin_equip',
    {tool:el('equipmentChoice').value||null}));
   for(const button of el('panelBody').querySelectorAll('[data-construction-action]')){
    button.addEventListener('click',()=>{
     const action=button.dataset.constructionAction;
     const parameters=['construction.admin_supply','storage.admin_supply'].includes(action)?
      {materialId:button.dataset.material,quantity:Number(button.dataset.amount)}:
      action==='construction.admin_work'?{workUnits:Number(button.dataset.amount)}:
      action==='production.order'?{recipeId:button.dataset.recipe,quantity:1}:{};
     onConstruction(entity.id,action,parameters);
    });
   }}
 }
 return {setSelection,render,close};
}
