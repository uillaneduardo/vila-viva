/** Appearance contract only: stable blueprint-derived ID, no engine imports. */
export const BUILDING_VISUALS=Object.freeze({
 'buildings/community_house':Object.freeze({src:'/assets/world/buildings/community_house_simple.svg',frameWidth:96,frameHeight:96,frameCount:6,pivotX:48,pivotY:48,states:Object.freeze(['stage:0','stage:1','stage:2','stage:3','completed','destroyed'])}),
 'buildings/family_house':Object.freeze({src:'/assets/world/buildings/family_house_simple.svg',frameWidth:96,frameHeight:96,frameCount:5,pivotX:48,pivotY:48,states:Object.freeze(['stage:0','stage:1','stage:2','completed','destroyed'])}),
 'buildings/depot':Object.freeze({src:'/assets/world/buildings/depot_simple.svg',frameWidth:96,frameHeight:96,frameCount:5,pivotX:48,pivotY:48,states:Object.freeze(['stage:0','stage:1','stage:2','completed','destroyed'])}),
 'buildings/workshop':Object.freeze({src:'/assets/world/buildings/workshop_simple.svg',frameWidth:96,frameHeight:96,frameCount:4,pivotX:48,pivotY:48,states:Object.freeze(['stage:0','stage:1','completed','destroyed'])}),
 'buildings/cafeteria':Object.freeze({src:'/assets/world/buildings/cafeteria_simple.svg',frameWidth:96,frameHeight:96,frameCount:4,pivotX:48,pivotY:48,states:Object.freeze(['stage:0','stage:1','completed','destroyed'])}),
 'buildings/mine':Object.freeze({src:'/assets/world/buildings/mine_simple.svg',frameWidth:96,frameHeight:96,frameCount:4,pivotX:48,pivotY:48,states:Object.freeze(['stage:0','stage:1','completed','destroyed'])}),
 'buildings/cemetery':Object.freeze({src:'/assets/world/buildings/cemetery_simple.svg',frameWidth:96,frameHeight:96,frameCount:3,pivotX:48,pivotY:48,states:Object.freeze(['stage:0','completed','destroyed'])})
});
export function resolveBuildingVisual(entity){
 const id='buildings/'+String(entity.blueprintId??'unknown').replace(/^building\./,'');
 const index=Math.max(0,entity.stageIndex??0);
 const state=entity.status==='destroyed'?'destroyed':entity.status==='completed'?'completed':id==='buildings/community_house'?['site','foundation','structure','roof'][Math.min(3,index)]:id==='buildings/depot'?['site','foundation','structure'][Math.min(2,index)]:'stage:'+index;
 return {id,state,scale:1,level:Number.isInteger(entity.level)&&entity.level>0?entity.level:1};
}
