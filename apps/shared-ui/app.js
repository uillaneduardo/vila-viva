import {PerformanceWindow} from '../../packages/renderer/src/performance-window.js';
import {createMotionRenderAdapter} from '../../packages/renderer/src/motion-render-adapter.js';
import {createLayeredRenderAdapter} from '../../packages/renderer/src/layered-render-adapter.js';
import {createTickRenderAdapter} from '../../packages/renderer/src/tick-render-adapter.js';
import {connectWorld} from '../../packages/client-sdk/src/world-stream.js';
import {createUiVisual} from '../../packages/ui/assets/visual.js';
import {applyUiTheme} from '../../packages/ui/assets/themes/index.js';
import {SpriteLibrary} from '../../packages/renderer/src/sprites.js';
import {getWorldVisualPack} from '../../packages/renderer/src/visual-packs.js';
import {Scene} from '../../packages/renderer/src/scene.js';
import {brushCells} from '../../packages/renderer/src/camera.js';
import {createTouchGestures} from '../../packages/ui/src/touch-gestures.js';
import {createHud} from '../../packages/ui/src/hud.js';
import {createInspector} from '../../packages/ui/src/inspector.js';
import {createNpcActivityMonitor} from '../../packages/ui/src/npc-activity-monitor.js';
const el=id=>document.getElementById(id),role=document.body.dataset.role;
applyUiTheme(document.documentElement);
const surface=new Scene(el('game'),{spriteLibrary:new SpriteLibrary({pack:getWorldVisualPack(new URLSearchParams(location.search).get('visualPack')??undefined)})});
const rendererMode=new URLSearchParams(location.search).get('renderer');
const scene=rendererMode==='legacy'?surface:rendererMode==='tick'?createTickRenderAdapter(surface):rendererMode==='layered'?createLayeredRenderAdapter(surface):createMotionRenderAdapter(surface);
const inspector=createInspector({
 onHarvest:(id)=>void harvestSelected(id),
 onConstruction:(id,action,parameters)=>void executeConstruction(id,action,parameters)
});
const npcActivityMonitor=role==='admin'?createNpcActivityMonitor(el('npcActivityMonitor')):null;
let snapshot=null,catalog=null,selectedId=null,hoverId=null,tool='inspect',brushSize=1,brushShape='square',preset='apple_adult',buildMode='site';
let pan=null,painting=new Map(),loading=false,inspection=null,lastSpeed=1;
let stream=null,inspectAt=0,inspectSequence=0,visualEpoch=0,frames=0,fps=0,lastEpoch=null,lastHudAt=-Infinity;
const keys=new Set();
const frameIntervals=new PerformanceWindow(),paintCosts=new PerformanceWindow(),sampleGaps=new PerformanceWindow();
let lastVisualSample=null,lastFrameTime=null;
const request=async(path,options)=>{
 const response=await fetch(path,options),data=await response.json();
 if(!response.ok)throw Error(data.error||data.result?.error||'Falha na comunicação');
 return data;
};
const hud=createHud({
 role,
 onTool(id){
  tool=id;hud.tool(id);
  if(id==='farm'&&brushSize<3){brushSize=3;hud.size(brushSize);}
  scene.setBrush(['npc','wood','stone','food','farm','scenery','house'].includes(id)?
   {kind:id,size:id==='house'?1:brushSize,shape:brushShape,
    ...(id==='house'?{footprint:catalog?.buildingBlueprints?.[preset]?.footprint??{width:2,height:2}}:{})}:null);
  hoverId=null;scene.setHover(null);el('tooltip').hidden=true;
 },
 onPreset(value){
  preset=value;
  if(tool==='house')scene.setBrush({kind:'house',size:1,
   footprint:catalog?.buildingBlueprints?.[value]?.footprint??{width:2,height:2}});
 },
 onBuildMode(value){buildMode=value;},
 onSize(n){if(tool==='house')return;brushSize=n;hud.size(n);if(scene.brush)scene.setBrush({...scene.brush,size:n});},
 onShape(shape){brushShape=shape;hud.shape(shape);if(scene.brush)scene.setBrush({...scene.brush,shape});},
 onClock(speed){changeSpeed(speed);}
});
hud.tool('inspect');hud.size(1);
const status=message=>{el('statusMessage').textContent=message;};
const eventCoordinates=e=>{const rect=scene.canvas.getBoundingClientRect();return {x:e.clientX-rect.left,y:e.clientY-rect.top};};
function setSelection(entity){
 selectedId=entity?.id??null;inspector.setSelection(selectedId);scene.setSelection(selectedId);
 inspection=null;inspectSequence++;inspectAt=0;if(entity)refreshInspector(entity);
}
async function refreshInspector(entity){
 if(!entity||entity.id!==selectedId)return;
 const sequence=++inspectSequence;inspectAt=performance.now();
 try{
  const details=await request('/api/inspect?entityId='+encodeURIComponent(entity.id));
  if(entity.id!==selectedId||sequence!==inspectSequence)return;
  inspection=details;inspector.render(entity,details,catalog,{role,canHarvest:!!harvestActor(entity)});
 }catch(error){status('Falha na inspeção: '+error.message);}
}
/** God Mode may test a real NPC harvest only when one stands next to the source. */
function harvestActor(entity){
 if(!snapshot||entity?.kind!=='resource'||!catalog?.naturalSources?.[entity.sourceId]||
   entity.quantity<=0||entity.life?.stage==='dead')return null;
 const eligible=e=>e.kind==='character'&&e.health>0&&e.energy>0&&
  Math.abs(e.position.x-entity.position.x)+Math.abs(e.position.y-entity.position.y)===1;
 if(role==='admin')return snapshot.world.entities.find(e=>!e.ownerId&&eligible(e))||null;
 return snapshot.world.entities.find(e=>e.id===snapshot.playerId&&eligible(e))||null;
}
async function harvestSelected(sourceId){
 const source=snapshot?.world.entities.find(e=>e.id===sourceId);
 const actor=harvestActor(source);
 if(!actor){status('A coleta exige um personagem adjacente, com energia e espaço no inventário.');return;}
 const command={commandId:crypto.randomUUID(),action:'resource.harvest',targetId:sourceId,role:role==='admin'?'npc':'player'};
 if(role==='admin')command.actorId=actor.id;
 try{
  const data=await request('/api/commands',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(command)});
  if(!data.result?.ok)throw Error(data.result?.error||'Falha na coleta');
  status(actor.name+' colheu alimento e sementes. Itens disponíveis no chão.');
  await refresh();
 }catch(error){status('Falha na coleta: '+error.message);}
}

