import {TickPlayback} from './tick-playback.js';
/** Decorates a drawing surface injected by the composition root.
 * No knowledge of sockets, simulation engine, persistence or UI.
 */
export function createTickRenderAdapter(surface,{now=()=>performance.now()}={}){
 const playback=new TickPlayback();
 surface.positionProvider=(entity,time)=>playback.position(entity,time);
 const setWorld=surface.setWorld.bind(surface);
 surface.setWorld=(world,options={})=>{
  playback.push(world,{...options,receivedAt:now()});
  // Canvas keeps authoritative state for tools; only drawing and picking use playback positions.
  setWorld(world,{reset:true,paused:options.paused});
 };
 return surface;
}
