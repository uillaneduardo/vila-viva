/** Read-only affinity projection; matches the engine's multiplicative trait rule. */
export const WORK_DOMAINS=Object.freeze([['farming','Agricultura'],['woodcutting','Madeira'],['mining','Mineração'],['building','Construção'],['crafting','Fabricação'],['hauling','Transporte']]);
export function workProfile(entity,catalog){
 const available=!!catalog?.traits&&Array.isArray(entity.traits)&&entity.traits.every(id=>Object.hasOwn(catalog.traits,id));
 const affinities=available?WORK_DOMAINS.map(([id,label])=>({id,label,factor:entity.traits.reduce((n,t)=>n*(catalog.traits[t].affinities?.[id]??1),1)})).sort((a,b)=>b.factor-a.factor||a.id.localeCompare(b.id)):[];
 const best=affinities[0]?.factor??1;
 const preference=!available?'Indisponível':best<=1?'Sem preferência dominante':affinities.filter(a=>a.factor===best).map(a=>a.label).join(' / ');
 return {affinities,preference,best:available?best:null};
}
export function workRows(world,catalog){
 return (world?.entities??[]).filter(e=>e.kind==='character'&&!e.ownerId&&e.health>0).map(e=>({id:e.id,name:e.name,leader:e.communityRole==='leader',activity:e.ai?.activity??'Aguardando',...workProfile(e,catalog)}));
}
