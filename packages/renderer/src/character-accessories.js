/** Render-only provisional pixel layers. Never infer a profession from a current task. */
const colors=Object.freeze({leader:'#d6b65f',farmer:'#7caa62',collector:'#a1b87b',lumberjack:'#a46038',miner:'#788da2',builder:'#d2a453',artisan:'#b26b5a',cook:'#e0d7ac',hauler:'#9d805b',gravedigger:'#777080'});
export function characterProfession(entity){return entity.communityRole==='leader'?'leader':entity.profession??'generalist';}
export function resolveWorkAnimation(entity,target){
 const a=entity.ai?.action,label=entity.ai?.activity;
 if(a==='resource.gather')return target?.resourceType==='wood'?'axe':'pickaxe';
 if(a==='nature.cut')return 'axe';
 if(a==='mine.extract')return 'pickaxe';
 if(a==='farming.plant'||a==='burial.inter')return 'shovel';
 if(a==='resource.harvest')return 'harvest';
 if(a==='construction.work'||a==='construction.removal.work')return 'hammer';
 if(a==='production.work')return target?.blueprintId==='building.cafeteria'?'cook':'craft';
 if(a==='npc.eat'||label==='Alimentando-se')return 'eat';
 if(a==='burial.pickup'||a==='burial.drop')return 'carry';
 if(a==='storage.deposit'||a==='storage.withdraw'||a==='construction.deliver'||a==='item.pickup'||a==='item.drop'||a==='storage.temporary.create')return 'carry';
 if(a==='npc.equip')return 'equip';
 if(label==='Plantando'||label==='Sepultando')return 'shovel';
 if(label==='Cortando madeira seca'||label==='Renovando pomar')return 'axe';
 if(label==='Construindo'||label==='Desmontando')return 'hammer';
 if(label==='Operando mina'||label==='Extraindo para fabricação')return 'pickaxe';
 if(label==='Fabricando')return target?.blueprintId==='building.cafeteria'?'cook':'craft';
 if(label?.startsWith('Colhendo')||label==='Obtendo sementes')return 'harvest';
 if(label==='Buscando recursos'||label==='Coletando material')return target?.resourceType==='wood'?'axe':'pickaxe';
 return null;
}
export function workPhase(animation,time){const period=({axe:680,pickaxe:700,hammer:430,shovel:820,harvest:580,cook:760,craft:510,carry:650,eat:700,equip:600})[animation]??700;return (Math.sin(time/period*Math.PI*2)+1)/2;}
export function drawCharacterAccessories(ctx,entity,visual,x,y,size,time,target){
 if(visual.state==='dead'||visual.state==='resting')return;
 const u=size/96,dir=visual.direction,side=dir==='west'?-1:1;
 ctx.save();ctx.translate(x,y);ctx.scale(u,u);ctx.imageSmoothingEnabled=false;
 const color=colors[characterProfession(entity)];
 // A small stable garment patch; can be replaced by a full clothing atlas without touching AI.
 if(color){const px=dir==='west'?-12:dir==='east'?5:-7;ctx.fillStyle='#382b23';ctx.fillRect(px-1,-27,10,8);ctx.fillStyle=color;ctx.fillRect(px,-26,8,6);}
 const animation=visual.state==='working'||entity.ai?.activity==='Alimentando-se'?resolveWorkAnimation(entity,target):null;
 if(animation){
  const phase=workPhase(animation,time);
  ctx.translate(side*14,-21+Math.round(phase*3));
  ctx.scale(side,1);
  if(['axe','pickaxe','hammer','shovel','craft','cook'].includes(animation)){
   ctx.rotate(-.9+phase*1.65);
   ctx.fillStyle='#674530';ctx.fillRect(0,-17,3,22);
   ctx.fillStyle='#bdc0b4';
   if(animation==='axe')ctx.fillRect(-3,-20,10,8);
   else if(animation==='pickaxe'){ctx.fillRect(-7,-20,17,4);ctx.fillRect(7,-17,3,4);}
   else if(animation==='shovel')ctx.fillRect(-2,-22,7,9);
   else if(animation==='cook'){ctx.fillStyle='#c5a275';ctx.fillRect(-2,-20,7,6);}
   else ctx.fillRect(-5,-20,13,7);
  }else if(animation==='carry'||animation==='equip'){ctx.fillStyle='#68472e';ctx.fillRect(-4,-9,14,12);ctx.fillStyle='#b98b54';ctx.fillRect(-3,-8,12,8);ctx.fillStyle='#88603a';ctx.fillRect(-2,-4,10,2);}
  else {ctx.translate(0,-Math.round(phase*7));ctx.fillStyle=animation==='eat'?'#cc884d':'#91a94f';ctx.fillRect(-2,-4,8,7);ctx.fillStyle='#617b43';ctx.fillRect(1,-6,3,3);}
 }
 ctx.restore();
}