async function executeConstruction(siteId,action,parameters){
 const removal=action==='construction.remove'||action==='farming.zone.remove',
  destruction=action==='construction.destroy';
 if((removal||destruction)&&!window.confirm(action==='farming.zone.remove'?
   'Remover esta zona de cultivo? As plantas existentes permanecerão no mapa.':removal?
   'Remover definitivamente? A obra, estoque e reservas serão perdidos sem reembolso.':
   'Destruir? O edifício ficará em ruínas, bloqueando o terreno, com serviços e camas cancelados.'))return;
 try{
  const data=await request('/api/commands',{method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({commandId:crypto.randomUUID(),role:'admin',action,targetId:siteId,parameters})});
  if(!data.result?.ok)throw Error(data.result?.error||'Comando rejeitado');
  const messages={
   'construction.upgrade':'Melhoria planejada. Os NPCs entregarão materiais e realizarão o trabalho.',
   'construction.upgrade_cancel':'Melhoria cancelada. Materiais entregues devolvidos ao chão.',
   'construction.admin_supply':'Materiais inseridos no canteiro.',
   'storage.admin_supply':'Estoque de teste adicionado ao depósito.',
   'construction.remove':'Construção removida permanentemente do mapa.',
   'farming.zone.remove':'Zona removida; plantas existentes preservadas.',
   'construction.destroy':'Construção destruída; ruínas continuam bloqueando o terreno.',
   'npc.admin_equip':'Equipamento de teste aplicado ao NPC.',
   'construction.admin_work':'Trabalho aplicado à etapa atual.',
   'production.order':'Ordem de fabricação criada na oficina.'
  };
  status(messages[action]||'Comando de Modo Deus executado.');
  if(removal)setSelection(null);
  await refresh();
 }catch(error){status('Construção: '+error.message);}
}
function updateHover(point){
 if(tool!=='inspect'||pan||!snapshot){el('tooltip').hidden=true;scene.setHover(null);scene.setRoute(null);return;}
 const target=scene.pick(point.x,point.y);
 const npc=target?.kind==='character'?target:null;
 if(!npc){hoverId=null;el('tooltip').hidden=true;scene.setHover(null);scene.setRoute(null);return;}
 hoverId=npc.id;scene.setHover(hoverId);
 el('tooltipName').textContent=npc.name;
 el('tooltipHealth').textContent=npc.health<=0?'☠ Falecido · '+(npc.causeOfDeath??'Causa não determinada'):
  'Saúde '+npc.health+'% · Energia '+npc.energy+'% · Saciedade '+(npc.satiety??100)+'%';
 const view=snapshot.npcViews?.[npc.id];
 el('tooltipActivity').textContent=npc.health<=0?'Corpo aguardando sepultamento':
  (view?.activity??'Aguardando')+' · Humor '+(view?.mood==null?'—':Math.round(view.mood)+'%');
 el('tooltipRoute').textContent=view?.route?.length?'Rota: '+Math.max(0,view.route.length-1)+' passos':(view?.reason??'Sem rota ativa');
 scene.setRoute(view?.route??null);
 const tip=el('tooltip');
 tip.style.left=Math.max(8,Math.min(scene.camera.width-248,point.x+16))+'px';
 tip.style.top=Math.max(8,Math.min(scene.camera.height-128,point.y+12))+'px';
 tip.hidden=false;
}
function addBrushAt(point){
 if(!snapshot||!scene.brush)return;
 const center=scene.camera.tileAt(point.x,point.y);
 for(const cell of ['house','farm'].includes(tool)?[center]:brushCells(center,brushSize,snapshot.world,brushShape)){
  if(painting.size>=(['house','farm'].includes(tool)?1:225))break;
  const key=cell.x+','+cell.y;
  const area=tool==='house'?(catalog?.buildingBlueprints?.[preset]?.footprint??{width:2,height:2}):
   {width:tool==='farm'?brushSize:1,height:tool==='farm'?brushSize:1};
  const {width,height}=area;
  let occupied=false;
  for(let y=cell.y;y<cell.y+height;y++)for(let x=cell.x;x<cell.x+width;x++){
   if(x<0||y<0||x>=snapshot.world.width||y>=snapshot.world.height||
    snapshot.world.entities.some(e=>e.kind==='item'?false:e.kind==='planting_zone'?
     (tool==='farm'&&x>=e.position.x&&x<e.position.x+e.footprint.width&&y>=e.position.y&&y<e.position.y+e.footprint.height):
     (tool==='farm'&&e.kind==='character')?false:e.kind==='construction'?
     x>=e.position.x&&x<e.position.x+e.footprint.width&&y>=e.position.y&&y<e.position.y+e.footprint.height:
     e.position.x===x&&e.position.y===y))occupied=true;
  }
  if(!occupied&&!painting.has(key))painting.set(key,cell);
 }
}
async function submitBrush(){
 if(!painting.size){status('Nenhuma célula livre para posicionar.');return;}
 const cells=[...painting.values()],kind=tool,action=kind==='npc'?'npc.spawn':kind==='scenery'?'obstacle.spawn':
  kind==='house'?'construction.place':kind==='farm'?'farming.zone.create':'resource.spawn';
 const commands=cells.map((position,i)=>({
  commandId:crypto.randomUUID(),action,position,
  parameters:kind==='npc'?(preset==='leader'?{communityRole:'leader'}:{}):
   kind==='scenery'?{obstacleType:preset}:
   kind==='house'?{blueprintId:preset,mode:buildMode}:
   kind==='farm'?{sourceId:preset,width:brushSize,height:brushSize}:
   kind==='food'?(preset==='medicinal_herb_adult'?{resourceType:'food',sourceId:'medicinal_herb',ageTicks:45,quantity:3}:{resourceType:'food',sourceId:'apple_tree',ageTicks:preset==='apple_seedling'?0:120,quantity:preset==='apple_seedling'?0:6}):
   kind==='stone'?{resourceType:preset||'stone',quantity:30}:
   {resourceType:kind,quantity:25}
 }));
 painting.clear();
 try{
  status('Enviando '+commands.length+' comando(s) ao motor...');
  const result=await request('/api/brush',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({role,commands})});
  const accepted=result.results.filter(r=>r.ok).length;
  status(accepted+' elemento(s) criado(s); '+(commands.length-accepted)+' rejeitado(s).');
  await refresh();
 }catch(error){status('Falha no pincel: '+error.message);}
}
function changeSpeed(speed){
 if(role!=='admin'||![0,1,2,4].includes(speed))return;
 request('/api/clock',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({role,speed})})
 .then(data=>{if(speed)lastSpeed=speed;if(snapshot){snapshot.clock=data.clock;hud.update(snapshot);}status(speed?'Velocidade '+speed+'×':'Simulação pausada');})
 .catch(error=>status('Falha no relógio: '+error.message));
}
function applyWorld(data,{reset=false,epoch=null,sampleTime}={}){
 const changed=!!snapshot&&(snapshot.timelineId!==data.timelineId||data.world.tick<snapshot.world.tick||(epoch!==null&&lastEpoch!==null&&epoch!==lastEpoch));
 const clockChanged=snapshot?.clock.speed!==data.clock.speed;
 if(changed){visualEpoch++;setSelection(null);scene.world=null;}
 if(epoch!==null)lastEpoch=epoch;
 snapshot=data;scene.setWorld(data.world,{reset:reset||changed,epoch,sampleTime,speed:data.clock.speed,paused:data.clock.paused});
 const now=performance.now();
 if(reset||changed){sampleGaps.clear();lastVisualSample=null;}
 if(lastVisualSample!==null)sampleGaps.add(now-lastVisualSample);
 lastVisualSample=now;
 if(reset||changed||clockChanged||data.clock.paused||now-lastHudAt>=250){hud.update(data);npcActivityMonitor?.update(data);lastHudAt=now;}
 const selected=data.world.entities.find(e=>e.id===selectedId);
 if(selectedId&&!selected)setSelection(null);
 else if(selected&&performance.now()-inspectAt>=500)void refreshInspector(selected);
}
async function refresh(){
 if(loading)return;loading=true;
 try{
  if(!catalog){
   catalog=await request('/api/catalog');
   hud.setBlueprints(catalog.buildingBlueprints);
   hud.setFarmingSpecies(catalog.naturalSources);
  }
  if(stream?.live)return;
  const epoch=visualEpoch,data=await request('/api/world');
  if(stream?.live||epoch!==visualEpoch)return;
  applyWorld(data);
  el('connection').textContent='Sincronização HTTP';
  el('connection').classList.remove('offline');
 }catch(error){if(stream?.live)return;el('connection').textContent='Sem conexão';el('connection').classList.add('offline');status('Servidor indisponível: '+error.message);}
 finally{loading=false;}
}

