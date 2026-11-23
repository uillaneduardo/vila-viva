import {icon} from './icons.js';
const toolDefs=[
 ['inspect','Inspecionar','inspect'],
 ['npc','Habitante','npc'],
 ['wood','Floresta','wood'],
 ['stone','Pedreira','stone'],
 ['food','Alimento','food'],
 ['house','Construir','house'],
 ['events','Eventos','events'],
 ['stats','Métricas','stats']
];
export function createHud({role,onTool,onClock,onSize}){
 const el=id=>document.getElementById(id);
 const dock=el('dock');
 for(const [id,label,glyph] of toolDefs){
  const b=document.createElement('button');b.type='button';b.dataset.tool=id;
  b.className='dock-button'+(id==='inspect'?' active':'');
  b.innerHTML='<span class="glyph">'+icon(glyph,20)+'</span><span class="dock-label">'+label+'</span>';
  b.title=label;
  if(role!=='admin'&&id!=='inspect'){b.disabled=true;b.title='Ação disponível somente no Modo Deus';}
  if(['house','events','stats'].includes(id)){b.disabled=true;b.title='Sistema ainda não implementado';}
  b.addEventListener('click',()=>onTool(id));
  dock.append(b);
 }
 const speedButtons=[0,1,2,4].map(n=>el('speed'+n));
 speedButtons.forEach((b,i)=>{
  const speed=[0,1,2,4][i];if(speed===0)b.innerHTML=icon('pause',16);
  if(role!=='admin'){b.disabled=true;b.title='Controle do mundo indisponível para jogador';}
  b.addEventListener('click',()=>onClock(speed));
 });
 const range=el('brushSize'),minus=el('brushMinus'),plus=el('brushPlus');
 range.addEventListener('input',()=>onSize(Number(range.value)));
 minus.addEventListener('click',()=>onSize(Math.max(1,Number(range.value)-1)));
 plus.addEventListener('click',()=>onSize(Math.min(15,Number(range.value)+1)));
 return {
  tool(id){
   for(const button of dock.querySelectorAll('[data-tool]'))button.classList.toggle('active',button.dataset.tool===id);
   const brush=['npc','wood','stone','food'].includes(id);
   el('brushPanel').hidden=!brush;
   el('brushName').textContent=({npc:'Pincel · Habitante',wood:'Pincel · Floresta',stone:'Pincel · Pedreira',food:'Pincel · Alimento'})[id]||'';
   el('toolBadge').textContent=({inspect:'Modo observar',npc:'Adicionar habitantes',wood:'Adicionar fontes de madeira',stone:'Adicionar pedreiras',food:'Adicionar alimento'})[id]||id;
  },
  size(n){
   range.value=String(n);el('brushValue').textContent=n+' × '+n;el('brushCount').textContent=(n*n)+' célula'+(n===1?'':'s');
  },
  update(data){
   if(!data)return;
   const {world,clock,storageSummary}=data;
   el('worldName').textContent='Vila Viva / '+world.id;
   el('day').textContent='Dia '+String(clock.day).padStart(2,'0');
   el('clockTime').textContent=String(clock.hour).padStart(2,'0')+':'+String(clock.minute).padStart(2,'0');
   speedButtons.forEach((b,i)=>b.classList.toggle('active',[0,1,2,4][i]===clock.speed));
   speedButtons[0].innerHTML=icon(clock.speed===0?'play':'pause',16);
   el('population').textContent=world.entities.filter(e=>e.kind==='character').length+' habitantes';
   for(const resource of ['wood','food','stone']){
    el(resource+'Count').textContent=storageSummary?.[resource]??'—';
    el(resource+'Count').title=storageSummary?'Quantidade entregue em depósito':'Depósito ainda não implementado';
   }
   el('worldTick').textContent='Tick '+world.tick;
  }
 };
}
