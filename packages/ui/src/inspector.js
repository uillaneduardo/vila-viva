import {icon} from './icons.js';
const names={overview:'Resumo',health:'Atributos',effects:'Efeitos',box:'Inventário'};
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const row=(k,v)=>'<div class="data-row"><span>'+safe(k)+'</span><strong>'+safe(v)+'</strong></div>';
const bar=(label,value,color)=>{
 const n=Math.max(0,Math.min(100,Number(value)||0));
 return '<div class="stat"><div class="stat-head"><span>'+safe(label)+'</span><strong>'+Math.round(n)+'%</strong></div><div class="track"><div class="fill" style="width:'+n+'%;background:'+color+'"></div></div></div>';
};
export function createInspector(){
 const el=id=>document.getElementById(id);
 let selectedId=null,active='overview',collapsed=false,sections='',lastContent='';
 const open=()=>{el('panel').hidden=false;el('expand').hidden=true;};
 const close=()=>{el('panel').hidden=true;el('expand').hidden=true;};
 const collapse=()=>{collapsed=true;el('panel').hidden=true;el('expand').hidden=false;};
 el('collapse').innerHTML=icon('collapse',18);
 el('expand').innerHTML=icon('expand',18);
 el('collapse').addEventListener('click',collapse);
 el('expand').addEventListener('click',()=>{collapsed=false;open();});
 el('follow').innerHTML=icon('follow',17);el('follow').disabled=true;el('follow').title='Seguir NPC disponível após implementação do movimento';
 function setSelection(id){
  if(selectedId!==id){selectedId=id;active='overview';sections='';lastContent='';collapsed=false;}
  if(!id)close();else if(collapsed)collapse();else open();
 }
 function render(entity,details,catalog){
  if(!entity||selectedId!==entity.id)return;
  const isNpc=entity.kind==='character';
  el('portrait').textContent=isNpc?entity.name?.charAt(0).toUpperCase()||'?':({wood:'♣',stone:'◆',food:'●'})[entity.resourceType]||'■';
  el('panelName').textContent=isNpc?entity.name:catalog?.resources?.[entity.resourceType]||'Recurso';
  el('panelDesc').textContent=isNpc?'Personagem · Sem atividade registrada':'Fonte de recurso';
  const allowed=isNpc?['overview','health','effects']:['overview'];
  if(!allowed.includes(active))active='overview';
  const signature=allowed.join(',');
  if(signature!==sections){
   const nav=el('panelNav');nav.replaceChildren();
   for(const id of allowed){
    const b=document.createElement('button');b.type='button';b.dataset.section=id;
    b.className='nav-item';b.title=names[id];b.setAttribute('aria-label',names[id]);
    b.innerHTML=icon(id,19)+'<span>'+names[id]+'</span>';
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
    html+='<h3>Informações</h3>'+row('Posição',entity.position.x+', '+entity.position.y)+row('Atividade','Não disponível')+row('Rota','Pathfinder pendente')+row('Inventário','Sistema pendente');
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
    html='<h3>Efeitos ativos</h3>'+(effects.length?effects.map(e=>'<article class="effect">'+icon('effects',18)+'<div><strong>'+safe(e.name)+'</strong><small>Fonte: '+safe(e.sourceId)+' · '+(e.expiresAtTick===null?'Condicional/permanente':'Expira no tick '+safe(e.expiresAtTick))+'</small></div></article>').join(''):'<p class="empty">Nenhum efeito ativo.</p>');
   }
  }else html='<h3>Fonte natural</h3>'+row('Tipo',catalog?.resources?.[entity.resourceType]||entity.resourceType)+row('Disponível',entity.quantity+' unidades')+row('Capacidade máxima',entity.maximum+' unidades')+row('Regeneração','Sistema pendente')+row('Posição',entity.position.x+', '+entity.position.y);
  if(lastContent!==html){const scroll=el('panelScroll');const previous=scroll.scrollTop;el('panelBody').innerHTML=html;scroll.scrollTop=previous;lastContent=html;}
 }
 return {setSelection,render,close};
}