/** Snapshot/log controls are an adapter for the server API; never mutate world state in the browser. */
if(role==='admin'&&el('worldManagerToggle')){
 const manager=el('worldManager');
 const execute=async(url,body)=>{
  const result=await request(url,{method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({role:'admin',...body})});
  return result;
 };
 const download=url=>{
  const a=document.createElement('a');a.href=url;a.download='';document.body.append(a);
  a.click();a.remove();
 };
 const renderEconomy=data=>{
  const panel=el('worldEconomy');if(!panel)return;
  panel.replaceChildren();
  const add=message=>{const node=document.createElement('div');node.textContent=message;panel.append(node);};
  add('Tick '+data.tick+' · Líder: '+(data.leader?.name??'nenhum'));
  if(data.leader){
   add('Construção: '+(data.leader.construction??'sem decisão'));
   add('Produção: '+(data.leader.production??'sem pedido'));
  }
  for(const need of data.productionNeeds??[]){
   add((catalog?.items?.[need.item]?.label??need.item)+
    ': '+need.available+' / '+need.desired+' · faltam '+need.missing);
  }
  for(const shop of data.workshops??[]){
   const recipe=catalog?.recipes?.[shop.order?.recipeId];
   add('Oficina '+shop.id.slice(-8)+': '+(recipe?.label??'sem ordem')+
    (shop.order?' · '+shop.order.workDone+'/'+recipe?.workUnits+' trabalho':'')+
    (shop.ready?' · pronta':''));
   for(const [item,quantity] of Object.entries(shop.missing??{}))
    if(quantity>0)add('   Falta '+quantity+' '+(catalog?.items?.[item]?.label??item));
  }
  for(const depot of data.depots??[])add('Depósito '+depot.id.slice(-8)+
   ': '+depot.occupied+'/'+depot.capacity+' itens');
 };
 const refreshManager=async()=>{
  const [saves,logs,activity,economy]=await Promise.all([
   request('/api/world/saves'),request('/api/world/logs'),
   request('/api/world/activity?limit=35'),request('/api/economy')
  ]);
  renderEconomy(economy);
  const saved=el('savedWorlds'),selected=saved.value;
  saved.replaceChildren(...saves.saves.map(save=>{
   const option=document.createElement('option');option.value=save.name;
   option.textContent=save.name+' · tick '+save.tick;return option;
  }));
  if(saves.saves.some(item=>item.name===selected))saved.value=selected;
  const timelines=el('logTimeline'),chosen=timelines.value;
  timelines.replaceChildren(...logs.logs.map(item=>{
   const option=document.createElement('option');option.value=item.timelineId;
   option.textContent=(item.active?'Atual ':'Anterior ')+item.timelineId.slice(0,8);
   return option;
  }));
  if(logs.logs.some(item=>item.timelineId===chosen))timelines.value=chosen;
  else timelines.value=logs.timelineId??'';
  const area=el('worldActivity');area.replaceChildren();
  for(const entry of [...activity.ticks].reverse().slice(0,35)){
   const line=document.createElement('div');
   line.textContent='Tick '+entry.tick+' · '+entry.actions.map(a=>a.action+
    (a.actorId?' ('+a.actorId+')':'')).join(', ');
   area.append(line);
  }
  if(!activity.ticks.length)area.textContent='Nenhuma ação válida registrada nesta linha do tempo.';
  el('worldManagerStatus').textContent='Mundo '+(snapshot?.world?.id??'—')+
   ' · '+(snapshot?.world?.width??'—')+' × '+(snapshot?.world?.height??'—')+' células'+
   ' · tick '+(snapshot?.world?.tick??'—')+
   ' · '+(snapshot?.clock?.paused?'pausado':'em execução')+
   (saves.persistent?' · persistência ativa':' · sem armazenamento permanente');
 };
 const attempt=async(operation)=>{
  try{await operation();await refresh();await refreshManager();}
  catch(error){status('Mundos: '+error.message);}
 };
 setInterval(()=>{if(!manager.hidden)void request('/api/economy').then(renderEconomy).catch(()=>{});},2000);
 el('worldManagerToggle').addEventListener('click',()=>{
  manager.hidden=!manager.hidden;
  if(!manager.hidden)void attempt(async()=>{});
 });
 el('worldSave').addEventListener('click',()=>void attempt(async()=>{
  const name=el('saveWorldName').value.trim()||'oturo-'+(snapshot?.world?.tick??0);
  await execute('/api/world/save',{name});status('Snapshot '+name+' salvo no servidor.');
 }));
 el('worldLoad').addEventListener('click',()=>void attempt(async()=>{
  const name=el('savedWorlds').value;if(!name)return;
  if(!confirm('Carregar '+name+'? O mundo atual será substituído e ficará pausado.'))return;
  await execute('/api/world/load',{name});
  setSelection(null);status('Mundo carregado e pausado.');
 }));
 el('worldNew').addEventListener('click',()=>void attempt(async()=>{
  const seed=el('newWorldSeed').value.trim();
  if(!seed){status('Informe a seed do mundo.');return;}
  if(!confirm('Criar novo mundo com a seed '+seed+'? Salve o atual antes se quiser recuperá-lo.'))return;
  const dimensions=el('newWorldSize').value.split('x').map(Number);
  await execute('/api/world/new',{seed,width:dimensions[0],height:dimensions[1]});
  setSelection(null);
  status('Novo mundo criado e pausado. Inicie pelos controles 1×/2×/4×.');
 }));
 el('worldExport').addEventListener('click',()=>download('/api/world/export'));
 el('worldLogExport').addEventListener('click',()=>{
  const id=el('logTimeline').value;
  download('/api/world/activity/export'+(id?'?timeline='+encodeURIComponent(id):''));
 });
 el('worldImport').addEventListener('click',()=>el('worldImportFile').click());
 el('worldImportFile').addEventListener('change',()=>void attempt(async()=>{
  const file=el('worldImportFile').files?.[0];if(!file)return;
  if(file.size>8*1024*1024){status('Snapshot excede o limite de 8 MB.');return;}
  const raw=await file.text(),value=JSON.parse(raw);
  if(!confirm('Importar este snapshot e substituir o mundo atual? A simulação ficará pausada.'))return;
  await execute('/api/world/import',{snapshot:value});
  el('worldImportFile').value='';setSelection(null);
  status('Snapshot importado. Simulação pausada.');
 }));
}

