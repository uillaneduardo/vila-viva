import {createTickRenderAdapter} from './tick-render-adapter.js';
import {TerrainCache} from './terrain-cache.js';
import {planVisibleEntities} from './visual-order.js';
/** Composition only: reuse temporal playback, inject static and dynamic draw policies. */
export function createLayeredRenderAdapter(surface,{now,terrain=new TerrainCache()}={}){
 const adapter=createTickRenderAdapter(surface,{now});
 adapter.terrainPainter=(ctx,camera,world,bounds)=>terrain.paint(ctx,camera,world,bounds,!!adapter.soilOverlay);
 adapter.entityPlanner=planVisibleEntities;
 const dispose=adapter.dispose?.bind(adapter);
 adapter.dispose=()=>{terrain.clear();dispose?.();};
 return adapter;
}
