import assert from 'node:assert/strict';
import test from 'node:test';
import {ICON_GEOMETRY} from '../packages/ui/assets/icons/definitions.js';
import {UI_VISUAL_MANIFEST} from '../packages/ui/assets/manifest.js';
import {UiAssetRegistry,uiAssets,getUiIcon,getUiVisual} from '../packages/ui/assets/registry.js';
import {createUiVisual} from '../packages/ui/assets/visual.js';
import {getUiTheme,applyUiTheme} from '../packages/ui/assets/themes/index.js';
import {readFile} from 'node:fs/promises';

test('semantic UI visuals are versioned, stable and all icon references resolve',()=>{
 assert.equal(UI_VISUAL_MANIFEST.schemaVersion,1);
 for(const [id,def] of Object.entries(UI_VISUAL_MANIFEST.visuals)){
  assert.ok(ICON_GEOMETRY[def.icon],id+' missing geometry');
  assert.equal(uiAssets.resolve(id).id,id);
 }
 assert.equal(getUiVisual('action.add-npc').icon,'npc');
 assert.equal(getUiVisual('section.effects').icon,'effects');
 assert.equal(getUiVisual('unknown').id,'ui.unavailable');
 assert.match(getUiIcon('action.inspect',{size:16}),/data-visual="action.inspect"/);
 assert.match(getUiIcon('completely.unknown',{size:16}),/data-visual="ui.unavailable"/);
 assert.match(getUiIcon('action.inspect',{size:1}),/width="8"/);
 assert.match(getUiIcon('action.inspect',{size:999}),/width="64"/);
});

test('sprite sources are local, versioned, stateful and fall back to icon',()=>{
 const registry=new UiAssetRegistry();
 assert.equal(registry.resolve('action.add-npc').sprite,null);
 registry.registerSprite('action.add-npc','/assets/ui/entities/npc.webp');
 assert.equal(registry.resolve('action.add-npc').sprite,'/assets/ui/entities/npc.webp');
 registry.registerSprite('action.add-npc','/assets/ui/entities/npc-selected.png',{state:'selected'});
 assert.equal(registry.resolve('action.add-npc',{state:'selected'}).sprite,'/assets/ui/entities/npc-selected.png');
 assert.equal(registry.resolve('action.add-npc',{state:'hover'}).sprite,'/assets/ui/entities/npc.webp');
 for(const invalid of ['https://example.com/asset.png','//evil.test/file.png','/assets/ui/../../secret.svg','javascript:alert(1)','/assets/ui/npc.gif']){
  assert.throws(()=>registry.registerSprite('action.add-npc',invalid));
 }
 assert.throws(()=>registry.registerSprite('unknown','/assets/ui/u.png'));
 assert.throws(()=>registry.resolve('action.inspect',{state:'unknown'}));
 assert.throws(()=>registry.setTheme('unavailable'));
});

test('sprite-aware node shows fallback until valid image loads, and on error',()=>{
 const original=globalThis.document;
 const elements=[];
 function node(tag){
  const e={tag,dataset:{},className:'',style:{setProperty(k,v){this[k]=v;}},children:[],events:{},naturalWidth:0,
   classList:{values:new Set(),add(v){this.values.add(v);},remove(v){this.values.delete(v);}},
   setAttribute(k,v){this[k]=v;},
   append(...nodes){this.children.push(...nodes);},
   addEventListener(k,fn){this.events[k]=fn;}
  };
  elements.push(e);
  return e;
 }
 try{
  globalThis.document={createElement:node};
  const svgOnly=createUiVisual('action.inspect',{size:17});
  assert.equal(svgOnly.children.length,1);
  assert.match(svgOnly.children[0].innerHTML,/svg/);
  assert.equal(svgOnly.style['--ui-visual-size'],'17px');
  const visualId='action.metrics';
  uiAssets.registerSprite(visualId,'/assets/ui/actions/metrics.webp');
  const imageVisual=createUiVisual(visualId,{size:19});
  assert.equal(imageVisual.children.length,2);
  const img=imageVisual.children[1];
  assert.equal(img.src,'/assets/ui/actions/metrics.webp');
  img.naturalWidth=20;img.events.load();
  assert.equal(imageVisual.classList.values.has('sprite-loaded'),true);
  img.events.error();
  assert.equal(imageVisual.classList.values.has('sprite-loaded'),false);
 }finally{
  if(original===undefined)delete globalThis.document;
  else globalThis.document=original;
  uiAssets.spriteOverrides.clear();
 }
});

test('themes expose approved baseline tokens without altering game state',()=>{
 assert.equal(getUiTheme()['--accent'],'#b4d3a9');
 const values={},target={style:{setProperty(k,v){values[k]=v;}},dataset:{}};
 assert.equal(applyUiTheme(target),'forest-dark');
 assert.equal(values['--line'],getUiTheme()['--line']);
 assert.equal(target.dataset.uiTheme,'forest-dark');
 assert.throws(()=>getUiTheme('unknown'));
});

test('components request semantic visual IDs and do not own raw SVG geometry',async()=>{
 const root=new URL('../',import.meta.url);
 for(const path of ['packages/ui/src/hud.js','packages/ui/src/inspector.js']){
  const source=await readFile(new URL(path,root),'utf8');
  assert.match(source,/createUiVisual/);
  assert.doesNotMatch(source,/<svg\b|<path\b/);
 }
 const scene=await readFile(new URL('packages/renderer/src/scene.js',root),'utf8');
 assert.doesNotMatch(scene,/packages\/ui\/assets/);
});
