import {ICON_GEOMETRY} from './icons/definitions.js';
import {UI_VISUAL_MANIFEST} from './manifest.js';
import {DEFAULT_UI_THEME,UI_THEMES} from './themes/index.js';

const VALID_STATES=Object.freeze(["normal","hover","selected","disabled","alert"]);
const VALID_SPRITE_PATH=/^\/assets\/ui\/[a-z0-9][a-z0-9/_-]*\.(?:png|webp|svg)$/;

/** One registry per client/root so art packs are replaceable without changing game logic. */
export class UiAssetRegistry{
 constructor({manifest=UI_VISUAL_MANIFEST,theme=DEFAULT_UI_THEME}={}){
  if(manifest.schemaVersion!==1)throw Error("Unsupported UI visual manifest version");
  if(!UI_THEMES[theme])throw Error("Unknown theme: "+theme);
  this.manifest=manifest;
  this.theme=theme;
  this.spriteOverrides=new Map();
 }
 resolveId(id){
  const key=this.manifest.aliases?.[id]??id;
  return Object.hasOwn(this.manifest.visuals,key)?key:"ui.unavailable";
 }
 setTheme(theme){
  if(!UI_THEMES[theme])throw Error("Unknown theme: "+theme);
  this.theme=theme;
 }
 /** The exact source is a same-origin project asset under /assets/ui/ (no remote URLs). */
 registerSprite(id,src,{theme=this.theme,state="normal"}={}){
  const key=this.resolveId(id);
  if(key==="ui.unavailable"&&id!=="ui.unavailable")throw Error("Unknown visual: "+id);
  if(!VALID_STATES.includes(state))throw Error("Unknown visual state: "+state);
  if(!UI_THEMES[theme])throw Error("Unknown theme: "+theme);
  if(!VALID_SPRITE_PATH.test(src)||src.includes(".."))throw Error("Invalid sprite asset path");
  this.spriteOverrides.set(theme+"|"+key+"|"+state,src);
 }
 resolve(id,{state="normal",theme=this.theme}={}){
  if(!VALID_STATES.includes(state))throw Error("Unknown visual state: "+state);
  if(!UI_THEMES[theme])throw Error("Unknown theme: "+theme);
  const key=this.resolveId(id);
  const definition=this.manifest.visuals[key];
  const sprite=this.spriteOverrides.get(theme+"|"+key+"|"+state)
   ??this.spriteOverrides.get(theme+"|"+key+"|normal")
   ??definition.sprite??null;
  return Object.freeze({id:key,state,theme,icon:definition.icon,sprite});
 }
 icon(id,{size=20,state="normal",theme=this.theme}={}){
  const asset=this.resolve(id,{state,theme});
  const geometry=ICON_GEOMETRY[asset.icon]??ICON_GEOMETRY.unavailable;
  const px=Math.min(64,Math.max(8,Number.isFinite(size)?Math.round(size):20));
  // Only fixed names and numeric dimensions are injected into markup.
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+px+'" height="'+px+
   '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"'+
   ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-visual="'+
   asset.id+'" data-visual-state="'+asset.state+'">'+geometry+'</svg>';
 }
}
export const uiAssets=new UiAssetRegistry();
export const getUiVisual=(id,options)=>uiAssets.resolve(id,options);
export const getUiIcon=(id,options)=>uiAssets.icon(id,options);