// Touch navigation uses the same camera and command callbacks, never a second world stream.
const clearTouchPreview=()=>{painting.clear();scene.pointer=null;el('tooltip').hidden=true;scene.setHover(null);};
const touch=createTouchGestures({
 pan:(dx,dy)=>{scene.camera.pan(dx,dy);clearTouchPreview();},
 zoom:(x,y,factor)=>{scene.camera.zoomAt(x,y,factor);el('zoom').textContent=Math.round(scene.camera.zoom*100)+'%';},
 cancel:clearTouchPreview,
 tap:point=>{
  scene.pointer=point;
  if(role==='admin'&&scene.brush){painting=new Map();addBrushAt(point);void submitBrush();}
  else if(tool==='inspect')setSelection(scene.pick(point.x,point.y));
 }
});
const touchPointer=e=>e.pointerType==='touch';
scene.canvas.addEventListener('pointerdown',e=>{
 if(!touchPointer(e))return;
 e.preventDefault();scene.canvas.setPointerCapture(e.pointerId);
 pan=null;scene.canvas.classList.remove('dragging');clearTouchPreview();touch.down(e.pointerId,eventCoordinates(e));
});
scene.canvas.addEventListener('pointermove',e=>{
 if(touchPointer(e))touch.move(e.pointerId,eventCoordinates(e));
});
scene.canvas.addEventListener('pointerup',e=>{
 if(touchPointer(e))touch.up(e.pointerId,eventCoordinates(e));
});
scene.canvas.addEventListener('pointercancel',e=>{if(touchPointer(e))touch.abort();});
scene.canvas.addEventListener('lostpointercapture',e=>{
 if(touchPointer(e)&&touch.has(e.pointerId))touch.abort();
});
addEventListener('blur',()=>touch.abort());
const compactUi=matchMedia('(max-width: 1190px), (max-height: 650px)');
const activityToggle=el('npcActivityToggle');
const collapseActivities=()=>{if(compactUi.matches&&activityToggle?.getAttribute('aria-expanded')==='true')activityToggle.click();};
collapseActivities();compactUi.addEventListener('change',collapseActivities);
const stockToggle=document.createElement('button');
stockToggle.type='button';stockToggle.className='hud-toggle';stockToggle.textContent='◇';
stockToggle.title='Estoque dos depósitos';stockToggle.setAttribute('aria-label','Estoque dos depósitos');
stockToggle.setAttribute('aria-expanded','false');
const hudTools=document.createElement('div');hudTools.className='hud-tools';hudTools.append(stockToggle);
el('interface').append(hudTools);
stockToggle.addEventListener('click',()=>{
 const open=el('interface').classList.toggle('hud-stock-open');
 stockToggle.setAttribute('aria-expanded',String(open));
});
const connectionNode=el('connection');
const syncConnectionLabel=()=>{
 const value=connectionNode.textContent;
 connectionNode.dataset.state=value==='Sem conexão'?'disconnected':value==='Ao vivo'?'live':'pending';
 connectionNode.parentElement.title=value;
 connectionNode.parentElement.setAttribute('aria-label',value);
};
new MutationObserver(syncConnectionLabel).observe(connectionNode,{childList:true,characterData:true,subtree:true});
syncConnectionLabel();
if(activityToggle){const labelActivity=()=>{activityToggle.textContent=activityToggle.getAttribute('aria-expanded')==='true'?'−':'☰';};new MutationObserver(labelActivity).observe(activityToggle,{attributes:true,attributeFilter:['aria-expanded']});labelActivity();}


