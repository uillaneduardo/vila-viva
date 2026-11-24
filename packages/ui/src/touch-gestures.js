/** Touch input only. No scene, engine, network or DOM dependency in the gesture state. */
export function createTouchGestures({pan,zoom,tap,cancel=()=>{},threshold=7}){
 const points=new Map();
 let start=null,last=null,dragged=false,multiple=false;
 const pair=()=>[...points.values()].slice(0,2);
 const geometry=()=>{const [a,b]=pair();return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.hypot(a.x-b.x,a.y-b.y)};};
 const reset=()=>{points.clear();start=last=null;dragged=multiple=false;};
 return {
  down(id,p){
   if(points.has(id))return;
   points.set(id,p);
   if(points.size===1){start=last=p;dragged=multiple=false;}
   else {multiple=true;cancel();}
  },
  move(id,p){
   if(!points.has(id))return;
   if(points.size>=2){
    const before=geometry();points.set(id,p);const after=geometry();
    if(before.d>0&&after.d>0){pan(after.x-before.x,after.y-before.y);zoom(after.x,after.y,after.d/before.d);}
    return;
   }
   points.set(id,p);
   if(!dragged&&!multiple&&Math.hypot(p.x-start.x,p.y-start.y)<threshold)return;
   dragged=true;pan(p.x-last.x,p.y-last.y);last=p;
  },
  up(id,p){
   if(!points.has(id))return;
   const eligible=points.size===1&&!multiple&&!dragged&&Math.hypot(p.x-start.x,p.y-start.y)<threshold;
   points.delete(id);
   if(points.size===1)last=[...points.values()][0];
   if(!points.size)reset();
   if(eligible)tap(p);
  },
  abort(){reset();cancel();},
  get active(){return points.size>0;}
 };
}
