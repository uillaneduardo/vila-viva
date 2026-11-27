import {uiAssets} from './registry.js';
const ids=Object.freeze({'action.add-npc':'npc','action.build':'house','action.add-wood':'wood','action.add-stone':'stone','action.add-food':'apple','resource.wood':'wood','resource.stone':'stone','resource.food':'apple','choice.npc.settler':'npc','choice.building.depot':'depot','choice.building.workshop':'forge','choice.tree.adult':'tree','choice.ore.iron':'iron','choice.ore.copper':'copper'});
export function registerRusticUi(registry=uiAssets){
 for(const [id,name] of Object.entries(ids))registry.registerSprite(id,'/assets/ui/rustic/'+name+'.svg',{theme:'rustic-dark'});
}
