import type {Profession} from "../../domain/src/contracts.ts";
import type {WorkDomain} from "./characters.ts";
export const PROFESSIONS:Readonly<Record<Profession,{label:string;domain:WorkDomain|null}>>=Object.freeze({
 farm:{label:"Agricultor",domain:"farming"},collector:{label:"Coletor",domain:"farming"},
 woodcutter:{label:"Lenhador",domain:"woodcutting"},miner:{label:"Minerador",domain:"mining"},
 builder:{label:"Construtor",domain:"building"},artisan:{label:"Artesão",domain:"crafting"},
 cook:{label:"Cozinheiro",domain:"crafting"},carrier:{label:"Transportador",domain:"hauling"},
 gravedigger:{label:"Coveiro",domain:"hauling"},healer:{label:"Curandeiro",domain:null}
});
export function isProfession(value:unknown):value is Profession{
 return typeof value==="string"&&Object.hasOwn(PROFESSIONS,value);
}
