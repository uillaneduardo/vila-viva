/** Reserved visual resources only; never registered as gameplay blueprints. */
const descriptor=(id,label)=>Object.freeze({label,planned:true,src:'/assets/world/buildings/planned/'+id+'_simple.svg',frameWidth:96,frameHeight:96,frameCount:5,pivotX:48,pivotY:48,states:Object.freeze(['stage:0','stage:1','stage:2','completed','destroyed'])});
export const PLANNED_BUILDING_VISUALS=Object.freeze({
 'buildings/farm_plot':descriptor('farm_plot',"Canteiro agrícola"),
 'buildings/smithy':descriptor('smithy',"Ferraria"),
 'buildings/lumber_camp':descriptor('lumber_camp',"Acampamento madeireiro"),
 'buildings/quarry':descriptor('quarry',"Pedreira"),
 'buildings/infirmary':descriptor('infirmary',"Enfermaria"),
 'buildings/herbalist':descriptor('herbalist',"Herbalista"),
 'buildings/kitchen':descriptor('kitchen',"Cozinha"),
 'buildings/storage_yard':descriptor('storage_yard',"Pátio de armazenamento"),
 'buildings/market':descriptor('market',"Mercado"),
 'buildings/well':descriptor('well',"Poço"),
 'buildings/guard_post':descriptor('guard_post',"Posto de guarda"),
 'buildings/watchtower':descriptor('watchtower',"Torre de vigia"),
 'buildings/school':descriptor('school',"Escola"),
 'buildings/hall':descriptor('hall',"Salão comunitário")
});
export const PLANNED_BUILDING_ALIASES=Object.freeze({'buildings/field':'buildings/farm_plot','buildings/forge':'buildings/smithy','buildings/wood_yard':'buildings/lumber_camp'});
