// Transport-only projection diff. Never mutates domain state.
export const STREAM_VERSION=1;
export function delta(previous,next){
 const old=new Map(previous.world.entities.map(e=>[e.id,JSON.stringify(e)]));
 const ids=new Set(next.world.entities.map(e=>e.id));
 const {entities,...world}=next.world;
 return {...next,world,upsert:entities.filter(e=>old.get(e.id)!==JSON.stringify(e)),
  remove:previous.world.entities.filter(e=>!ids.has(e.id)).map(e=>e.id),order:entities.map(e=>e.id)};
}
export function applyDelta(previous,change){
 const entities=new Map(previous.world.entities.map(e=>[e.id,e]));
 for(const id of change.remove)entities.delete(id);
 for(const e of change.upsert)entities.set(e.id,e);
 const {upsert,remove,order,...projection}=change;
 if(order.length!==entities.size||new Set(order).size!==order.length||order.some(id=>!entities.has(id)))throw Error('INVALID_DELTA');
 return {...projection,world:{...projection.world,entities:order.map(id=>entities.get(id))}};
}
