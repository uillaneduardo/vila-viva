import {workRows} from './work-profile.js';
const tabs=[['people','Habitantes'],['work','Trabalho'],['economy','Economia'],['leader','Liderança'],['events','Eventos'],['metrics','Métricas']];
export function createCommunityPanel(root,{onSelect=()=>{},onWorld=()=>{}}={}){
 const nav=root.querySelector('#communityTabs'),content=root.querySelector('#communityContent'),list=root.querySelector('#npcActivityList'),toggle=root.querySelector('#npcActivityToggle');
 let active='people',snapshot=null,catalog=null,metric=null,search='',sort='name',fingerprint='';
 const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 const line=(text)=>{const e=node('div',text);e.className='community-line';return e;};
 const body=node('div'),filter=node('div');filter.className='community-filter';
 const input=node('input');input.placeholder='Buscar habitante';input.setAttribute('aria-label','Buscar habitante');
 const select=node('select');select.setAttribute('aria-label','Ordenar habitantes');
 for(const [id,label] of [['name','Nome'],['preference','Afinidade'],['best','Multiplicador']]){const o=node('option',label);o.value=id;select.append(o);}
 filter.append(input,select);content.append(filter,body);
 input.addEventListener('input',()=>{search=input.value;render();});select.addEventListener('change',()=>{sort=select.value;render();});
 function collapse(){if(toggle.getAttribute('aria-expanded')==='true')toggle.click();}
 function render(){
  list.hidden=active!=='people';content.hidden=active==='people';filter.hidden=active!=='work';
  for(const b of nav.children)b.setAttribute('aria-pressed',String(b.dataset.tab===active));
  if(active==='people')return;
  const world=snapshot?.world;let rows=[];
  if(active==='work'){
   rows=workRows(world,catalog).filter(r=>(r.name+' '+r.preference).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))).sort((a,b)=>sort==='best'?(b.best??0)-(a.best??0)||a.name.localeCompare(b.name):a[sort].localeCompare(b[sort],'pt-BR'));
  }else if(active==='economy')rows=Object.entries(snapshot?.storageSummary??{}).map(([id,n])=>[catalog?.items?.[id]?.label??({food:'Alimentos',wood:'Madeira',stone:'Pedra'})[id]??id,n]).filter(([,n])=>typeof n==='number').map(([name,n])=>name+': '+n);
  else if(active==='leader'){const e=world?.entities.find(e=>e.kind==='character'&&e.communityRole==='leader'&&e.health>0);rows=e?[e.name,e.leadership?.lastReason??'Sem decisão de projeto',e.leadership?.productionReason??'Sem decisão produtiva','Matriz de prioridades ainda não implementada']:['Sem líder ativo'];}
  else if(active==='events')rows=(world?.entities??[]).filter(e=>e.kind==='character'&&!e.ownerId).flatMap(e=>(e.ai?.history??[]).map(h=>({name:e.name,...h}))).sort((a,b)=>b.tick-a.tick).slice(0,25).map(h=>'t'+h.tick+' · '+h.name+' · '+h.activity+' — '+h.reason);
  else if(active==='metrics')rows=metric?['FPS: '+metric.fps,'Atualizações/s: '+metric.updates,'KiB/s: '+Math.round(metric.bytes/1024),'RTT: '+(metric.rtt==null?'—':Math.round(metric.rtt)+' ms'),'Frame p95: '+(metric.frame?.toFixed(1)??'—')+' ms','Desenho p95: '+(metric.paint?.toFixed(1)??'—')+' ms']:['Aguardando amostras'];
  const key=JSON.stringify([active,rows]);if(key===fingerprint)return;fingerprint=key;const scroll=content.scrollTop;
  if(active==='work'){body.replaceChildren(...rows.map(r=>{const b=node('button');b.type='button';b.className='community-worker';b.append(node('strong',r.name+(r.leader?' · Líder':'')),node('small',r.preference+(r.best==null?'':' · '+r.best.toFixed(2)+'×')),node('small',r.activity));b.addEventListener('click',()=>onSelect(r.id));return b;}));if(!rows.length)body.append(line('Nenhum habitante encontrado.'));body.append(line('Afinidades individuais; prioridades do líder indisponíveis.'));}
  else{body.replaceChildren(...(rows.length?rows:['Sem dados disponíveis']).map(line));if(['economy','events'].includes(active)){const b=node('button','Abrir detalhes em Mundo');b.type='button';b.addEventListener('click',onWorld);body.append(b);}}
  content.scrollTop=scroll;
 }
 for(const [id,label] of tabs){const b=node('button',label);b.type='button';b.dataset.tab=id;b.addEventListener('click',()=>{active=id;render();});nav.append(b);}
 render();return {update(data,cat){snapshot=data;catalog=cat;render();},metrics(data){metric=data;if(active==='metrics')render();},collapse};
}
