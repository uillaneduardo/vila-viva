/** Read-only presentation adapter for the current world/NPC decision projection.
 * Does not schedule AI, change the simulation, or request a second polling stream.
 * Native <details> keeps keyboard interaction and expanded state between updates.
 */
const HISTORY_LIMIT=8;
export function npcActivityRows(world){
 return (world?.entities??[])
  .filter(entity=>entity?.kind==='character'&&!entity.ownerId)
  .map(entity=>{
   const records=Array.isArray(entity.ai?.history)?entity.ai.history:[];
   const history=records.slice(-HISTORY_LIMIT).reverse().map(item=>({
    tick:Number.isSafeInteger(item?.tick)?item.tick:null,
    activity:String(item?.activity??'Aguardando'),
    reason:String(item?.reason??''),
    targetId:item?.targetId??null
   }));
   const dead=entity.health<=0;
   return {
    id:entity.id,
    name:String(entity.name??'Habitante'),
    leader:entity.communityRole==='leader',
    dead,
    activity:dead?'Falecido':
     (entity.ai?.activity??history[0]?.activity??'Aguardando'),
    lastTick:Number.isSafeInteger(entity.ai?.lastDecisionTick)?
     entity.ai.lastDecisionTick:null,
    history
   };
  })
  .sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')||a.id.localeCompare(b.id));
}
function historyLine(item){
 const line=document.createElement('div');line.className='npc-monitor-event';
 const label=document.createElement('div');label.className='npc-monitor-event-head';
 const tick=document.createElement('span');tick.textContent=item.tick===null?'Tick —':'Tick '+item.tick;
 const activity=document.createElement('strong');activity.textContent=item.activity;
 label.append(tick,activity);
 const reason=document.createElement('p');reason.textContent=item.reason||'Sem justificativa registrada.';
 line.append(label,reason);
 return line;
}
function createEntry(row){
 const details=document.createElement('details');details.className='npc-monitor-entry';details.dataset.npcId=row.id;
 const summary=document.createElement('summary');summary.className='npc-monitor-summary';
 const indicator=document.createElement('span');indicator.className='npc-monitor-indicator';
 indicator.setAttribute('aria-hidden','true');
 const labels=document.createElement('span');labels.className='npc-monitor-labels';
 const name=document.createElement('strong');name.className='npc-monitor-name';
 const activity=document.createElement('small');activity.className='npc-monitor-last';
 labels.append(name,activity);
 const chevron=document.createElement('span');chevron.className='npc-monitor-chevron';chevron.setAttribute('aria-hidden','true');
 summary.append(indicator,labels,chevron);
 const history=document.createElement('div');history.className='npc-monitor-history';
 history.setAttribute('aria-label','Últimas decisões de '+row.name);
 details.append(summary,history);
 return {details,name,activity,indicator,history,fingerprint:null};
}
export function createNpcActivityMonitor(root){
 if(!root)return {update(){},clear(){}};
 const list=root.querySelector('#npcActivityList');
 const count=root.querySelector('#npcActivityCount');
 const toggle=root.querySelector('#npcActivityToggle');
 const entries=new Map();
 let timelineId,collapsed=false;
 function clear(){
  entries.clear();list.replaceChildren();
 }
 function setCollapsed(value){
  collapsed=value;
  root.classList.toggle('npc-monitor-collapsed',collapsed);
  toggle.setAttribute('aria-expanded',String(!collapsed));
  toggle.setAttribute('aria-label',collapsed?'Mostrar atividades':'Recolher atividades');
  toggle.title=collapsed?'Expandir janela de atividades':'Recolher janela de atividades';
  toggle.textContent=collapsed?'+':'−';
 }
 toggle.addEventListener('click',()=>setCollapsed(!collapsed));
 setCollapsed(false);
 function update(snapshot){
  if(!snapshot?.world)return;
  // Loading a named snapshot forks the activity timeline; old expanded rows must not leak.
  if(timelineId!==undefined&&snapshot.timelineId!==timelineId)clear();
  timelineId=snapshot.timelineId;
  const rows=npcActivityRows(snapshot.world);
  if(rows.length)list.querySelector('[data-empty-npcs]')?.remove();
  const seen=new Set(rows.map(row=>row.id));
  const scroll=list.scrollTop;
  for(const [id,entry] of entries)if(!seen.has(id)){
   entry.details.remove();entries.delete(id);
  }
  for(let i=0;i<rows.length;i++){
   const row=rows[i];
   let entry=entries.get(row.id);
   if(!entry){entry=createEntry(row);entries.set(row.id,entry);}
   if(entry.name.textContent!==row.name)entry.name.textContent=row.name;
   const latest=row.activity+(row.lastTick!==null?' · t'+row.lastTick:'');
   if(entry.activity.textContent!==latest)entry.activity.textContent=latest;
   entry.indicator.classList.toggle('is-dead',row.dead);
   entry.indicator.classList.toggle('is-leader',row.leader&&!row.dead);
   entry.history.setAttribute('aria-label','Últimas decisões de '+row.name);
   const fingerprint=JSON.stringify(row.history);
   if(entry.fingerprint!==fingerprint){
    const historyScroll=entry.history.scrollTop;
    if(row.history.length)entry.history.replaceChildren(...row.history.map(historyLine));
    else{
     const empty=document.createElement('p');empty.className='npc-monitor-empty';
     empty.textContent='Nenhuma decisão registrada até agora.';
     entry.history.replaceChildren(empty);
    }
    entry.history.scrollTop=historyScroll;
    entry.fingerprint=fingerprint;
   }
   if(list.children[i]!==entry.details)
    list.insertBefore(entry.details,list.children[i]??null);
  }
  list.scrollTop=scroll;
  const description=rows.length+' habitante'+(rows.length===1?'':'s');
  if(count.textContent!==description)count.textContent=description;
  if(!rows.length&&list.children.length===0){
   const message=document.createElement('p');message.className='npc-monitor-empty';
   message.dataset.emptyNpcs='true';
   message.textContent='Nenhum habitante na simulação.';
   list.append(message);
  }
 }
 return {update,clear};
}
