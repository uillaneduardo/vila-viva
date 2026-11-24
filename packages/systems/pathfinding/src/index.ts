import type {World,Entity,Position} from "../../../domain/src/contracts.ts";
import {movementCost,orthogonallyAdjacent} from "../../collision/src/index.ts";
import {nearFootprint} from "../../construction/src/index.ts";
const DIRECTIONS:readonly Position[]=[{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}];
const key=(p:Position)=>p.x+","+p.y;
export const adjacentToEntity=(point:Position,target:Entity):boolean=>
 target.kind==="construction"?nearFootprint(point,target):target.kind==="item"?(point.x===target.position.x&&point.y===target.position.y)||orthogonallyAdjacent(point,target.position):orthogonallyAdjacent(point,target.position);
/** A* with an admissible distance-to-footprint heuristic and deterministic ties. */
export function routeCost(world:World,route:Position[],ignoreActorId?:string):number{
 return route.slice(1).reduce((sum,p)=>sum+movementCost(world,p,ignoreActorId),0);
}
export function routeToEntity(world:World,start:Position,target:Entity,ignoreActorId?:string,allowTargetCell=false):Position[]|null {
 const reached=(p:Position)=>adjacentToEntity(p,target)||allowTargetCell&&p.x===target.position.x&&p.y===target.position.y;
 if(reached(start))return [{...start}];
 const width=target.kind==="construction"?target.footprint.width:1,height=target.kind==="construction"?target.footprint.height:1;
 const heuristic=(p:Position)=>Math.max(0,Math.max(target.position.x-p.x,p.x-(target.position.x+width-1),0)+
  Math.max(target.position.y-p.y,p.y-(target.position.y+height-1),0)-1);
 const open=[{point:{...start},g:0,f:heuristic(start),order:0}];
 const parents=new Map<string,string|null>([[key(start),null]]),byKey=new Map<string,Position>([[key(start),start]]);
 const best=new Map<string,number>([[key(start),0]]);let order=0;
 while(open.length){
  open.sort((a,b)=>b.f-a.f||b.order-a.order);
  const {point:here,g}=open.pop()!,hereKey=key(here);
  if(g>(best.get(hereKey)??Infinity))continue;
  if(reached(here)){
   const route:Position[]=[];let current:string|null=hereKey;
   while(current!==null){route.push(byKey.get(current)!);current=parents.get(current)!;}
   return route.reverse();
  }
  for(const d of DIRECTIONS){
   const next={x:here.x+d.x,y:here.y+d.y},id=key(next),cost=movementCost(world,next,ignoreActorId),ng=g+cost;
   if(!Number.isFinite(cost)||ng>=(best.get(id)??Infinity))continue;
   best.set(id,ng);parents.set(id,hereKey);byKey.set(id,next);
   open.push({point:next,g:ng,f:ng+heuristic(next),order:++order});
  }
 }
 return null;
}
