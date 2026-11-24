/** Data-driven planning: priorities never depend on UI nor building-specific engine code. */
export interface LeadershipProjectPolicy {
 blueprintId:string;priority:number;need:string;
}
export const LEADERSHIP_PROJECTS:readonly LeadershipProjectPolicy[]=Object.freeze([
 {blueprintId:"building.depot",priority:100,need:"Garantir estoque para alimentos, sementes e materiais"},
 {blueprintId:"building.community_house",priority:90,need:"Garantir cama e abrigo para habitantes"},
 {blueprintId:"building.workshop",priority:78,need:"Habilitar transformação mineral e fabricação de ferramentas"},
 {blueprintId:"building.family_house",priority:60,need:"Criar residências familiares permanentes"},
 {blueprintId:"building.cafeteria",priority:58,need:"Preparar refeições comunitárias"},
 {blueprintId:"building.mine",priority:55,need:"Suprir escassez de minério superficial"},
 {blueprintId:"building.cemetery",priority:65,need:"Garantir sepultamentos e bem-estar coletivo"}
]);
export const LEADER_DECISION_INTERVAL=12;
export const MAX_SIMULTANEOUS_PROJECTS=1;
