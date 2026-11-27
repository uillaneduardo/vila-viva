import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getWorldVisualPack,DEFAULT_WORLD_PACK} from '../packages/renderer/src/visual-packs.js';
import {UiAssetRegistry} from '../packages/ui/assets/registry.js';
import {fitSpriteFrame,frameForState} from '../packages/renderer/src/sprite-layout.js';
import {SpriteLibrary,resolveWorldSprite} from '../packages/renderer/src/sprites.js';
import {registerRusticUi} from '../packages/ui/assets/rustic-pack.js';
test('rustic preserves world atlas contract and default',async()=>{
 assert.equal(DEFAULT_WORLD_PACK,'simple');
 const simple=getWorldVisualPack('simple'),rustic=getWorldVisualPack('rustic');
 assert.equal(getWorldVisualPack('invalid'),simple);
 for(const [id,def] of Object.entries(simple)){
  const next=rustic[id];assert.deepEqual(next.states,def.states);assert.equal(next.pivotX,def.pivotX);assert.equal(next.pivotY,def.pivotY);
  if(next.src!==def.src){const svg=await readFile(new URL('../public'+next.src,import.meta.url),'utf8');assert.match(svg,new RegExp('width="'+next.frameWidth*next.frameCount+'"'));assert.match(svg,/height="96"/);if(id!=='buildings/cemetery')assert.match(svg,/data:image\/png;base64,/);}
 }
 assert.notEqual(rustic['buildings/depot'].src,simple['buildings/depot'].src);
});
test('rustic UI registration is scoped and assets exist',async()=>{
 const reg=new UiAssetRegistry();registerRusticUi(reg);
 assert.equal(reg.resolve('resource.wood').sprite,null);
 reg.setTheme('rustic-dark');
 for(const id of ['resource.wood','resource.food','resource.stone','action.add-npc','action.build','choice.building.depot','choice.building.workshop']){
  const src=reg.resolve(id).sprite;assert.ok(src);assert.match(await readFile(new URL('../public'+src,import.meta.url),'utf8'),/data:image\/png;base64,/);
 }
 assert.ok(reg.resolve('control.pause').sprite);
});

test('expanded rustic atlases preserve dimensions and cover directions, crops, ore and levels',async()=>{
 const rustic=getWorldVisualPack('rustic'),simple=getWorldVisualPack('simple');
 for(const [id,def] of Object.entries(rustic)){
  if(!def.src.includes('/rustic/'))continue;
  const svg=await readFile(new URL('../public'+def.src,import.meta.url),'utf8');
  assert.match(svg,new RegExp('width="'+def.frameWidth*def.frameCount+'"'));
  assert.match(svg,/height="96"/);
  assert.equal(def.states.length,def.frameCount);
 }
 for(const id of ['community_house','family_house','depot','workshop','cafeteria','mine'])for(const level of [2,3])assert.ok(rustic['buildings/'+id+'@'+level]);
 for(const dir of ['north','south','east','west'])assert.ok(rustic['entities/human/'+dir]);
 for(const id of ['carrot','potato','medicinal_herb'])assert.equal(rustic['vegetation/'+id].states.length,5);
 for(const id of ['iron_ore','copper_ore'])assert.ok(rustic['resources/'+id]);
 assert.equal(simple['entities/human/north'],undefined);
});

