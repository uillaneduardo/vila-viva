/** Draw plan based on interpolated positions, never mutates authoritative entities. */
export function planVisibleEntities(entities,positionFor,bounds){
 const rows=[];
 for(const entity of entities){
  if(entity.kind==='item'||entity.kind==='planting_zone'||(entity.kind==='character'&&entity.bodyCarriedBy)||(entity.kind==='construction'&&entity.blueprintId==='building.cemetery'&&entity.status==='completed'))continue;
  const pos=positionFor(entity),width=entity.footprint?.width??1,height=entity.footprint?.height??1;
  // Conservative padding retains roof overhangs and large sprites.
  if(pos.x+width+2<bounds.x0||pos.x-2>bounds.x1||pos.y+height+2<bounds.y0||pos.y-2>bounds.y1)continue;
  rows.push({entity,pos,depth:pos.y+height});
 }
 rows.sort((a,b)=>a.depth-b.depth||a.entity.id.localeCompare(b.entity.id));
 return rows;
}
