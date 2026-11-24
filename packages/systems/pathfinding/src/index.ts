import type {World,Entity,Position} from "../../../domain/src/contracts.ts";
import {canEnter,orthogonallyAdjacent} from "../../collision/src/index.ts";
import {nearFootprint} from "../../construction/src/index.ts";
const DIRECTIONS:readonly Position[]=[{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}];
const key=(p:Position)=>p.x+","+p.y;
export const adjacentToEntity=(point:Position,target:Entity):boolean=>
 target.kind==="construction"?nearFootprint(point,target):target.kind==="item"?(point.x===target.position.x&&point.y===target.position.y)||orthogonallyAdjacent(point,target.position):orthogonallyAdjacent(point,target.position);
/** BFS over authoritative occupied world cells. Returns [start,...,adjacent goal]; null if unreachable. */
export function routeToEntity(world:World,start:Position,target:Entity,ignoreActorId?:string):Position[]|null {
 if(adjacentToEntity(start,target))return [{...start}];
 const queue:Position[]=[{...start}],parents=new Map<string,string|null>([[key(start),null]]);
 const byKey=new Map<string,Position>([[key(start),{...start}]]);
 for(let head=0;head<queue.length;head++){
  const here=queue[head];
  for(const direction of DIRECTIONS){
   const next={x:here.x+direction.x,y:here.y+direction.y},id=key(next);
   if(parents.has(id)||!canEnter(world,next,ignoreActorId))continue;
   parents.set(id,key(here));byKey.set(id,next);
   if(adjacentToEntity(next,target)){
    const route:Position[]=[];
    let current:string|null=id;
    while(current!==null){route.push(byKey.get(current)!);current=parents.get(current)!;}
    return route.reverse();
   }
   queue.push(next);
  }
 }
 return null;
}
