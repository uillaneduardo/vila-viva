import {brushCells} from '../../renderer/src/camera.js';
import {createUiVisual} from '../assets/visual.js';
import {godMenuOptions,BUILD_MODES,HAS_GOD_SUBMENU} from './god-menu-definitions.js';
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
export function createHud({role,onTool,onClock,onSize,onShape=()=>{},onPreset=()=>{},onBuildMode=()=>{}}){
 const el=id=>document.getElementById(id);
 const dock=el('dock'),submenu=el('godSubmenu'),choices=el('godSubmenuChoices'),
  submenuLabel=el('godSubmenuLabel'),modes=el('godBuildModes'),
  modeChoices=el('godBuildModeChoices');
 let currentTool='inspect',buildMode='site',blueprints={},farmingSpecies={
  apple_tree:{label:'Macieira'},carrot:{label:'Cenoura'},potato:{label:'Batata'},medicinal_herb:{label:'Erva medicinal'}
 };
 const selectedByTool=new Map();
 const range=el('brushSize'),minus=el('brushMinus'),plus=el('brushPlus'),shapeButton=el('brushShape');
 let brushShape='square';
 const updateBrushCount=n=>{
  const count=brushCells({x:20,y:20},n,{width:40,height:40},currentTool==='farm'?'square':brushShape).length;
  el('brushCount').textContent=count+' célula'+(count===1?'':'s');
 };
 const renderShape=()=>{
  shapeButton.textContent=brushShape==='circle'?'◯':'□';
  shapeButton.title=brushShape==='circle'?'Formato circular':'Formato quadrado';
  shapeButton.setAttribute('aria-label','Formato do pincel: '+(brushShape==='circle'?'circular':'quadrado'));
  shapeButton.setAttribute('aria-pressed',String(brushShape==='circle'));
 };
 const brushTools=['npc','wood','stone','food','farm','scenery','house'];
 const brushTitles={npc:'Pincel · Habitante',wood:'Pincel · Floresta',stone:'Pincel · Pedreira',
  food:'Pincel · Macieira',farm:'Pincel · Plantio',scenery:'Pincel · Cenário',house:'Pincel · Construir'};
 const tips={inspect:'Modo observar',npc:'Adicionar habitantes ou líder',wood:'Adicionar fontes de madeira',
  stone:'Adicionar pedra ou jazidas minerais',food:'Plantar macieiras',farm:'Demarcar zona de cultivo',
  scenery:'Posicionar obstáculos sólidos',house:'Posicionar canteiro de obras'};
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
 const updateHouseArea=()=>{
  const selected=selectedByTool.get('house');
  const area=blueprints[selected]?.footprint??{width:2,height:2};
  el('brushValue').textContent=area.width+' × '+area.height;
  el('brushCount').textContent=area.width*area.height+' células ocupadas';
 };
 const makeTile=(item,kind,onClick)=>{
  const button=document.createElement('button');button.type='button';
  button.className='god-submenu-tile';button.dataset[kind]=item.id;
  button.title=item.label+(item.description?' · '+item.description:'');
  button.setAttribute('aria-label',button.title);
  const glyph=document.createElement('span');glyph.className='glyph';
  glyph.append(createUiVisual(item.icon,{size:20}));
  const label=document.createElement('span');label.className='god-submenu-tile-label';
  label.textContent=item.label;
  button.append(glyph,label);
  if(item.description){
   const meta=document.createElement('small');meta.className='god-submenu-tile-meta';
   meta.textContent=item.description;
   button.append(meta);
  }
  button.addEventListener('click',()=>onClick(item.id));
  return button;
 };
 const applySelection=(container,kind,value)=>{
  for(const button of container.children){
   const active=button.dataset[kind]===value;
   button.classList.toggle('active',active);
   button.setAttribute('aria-pressed',String(active));
  }
 };
 const selectPreset=value=>{
  if(![...choices.children].some(button=>button.dataset.preset===value))return;
  selectedByTool.set(currentTool,value);
  applySelection(choices,'preset',value);
  onPreset(value);
  if(currentTool==='house')updateHouseArea();
 };
 const selectMode=value=>{
  if(!BUILD_MODES.some(item=>item.id===value))return;
  buildMode=value;
  applySelection(modeChoices,'buildMode',value);
  onBuildMode(value);
 };
 const renderSubmenu=()=>{
  const options=godMenuOptions(currentTool,{blueprints,farmingSpecies});
  if(role!=='admin'||!options.length||!HAS_GOD_SUBMENU.includes(currentTool)){
   submenu.hidden=true;choices.replaceChildren();return;
  }
  const selected=selectedByTool.get(currentTool);
  const chosen=options.some(item=>item.id===selected)?selected:options[0].id;
  submenuLabel.textContent=currentTool==='house'?'Construção':currentTool==='farm'?'Cultivo':'Tipo';
  choices.replaceChildren(...options.map(item=>makeTile(item,'preset',selectPreset)));
  modes.hidden=currentTool!=='house';
  if(currentTool==='house'){
   modeChoices.replaceChildren(...BUILD_MODES.map(item=>makeTile(item,'buildMode',selectMode)));
   selectMode(buildMode);
  }
  submenu.hidden=false;
  selectPreset(chosen);
 };
 range.addEventListener('input',()=>onSize(Number(range.value)));
 minus.addEventListener('click',()=>onSize(Math.max(1,Number(range.value)-1)));
 plus.addEventListener('click',()=>onSize(Math.min(15,Number(range.value)+1)));
 shapeButton.addEventListener('click',()=>onShape(brushShape==='circle'?'square':'circle'));
 renderShape();
 return {
  setFarmingSpecies(species){
   farmingSpecies=species??{};
   if(currentTool==='farm')renderSubmenu();
  },
  setBlueprints(definitions){
   blueprints=definitions??{};
   if(currentTool==='house')renderSubmenu();
  },
  tool(id){
   currentTool=id;
   for(const button of dock.querySelectorAll('[data-tool]'))
    button.classList.toggle('active',button.dataset.tool===id);
   const brush=brushTools.includes(id)&&role==='admin';
   const isHouse=id==='house';
   range.disabled=isHouse;minus.disabled=isHouse;plus.disabled=isHouse;
   shapeButton.hidden=isHouse||id==='farm';
   if(!isHouse){const n=Number(range.value);el('brushValue').textContent=n+' × '+n;updateBrushCount(n);}
   el('brushPanel').hidden=!brush;
   el('brushName').textContent=brushTitles[id]??'';
   el('toolBadge').textContent=tips[id]??id;
   renderSubmenu();
   if(isHouse)updateHouseArea();
  },
  shape(value){brushShape=value==='circle'?'circle':'square';renderShape();updateBrushCount(Number(range.value));},
  size(n){
   if(range.disabled)return;
   range.value=String(n);el('brushValue').textContent=n+' × '+n;
   updateBrushCount(n);
  },
  update(data){
   if(!data)return;
   const {world,clock,storageSummary}=data;
   el('worldName').textContent='Oturo / '+world.id;
   el('day').textContent='Dia '+String(clock.day).padStart(2,'0');
   el('clockTime').textContent=String(clock.hour).padStart(2,'0')+':'+String(clock.minute).padStart(2,'0');
   speedButtons.forEach((b,i)=>b.classList.toggle('active',[0,1,2,4][i]===clock.speed));
   if(speedButtons[0].dataset.paused!==String(clock.speed===0)){speedButtons[0].dataset.paused=String(clock.speed===0);speedButtons[0].replaceChildren(createUiVisual(clock.speed===0?'control.resume':'control.pause',{size:16}));}
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
