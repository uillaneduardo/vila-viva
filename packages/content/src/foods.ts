/** Edible items and nutritional effects; seeds are *not* edible. */
export const FOOD_ITEMS=Object.freeze({
 apple:Object.freeze({id:"apple",label:"Maçã",satiety:35}),
 carrot:Object.freeze({id:"carrot",label:"Cenoura",satiety:28}),
 potato:Object.freeze({id:"potato",label:"Batata",satiety:42})
});
export function foodItem(id:string){return Object.hasOwn(FOOD_ITEMS,id)?FOOD_ITEMS[id as keyof typeof FOOD_ITEMS]:undefined;}
