import {createUiVisual} from '../../packages/ui/assets/visual.js';
import {applyUiTheme} from '../../packages/ui/assets/themes/index.js';
import {Scene} from '../../packages/renderer/src/scene.js';
import {brushCells} from '../../packages/renderer/src/camera.js';
import {createHud} from '../../packages/ui/src/hud.js';
import {createInspector} from '../../packages/ui/src/inspector.js';
const el=id=>document.getElementById(id),role=document.body.dataset.role;
applyUiTheme(document.documentElement);
const scene=new Scene(el('game')),inspector=createInspector({
 onHarvest:(id)=>void harvestSelected(id),
 onConstruction:(id,action,parameters)=>void executeConstruction(id,action,parameters)
});
let snapshot=null,catalog=null,selectedId=null,hoverId=null,tool='inspect',brushSize=1,preset='apple_adult',buildMode='site';
let pan=null,painting=new Map(),loading=false,inspection=null,lastSpeed=1;
const keys=new Set();
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
   {kind:id,size:id==='house'?1:brushSize}:null);
  hoverId=null;scene.setHover(null);el('tooltip').hidden=true;
 },
 onPreset(value){preset=value;},
 onBuildMode(value){buildMode=value;},
 onSize(n){if(tool==='house')return;brushSize=n;hud.size(n);if(scene.brush)scene.setBrush({...scene.brush,size:n});},
 onClock(speed){changeSpeed(speed);}
});
hud.tool('inspect');hud.size(1);
const status=message=>{el('statusMessage').textContent=message;};
const eventCoordinates=e=>{const rect=scene.canvas.getBoundingClientRect();return {x:e.clientX-rect.left,y:e.clientY-rect.top};};
function setSelection(entity){
 selectedId=entity?.id??null;inspector.setSelection(selectedId);scene.setSelection(selectedId);
 inspection=null;if(entity)refreshInspector(entity);
}
async function refreshInspector(entity){
 if(!entity||entity.id!==selectedId)return;
 try{
  const details=await request('/api/inspect?entityId='+encodeURIComponent(entity.id));
  if(entity.id!==selectedId)return;
  inspection=details;inspector.render(entity,details,catalog,{role,canHarvest:!!harvestActor(entity)});
 }catch(error){status('Falha na inspeção: '+error.message);}
}
/** God Mode may test a real NPC harvest only when one stands next to the source. */
function harvestActor(entity){
 if(!snapshot||entity?.kind!=='resource'||!catalog?.naturalSources?.[entity.sourceId]||
   entity.quantity<=0||entity.life?.stage==='dead')return null;
 const eligible=e=>e.kind==='character'&&e.health>0&&e.energy>0&&
  Math.abs(e.position.x-entity.position.x)+Math.abs(e.position.y-entity.position.y)===1&&
  Object.values(e.inventory||{}).reduce((sum,value)=>sum+value,0)<(12-(catalog?.naturalSources?.[entity.sourceId]?.seedsPerHarvest??1));
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
  status(actor.name+' colheu alimento e sementes. Itens transportados no inventário.');
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
   'construction.admin_supply':'Materiais inseridos no canteiro.',
   'storage.admin_supply':'Estoque de teste adicionado ao depósito.',
   'construction.remove':'Construção removida permanentemente do mapa.',
   'farming.zone.remove':'Zona removida; plantas existentes preservadas.',
   'construction.destroy':'Construção destruída; ruínas continuam bloqueando o terreno.',
   'npc.admin_equip':'Equipamento de teste aplicado ao NPC.',
   'construction.admin_work':'Trabalho aplicado à etapa atual.'
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
 for(const cell of ['house','farm'].includes(tool)?[center]:brushCells(center,brushSize,snapshot.world)){
  if(painting.size>=(['house','farm'].includes(tool)?1:225))break;
  const key=cell.x+','+cell.y;
  const width=tool==='house'?2:tool==='farm'?brushSize:1,height=width;
  let occupied=false;
  for(let y=cell.y;y<cell.y+height;y++)for(let x=cell.x;x<cell.x+width;x++){
   if(x<0||y<0||x>=snapshot.world.width||y>=snapshot.world.height||
    snapshot.world.entities.some(e=>e.kind==='planting_zone'?
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
   kind==='food'?{resourceType:'food',sourceId:'apple_tree',ageTicks:preset==='apple_seedling'?0:120,quantity:preset==='apple_seedling'?0:6}:
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
async function refresh(){
 if(loading)return;loading=true;
 try{
  if(!catalog){
   catalog=await request('/api/catalog');
   hud.setBlueprints(catalog.buildingBlueprints);
   hud.setFarmingSpecies(catalog.naturalSources);
  }
  const data=await request('/api/world');snapshot=data;scene.setWorld(data.world);hud.update(data);
  const selected=data.world.entities.find(e=>e.id===selectedId);
  if(selectedId&&!selected)setSelection(null);
  else if(selected)refreshInspector(selected);
  el('connection').textContent='Simulação local';
  el('connection').classList.remove('offline');
 }catch(error){el('connection').textContent='Sem conexão';el('connection').classList.add('offline');status('Servidor indisponível: '+error.message);}
 finally{loading=false;}
}
scene.canvas.addEventListener('wheel',e=>{e.preventDefault();const p=eventCoordinates(e);scene.camera.zoomAt(p.x,p.y,e.deltaY<0?1.12:1/1.12);el('zoom').textContent=Math.round(scene.camera.zoom*100)+'%';},{passive:false});
scene.canvas.addEventListener('pointerdown',e=>{
 if(e.button!==0&&e.button!==1)return;
 const point=eventCoordinates(e),target=scene.pick(point.x,point.y);
 pan={id:e.pointerId,button:e.button,last:point,start:point,entity:target,drag:false,brush:role==='admin'&&!!scene.brush};
 scene.canvas.setPointerCapture(e.pointerId);
 if(pan.brush){painting=new Map();addBrushAt(point);}
 if(e.button===1)e.preventDefault();
});
scene.canvas.addEventListener('pointermove',e=>{
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
 if(!pan||pan.id!==e.pointerId)return;
 const point=eventCoordinates(e),gesture=pan;pan=null;scene.canvas.classList.remove('dragging');
 if(gesture.brush){void submitBrush();return;}
 if(gesture.drag||gesture.button===1)return;
 if(tool==='inspect')setSelection(scene.pick(point.x,point.y));
});
scene.canvas.addEventListener('pointercancel',()=>{pan=null;painting.clear();scene.canvas.classList.remove('dragging');});
scene.canvas.addEventListener('pointerleave',()=>{if(!pan){el('tooltip').hidden=true;scene.setHover(null);}});
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
 scene.paint(now);requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
el('worldTick').textContent='Carregando mundo…';
el('introHint').replaceChildren(createUiVisual('action.inspect',{size:15}),document.createTextNode(' Sobrevivência ativa: NPCs comem, reservam camas e podem se ferir. Use o inspetor para acompanhar decisões.'));
refresh();setInterval(refresh,650);
