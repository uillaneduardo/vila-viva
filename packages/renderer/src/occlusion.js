/** Pure visual policy: receives projected entities, never imports simulation rules. */
export function createOcclusionResolver(entities,positionOf=e=>e.position){
 const cells=entities.filter(e=>e.kind==='character'&&e.health>0&&!e.bodyCarriedBy)
  .map(e=>positionOf(e)).filter(Boolean).map(p=>({x:Math.floor(p.x+.5),y:Math.floor(p.y+.5)}));
 const occupied=new Set(cells.map(p=>p.x+','+p.y));
 return entity=>{
  const building=entity.kind==='construction'&&entity.status==='completed';
  const canopy=entity.kind==='resource'&&entity.sourceId==='apple_tree';
  if(!building&&!canopy)return 1;
  const {x,y}=entity.position;
  const {width,height}=building?entity.footprint:{width:1,height:1};
  for(let dy=0;dy<height;dy++)for(let dx=0;dx<width;dx++)
   if(occupied.has((x+dx)+','+(y+dy)))return .38;
  return 1;
 };
}