test('completed rustic graphics fit square frames into rectangular footprints without stretching',()=>{
 const pack=getWorldVisualPack('rustic'),d=pack['buildings/workshop'];
 for(const [w,h] of [[144,96],[96,144],[48,48],[288,192]]){
  const fit=fitSpriteFrame(d,100,200,w,h);
  assert.equal(fit.width,fit.height);assert.ok(fit.width<=w&&fit.height<=h);
  assert.equal(fit.x+fit.width/2,100);assert.equal(fit.y+fit.height/2,200);
 }
 const lib=new SpriteLibrary({pack});
 const calls=[];const ctx={save(){},restore(){},drawImage(...args){calls.push(args)}};
 lib.atlases.set('buildings/workshop',{image:{},definition:d,ready:true});
 assert.equal(lib.draw(ctx,'buildings/workshop',100,200,144,'completed',{height:96}),true);
 assert.deepEqual(calls.at(-1).slice(-4),[52,152,96,96]);
 assert.equal(lib.draw(ctx,'buildings/workshop',100,200,144,'stage:0',{height:96}),true);
 assert.deepEqual(calls.at(-1).slice(-4),[28,152,144,96]);
});
test('walk cycles use four frames; paused or non-moving graphics are static',()=>{
 const pack=getWorldVisualPack('rustic');
 for(const dir of ['north','south','east','west']){
  const d=pack['entities/human/'+dir];
  assert.equal(d.pivotY,66);
  const frames=[0,125,250,375].map(ms=>frameForState(d,'moving',ms,true));
  assert.equal(new Set(frames).size,4);
  assert.equal(frameForState(d,'moving',500,true),frames[0]);
  assert.equal(frameForState(d,'moving',375,false),frames[0]);
  assert.equal(frameForState(d,'idle',375,true),0);
 }
 const d=pack['entities/human/south'];assert.notEqual(frameForState(d,'working',0,true),frameForState(d,'working',300,true));
});
test('profession markers are stable across activities',()=>{
 const npc={kind:'character',health:100,profession:'farm',ai:{activity:'Plantando'}};
 assert.equal(resolveWorldSprite(npc).role,'farm');
 assert.equal(resolveWorldSprite({...npc,ai:{activity:'Construindo'}}).role,'farm');
 assert.equal(resolveWorldSprite({...npc,communityRole:'leader'}).role,'leader');
 assert.equal(resolveWorldSprite({...npc,ai:{activity:'unknown'}}).role,'farm');
 assert.equal(resolveWorldSprite({...npc,health:0}).role,null);
 assert.equal(resolveWorldSprite({...npc,profession:undefined}).role,null);
 assert.equal(resolveWorldSprite(npc,{direction:'west'}).direction,'west');
 const reg=new UiAssetRegistry();registerRusticUi(reg);reg.setTheme('rustic-dark');
 for(const id of Object.keys(reg.manifest.visuals))if(id!=='ui.unavailable')assert.ok(reg.resolve(id).sprite,id);
});

function pngCrc(bytes:Uint8Array){
 let crc=0xffffffff;
 for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 return (crc^0xffffffff)>>>0;
}
test('embedded rustic bitmaps have valid PNG chunks and proportional artwork bounds',async()=>{
 const paths=new Set(Object.values(getWorldVisualPack('rustic')).filter(d=>d.src.includes('/rustic/')).map(d=>d.src));
 const reg=new UiAssetRegistry();registerRusticUi(reg);reg.setTheme('rustic-dark');
 for(const id of Object.keys(reg.manifest.visuals)){const src=reg.resolve(id).sprite;if(src)paths.add(src);}
 for(const src of paths){
  const svg=await readFile(new URL('../public'+src,import.meta.url),'utf8');
  for(const match of svg.matchAll(/<image\b[^>]+>/g)){
   const tag=match[0],encoded=tag.match(/data:image\/png;base64,([^"]+)/)?.[1];if(!encoded)continue;
   const png=Buffer.from(encoded,'base64');
   assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a',src);
   const w=png.readUInt32BE(16),h=png.readUInt32BE(20);let offset=8,ended=false;
   while(offset+12<=png.length){
    const length=png.readUInt32BE(offset),end=offset+12+length;
    assert.ok(end<=png.length,src);
    assert.equal(pngCrc(png.subarray(offset+4,offset+8+length)),png.readUInt32BE(offset+8+length),src);
    const kind=png.subarray(offset+4,offset+8).toString();
    offset=end;if(kind==='IEND'){ended=true;break;}
   }
   assert.ok(ended,src);
   assert.doesNotMatch(tag,/preserveAspectRatio="none"/,src);
   const width=Number(tag.match(/\bwidth="([^"]+)"/)?.[1]),height=Number(tag.match(/\bheight="([^"]+)"/)?.[1]);
   assert.ok(Math.abs(width/height-w/h)<.001,src+' image aspect ratio');
  }
 }
});
