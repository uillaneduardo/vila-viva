import {createLayeredRenderAdapter} from './layered-render-adapter.js';
import {MotionPlayback} from './motion-playback.js';
export function createMotionRenderAdapter(surface,{now=()=>performance.now(),terrain}={}){
 const adapter=createLayeredRenderAdapter(surface,{now,terrain});
 const playback=new MotionPlayback(),setWorld=adapter.setWorld.bind(adapter);
 adapter.setWorld=(world,options={})=>{playback.push(world,{...options,receivedAt:now()});setWorld(world,options);};
 adapter.positionProvider=(entity,time)=>playback.position(entity,time);
 return adapter;
}
