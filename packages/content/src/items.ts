/** One source of truth for inventory labels, kinds, tool identity and storage sections. */
export type ItemCategory="raw"|"food"|"seed"|"processed"|"equipment";
export interface ItemDefinition {id:string;label:string;category:ItemCategory;description:string}
export const ITEMS:Readonly<Record<string,Readonly<ItemDefinition>>>=Object.freeze({
 wood:{id:"wood",label:"Madeira",category:"raw",description:"Material florestal"},
 stone:{id:"stone",label:"Pedra",category:"raw",description:"Material de construção"},
 iron_ore:{id:"iron_ore",label:"Minério de ferro",category:"raw",description:"Extraído da jazida"},
 copper_ore:{id:"copper_ore",label:"Minério de cobre",category:"raw",description:"Extraído da jazida"},
 meal:{id:"meal",label:"Refeição preparada",category:"food",description:"Alimento preparado no refeitório"},
 apple:{id:"apple",label:"Maçã",category:"food",description:"Alimento de pomar"},
 carrot:{id:"carrot",label:"Cenoura",category:"food",description:"Hortaliça"},
 potato:{id:"potato",label:"Batata",category:"food",description:"Hortaliça"},
 apple_seed:{id:"apple_seed",label:"Semente de macieira",category:"seed",description:"Plantio de pomar"},
 carrot_seed:{id:"carrot_seed",label:"Semente de cenoura",category:"seed",description:"Plantio de cenoura"},
 potato_seed:{id:"potato_seed",label:"Batata-semente",category:"seed",description:"Plantio de batata"},
 iron_ingot:{id:"iron_ingot",label:"Lingote de ferro",category:"processed",description:"Ferro fundido na oficina"},
 copper_ingot:{id:"copper_ingot",label:"Lingote de cobre",category:"processed",description:"Cobre fundido na oficina"},
 axe:{id:"axe",label:"Machado",category:"equipment",description:"Equipamento para cortar madeira"},
 pickaxe:{id:"pickaxe",label:"Picareta",category:"equipment",description:"Equipamento para mineração"},
 hammer:{id:"hammer",label:"Martelo",category:"equipment",description:"Equipamento para construção"}
});
export const ITEM_CATEGORIES:Readonly<Record<ItemCategory,string>>=Object.freeze({
 raw:"Recursos naturais",food:"Alimentos",seed:"Sementes",processed:"Materiais processados",equipment:"Ferramentas"
});
export const isItem=(id:string)=>Object.hasOwn(ITEMS,id);
export const isToolItem=(id:string)=>isItem(id)&&ITEMS[id].category==="equipment";
