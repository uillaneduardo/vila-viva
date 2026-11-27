import type {ProfessionId} from "../../domain/src/contracts.ts";
import type {WorkDomain} from "./characters.ts";
export const PROFESSIONS:Readonly<Record<ProfessionId,{label:string;domain:WorkDomain}>>=Object.freeze({
 farmer:{label:"Agricultor",domain:"farming"},collector:{label:"Coletor",domain:"farming"},
 lumberjack:{label:"Lenhador",domain:"woodcutting"},miner:{label:"Minerador",domain:"mining"},
 builder:{label:"Construtor",domain:"building"},artisan:{label:"Artesão",domain:"crafting"},
 cook:{label:"Cozinheiro",domain:"crafting"},hauler:{label:"Transportador",domain:"hauling"},
 gravedigger:{label:"Coveiro",domain:"hauling"}
});
export function isProfession(value:unknown):value is ProfessionId{
 return typeof value==="string"&&Object.hasOwn(PROFESSIONS,value);
}
