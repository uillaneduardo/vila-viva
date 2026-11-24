import {createUiVisual} from '../assets/visual.js';
const toolDefs=[
 ['inspect','Inspecionar','action.inspect'],
 ['npc','Habitante','action.add-npc'],
 ['wood','Floresta','action.add-wood'],
 ['stone','Pedreira','action.add-stone'],
 ['food','Macieira','action.add-food'],
 ['farm','Plantio','action.add-farm'],
 ['scenery','Cenário','action.add-scenery'],
 ['house','Construir','action.build'],
 ['events','Eventos','action.events'],
 ['stats','Métricas','action.metrics']
];
export function createHud({role,onTool,onClock,onSize,onPreset=()=>{},onBuildMode=()=>{}}){
 const el=id=>document.getElementById(id);
 const dock=el('dock');
 for(const [id,label,glyph] of toolDefs){
  const b=document.createElement('button');b.type='button';b.dataset.tool=id;
  b.className='dock-button'+(id==='inspect'?' active':'');
  b.innerHTML='<span class="glyph"></span><span class="dock-label"></span>';
  b.querySelector('.glyph').append(createUiVisual(glyph,{size:20}));
  b.querySelector('.dock-label').textContent=label;
  b.title=label;
  if(role!=='admin'&&id!=='inspect'){b.disabled=true;b.title='Ação disponível somente no Modo Deus';}
  if(['events','stats'].includes(id)){b.disabled=true;b.title='Sistema ainda não implementado';}
  b.addEventListener('click',()=>onTool(id));
  dock.append(b);
 }
 const speedButtons=[0,1,2,4].map(n=>el('speed'+n));
 speedButtons.forEach((b,i)=>{
  const speed=[0,1,2,4][i];if(speed===0)b.replaceChildren(createUiVisual('control.pause',{size:16}));
  if(role!=='admin'){b.disabled=true;b.title='Controle do mundo indisponível para jogador';}
  b.addEventListener('click',()=>onClock(speed));
 });
 const range=el('brushSize'),minus=el('brushMinus'),plus=el('brushPlus');
 const label=document.createElement('label');label.className='brush-preset';label.textContent='Tipo';
 const preset=document.createElement('select');preset.id='brushPreset';preset.setAttribute('aria-label','Tipo de elemento');
 label.append(preset);
 el('brushPanel').insertBefore(label,el('brushName').nextSibling);
 preset.addEventListener('change',()=>onPreset(preset.value));
 const modeLabel=document.createElement('label');modeLabel.className='brush-preset';modeLabel.textContent='Fase';
 const modeSelect=document.createElement('select');modeSelect.id='buildMode';modeSelect.setAttribute('aria-label','Estado inicial da construção');
 for(const [value,name] of [['site','Projeto (fase 1)'],['completed','Concluída']]){
  const option=document.createElement('option');option.value=value;option.textContent=name;modeSelect.append(option);
 }
 modeLabel.append(modeSelect);el('brushPanel').insertBefore(modeLabel,label.nextSibling);
 modeSelect.addEventListener('change',()=>onBuildMode(modeSelect.value));
 let buildingChoices=[['building.community_house','Casa Comunitária'],['building.depot','Depósito']];
 let farmingChoices=[['apple_tree','Macieira'],['carrot','Cenoura'],['potato','Batata']];
 range.addEventListener('input',()=>onSize(Number(range.value)));
 minus.addEventListener('click',()=>onSize(Math.max(1,Number(range.value)-1)));
 plus.addEventListener('click',()=>onSize(Math.min(15,Number(range.value)+1)));
 return {
  setFarmingSpecies(species){
   farmingChoices=Object.entries(species??{}).map(([id,def])=>[id,def.label]);
   if(dock.querySelector('[data-tool="farm"].active'))this.tool('farm');
  },
  setBlueprints(blueprints){
   buildingChoices=Object.entries(blueprints??{}).map(([id,definition])=>[id,definition.label]);
   if(dock.querySelector('[data-tool="house"].active'))this.tool('house');
  },
  tool(id){
   for(const button of dock.querySelectorAll('[data-tool]'))button.classList.toggle('active',button.dataset.tool===id);
   const brush=['npc','wood','stone','food','farm','scenery','house'].includes(id);
   const isHouse=id==='house';
   range.disabled=isHouse;minus.disabled=isHouse;plus.disabled=isHouse;
   if(isHouse){range.value='1';el('brushValue').textContent='2 × 2';el('brushCount').textContent='4 células ocupadas';}
   label.hidden=id!=='food'&&id!=='scenery'&&id!=='house'&&id!=='farm';
   modeLabel.hidden=id!=='house';
   if(id==='food'||id==='scenery'||id==='house'||id==='farm'){
    const items=id==='food'?[['apple_adult','Adulta'],['apple_seedling','Muda']]:
     id==='house'?buildingChoices:id==='farm'?farmingChoices:[['boulder','Pedra sólida'],['wall','Muro'],['statue','Estátua']];
    preset.replaceChildren(...items.map(([value,name])=>{const option=document.createElement('option');option.value=value;option.textContent=name;return option;}));
    onPreset(preset.value);
    if(id==='house')onBuildMode(modeSelect.value);
   }
   el('brushPanel').hidden=!brush;
   el('brushName').textContent=({npc:'Pincel · Habitante',wood:'Pincel · Floresta',stone:'Pincel · Pedreira',food:'Pincel · Macieira',farm:'Pincel · Plantio',scenery:'Pincel · Cenário',house:'Pincel · Construir'})[id]||'';
   el('toolBadge').textContent=({inspect:'Modo observar',npc:'Adicionar habitantes',wood:'Adicionar fontes de madeira',stone:'Adicionar pedreiras',food:'Plantar macieiras',farm:'Demarcar zona de cultivo',scenery:'Posicionar obstáculos sólidos',house:'Posicionar canteiro de obras'})[id]||id;
  },
  size(n){
   if(range.disabled)return;
   range.value=String(n);el('brushValue').textContent=n+' × '+n;el('brushCount').textContent=(n*n)+' célula'+(n===1?'':'s');
  },
  update(data){
   if(!data)return;
   const {world,clock,storageSummary}=data;
   el('worldName').textContent='Oturo / '+world.id;
   el('day').textContent='Dia '+String(clock.day).padStart(2,'0');
   el('clockTime').textContent=String(clock.hour).padStart(2,'0')+':'+String(clock.minute).padStart(2,'0');
   speedButtons.forEach((b,i)=>b.classList.toggle('active',[0,1,2,4][i]===clock.speed));
   speedButtons[0].replaceChildren(createUiVisual(clock.speed===0?'control.resume':'control.pause',{size:16}));
   el('population').textContent=world.entities.filter(e=>e.kind==='character'&&e.health>0).length+
    ' vivos · '+world.entities.filter(e=>e.kind==='character'&&e.health<=0).length+' falecidos';
   for(const resource of ['wood','food','stone']){
    el(resource+'Count').textContent=resource==='food'?(storageSummary?.food??'—'):(storageSummary?.[resource]??'—');
    el(resource+'Count').title=storageSummary?'Quantidade realmente armazenada em depósitos concluídos':'Nenhum depósito concluído';
   }
   el('worldTick').textContent='Tick '+world.tick;
  }
 };
}
