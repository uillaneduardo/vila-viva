import {uiAssets} from './registry.js';

/** Sprite-aware UI node; absence/broken image keeps the inline SVG visible.
 * Image URL comes only from the registry's validated local path.
 * No domain behavior, locale string or network API is needed here.
 */
export function createUiVisual(id,{size=20,state="normal",theme}={}){
 const resolved=uiAssets.resolve(id,{state,...(theme?{theme}:{})});
 const container=document.createElement('span');
 container.className='ui-visual';
 container.dataset.uiVisual=resolved.id;
 container.dataset.visualState=resolved.state;
 container.setAttribute('aria-hidden','true');
 container.style.setProperty('--ui-visual-size',Math.min(64,Math.max(8,Number.isFinite(size)?Math.round(size):20))+'px');
 const fallback=document.createElement('span');
 fallback.className='ui-visual-fallback';
 fallback.innerHTML=uiAssets.icon(resolved.id,{size,state,...(theme?{theme}:{})});
 container.append(fallback);
 if(resolved.sprite){
  const img=document.createElement('img');
  img.className='ui-visual-sprite';
  img.alt='';
  img.decoding='async';
  img.addEventListener('load',()=>{if(img.naturalWidth)container.classList.add('sprite-loaded');});
  img.addEventListener('error',()=>container.classList.remove('sprite-loaded'));
  img.src=resolved.sprite;
  container.append(img);
 }
 return container;
}