scene.canvas.addEventListener('wheel',e=>{e.preventDefault();const p=eventCoordinates(e);scene.camera.zoomAt(p.x,p.y,e.deltaY<0?1.12:1/1.12);el('zoom').textContent=Math.round(scene.camera.zoom*100)+'%';},{passive:false});
scene.canvas.addEventListener('pointerdown',e=>{
 if(touchPointer(e)||touch.active||(e.button!==0&&e.button!==1))return;
 const point=eventCoordinates(e),target=scene.pick(point.x,point.y);
 pan={id:e.pointerId,button:e.button,last:point,start:point,entity:target,drag:false,brush:role==='admin'&&!!scene.brush};
 scene.canvas.setPointerCapture(e.pointerId);
 if(pan.brush){painting=new Map();addBrushAt(point);}
 if(e.button===1)e.preventDefault();
});
scene.canvas.addEventListener('pointermove',e=>{
 if(touchPointer(e)||touch.active)return;
 const point=eventCoordinates(e);scene.pointer=point;
 const tile=scene.camera.tileAt(point.x,point.y);el('coordinates').textContent='x: '+tile.x+' · y: '+tile.y;
 if(pan&&pan.id===e.pointerId){
  if(pan.brush){
   // Sample between pointer events so quick strokes do not skip cells.
   const distance=Math.hypot(point.x-pan.last.x,point.y-pan.last.y);
   const step=scene.camera.tile*scene.camera.zoom*.5;
   const samples=Math.min(80,Math.max(1,Math.ceil(distance/Math.max(4,step))));
   for(let i=1;i<=samples;i++){
    const mix=i/samples;
    addBrushAt({x:pan.last.x+(point.x-pan.last.x)*mix,y:pan.last.y+(point.y-pan.last.y)*mix});
   }
   pan.last=point;return;
  }
  const diff=Math.hypot(point.x-pan.start.x,point.y-pan.start.y);
  if(diff>5&&(pan.button===1||!pan.entity))pan.drag=true;
  if(pan.drag){scene.camera.pan(point.x-pan.last.x,point.y-pan.last.y);scene.canvas.classList.add('dragging');}
  pan.last=point;el('tooltip').hidden=true;return;
 }
 updateHover(point);
});
scene.canvas.addEventListener('pointerup',e=>{
 if(touchPointer(e)||!pan||pan.id!==e.pointerId)return;
 const point=eventCoordinates(e),gesture=pan;pan=null;scene.canvas.classList.remove('dragging');
 if(gesture.brush){void submitBrush();return;}
 if(gesture.drag||gesture.button===1)return;
 if(tool==='inspect')setSelection(scene.pick(point.x,point.y));
});
scene.canvas.addEventListener('pointercancel',e=>{if(touchPointer(e))return;pan=null;painting.clear();scene.canvas.classList.remove('dragging');});
scene.canvas.addEventListener('pointerleave',e=>{if(touchPointer(e))return;if(!pan){el('tooltip').hidden=true;scene.setHover(null);}});
const typing=target=>['INPUT','TEXTAREA','SELECT'].includes(target?.tagName)||target?.isContentEditable;
addEventListener('keydown',e=>{
 if(typing(e.target)||e.altKey||e.ctrlKey||e.metaKey)return;
 const speed={Digit1:1,Digit2:2,Digit3:4}[e.code];
 if(speed){changeSpeed(speed);e.preventDefault();return;}
 if(e.code==='Quote'||e.key==="'"){changeSpeed(snapshot?.clock?.speed===0?lastSpeed:0);e.preventDefault();return;}
 if(e.code==='Escape'){tool='inspect';hud.tool(tool);scene.setBrush(null);if(selectedId)setSelection(null);e.preventDefault();return;}
 if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code)){keys.add(e.code);e.preventDefault();}
});
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>keys.clear());
let last=performance.now();
function animate(now){
 const dt=Math.min(.06,(now-last)/1000);last=now;
 const x=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),y=Number(keys.has('KeyS'))-Number(keys.has('KeyW'));
 if(x||y){const factor=420*dt/Math.max(1,Math.hypot(x,y));scene.camera.pan(-x*factor,-y*factor);}
 if(lastFrameTime!==null&&now-lastFrameTime<1000)frameIntervals.add(now-lastFrameTime);
 lastFrameTime=now;
 const paintStart=performance.now();frames++;scene.paint(now);paintCosts.add(performance.now()-paintStart);requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
