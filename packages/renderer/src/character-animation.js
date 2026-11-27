/** Procedural pixel-style fallback layers. No simulation state or asset allocation per frame. */
const palette=Object.freeze({leader:'#d3a64b',farm:'#76924f',builder:'#bd8649',miner:'#647d94',woodcutter:'#946340',cook:'#dbd1a5',carrier:'#9c784b',artisan:'#8f6e9b',healer:'#7aa99e'});
const motions=Object.freeze({hammer:[650,1.1],axe:[750,1.35],pickaxe:[700,1.4],plant:[900,.55],harvest:[650,.75],dig:[900,.9],carry:[800,.12],pickup:[700,.5],craft:[500,.7],cook:[650,.85],eat:[700,.7],equip:[650,.35],heal:[850,.4]});
export function drawProfessionClothing(ctx,x,y,size,role,direction){
 if(!Object.hasOwn(palette,role))return;
 const u=size/32,side=direction==='east'?1:direction==='west'?-1:0;
 ctx.save();ctx.translate(x+side*u,y-11*u);
 ctx.fillStyle='#352e27';ctx.fillRect(-4*u,0,8*u,2*u);
 ctx.fillStyle=palette[role];ctx.fillRect(-3*u,0,6*u,u);
 ctx.restore();
}
export function workPose(clip,now){
 const config=Object.hasOwn(motions,clip)?motions[clip]:null;
 if(!config)return null;
 const [period,amplitude]=config,phase=((now%period)+period)%period/period;
 return {phase,angle:Math.sin(phase*Math.PI*2)*amplitude};
}
export function drawCharacterWork(ctx,x,y,size,direction,clip,now){
 const pose=workPose(clip,now);if(!pose)return;
 const u=size/32,side=direction==='west'?-1:1;
 ctx.save();ctx.translate(x+side*size*.21,y-size*(direction==='north'?.47:.30));
 ctx.scale(side,1);ctx.rotate(pose.angle);
 ctx.fillStyle='#765239';
 if(['hammer','axe','pickaxe','dig','craft'].includes(clip)){
  ctx.fillRect(-u,-8*u,2*u,11*u);ctx.fillStyle='#b9b8a5';
  if(clip==='axe')ctx.fillRect(0,-9*u,5*u,5*u);
  else if(clip==='pickaxe')ctx.fillRect(-5*u,-9*u,10*u,2*u);
  else if(clip==='dig')ctx.fillRect(-2*u,-10*u,4*u,5*u);
  else ctx.fillRect(-4*u,-9*u,8*u,3*u);
 }else if(clip==='plant'||clip==='harvest'){
  ctx.fillStyle=clip==='plant'?'#8b613b':'#9caf62';ctx.fillRect(-2*u,-2*u,4*u,4*u);
  ctx.fillStyle='#b5cf79';ctx.fillRect(0,-4*u,2*u,2*u);
 }else if(clip==='carry'||clip==='pickup'||clip==='equip'){
  ctx.fillRect(-4*u,-3*u,8*u,6*u);ctx.fillStyle='#c4a673';ctx.fillRect(-3*u,-2*u,6*u,u);
 }else if(clip==='cook'||clip==='eat'){
  ctx.fillStyle='#aaa48d';ctx.fillRect(-4*u,0,8*u,3*u);ctx.fillStyle='#d1ac70';ctx.fillRect(-2*u,-2*u,4*u,2*u);
 }else if(clip==='heal'){
  ctx.fillStyle='#ddd2b0';ctx.fillRect(-3*u,-3*u,6*u,6*u);ctx.fillStyle='#a76753';ctx.fillRect(-u,-2*u,2*u,4*u);
 }
 ctx.restore();
}
