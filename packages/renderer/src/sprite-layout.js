/** Pure projection. Logical footprint, collision and picking never use these dimensions. */
export function fitSpriteFrame(definition,x,y,width,height,fit='contain'){
 const fw=definition.frameWidth,fh=definition.frameHeight;
 const uniform=Math.min(width/fw,height/fh);
 const w=fit==='stretch'?width:fw*uniform,h=fit==='stretch'?height:fh*uniform;
 return {x:x-w*definition.pivotX/fw,y:y-h*definition.pivotY/fh,width:w,height:h};
}
export function frameForState(definition,state,time=0,animate=false){
 const sequence=animate?definition.animations?.[state]:undefined;
 if(sequence?.frames.length&&sequence.frameMs>0){
  const index=Math.floor(Math.max(0,Number.isFinite(time)?time:0)/sequence.frameMs)%sequence.frames.length;
  const frame=definition.states.indexOf(sequence.frames[index]);
  if(frame>=0)return frame;
 }
 return definition.states.indexOf(state);
}