el('worldTick').textContent='Carregando mundo…';
el('introHint').replaceChildren(createUiVisual('action.inspect',{size:15}),document.createTextNode(' Sobrevivência ativa: NPCs comem, reservam camas e podem se ferir. Use o inspetor para acompanhar decisões.'));
refresh();
stream=connectWorld({onState:(data,meta)=>applyWorld(data,meta),
 onStatus:state=>{const node=el('connection');node.textContent=state==='live'?'Ao vivo':state==='connecting'?'Conectando…':'Reconectando…';node.classList.toggle('offline',state!=='live');},
 onMetrics:({updates,bytes,rtt})=>{fps=frames;frames=0;const node=el('connection');const ms=v=>v===null?'—':v.toFixed(1)+' ms';node.title=fps+' FPS · '+updates+' atualizações/s · '+Math.round(bytes/1024)+' KiB/s · RTT '+(rtt===null?'—':Math.round(rtt)+' ms')+' · frame p95 '+ms(frameIntervals.summary().p95)+' · desenho p95 '+ms(paintCosts.summary().p95)+' · intervalo de estados p95 '+ms(sampleGaps.summary().p95);}
});
setInterval(()=>{if(!stream.live)void refresh();},650);
addEventListener('pagehide',event=>{if(!event.persisted)stream.close();});
