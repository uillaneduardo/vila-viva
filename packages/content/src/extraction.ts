/** Balance policy for extraction. No tool blocks bootstrap mining. */
export const MINING_YIELD=Object.freeze({
 surface:Object.freeze({unequipped:Object.freeze({min:1,max:1}),equipped:Object.freeze({min:3,max:5})}),
 underground:Object.freeze({unequipped:Object.freeze({min:1,max:1}),equipped:Object.freeze({min:4,max:6})})
});
export const isMineral=(item:string)=>["stone","iron_ore","copper_ore","gold_ore"].includes(item);
export const miningYield=(underground:boolean,equipped:boolean)=>MINING_YIELD[underground?"underground":"surface"][equipped?"equipped":"unequipped"];
