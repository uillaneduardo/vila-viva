// Compatibility adapter for current authoritative AI labels. Unknown states remain idle.
// Future stable activity IDs can replace this mapping without changing assets or gameplay.
const moving=new Set(['Deslocando-se','Indo dormir','Explorando','Indo desmontar']);
const resting=new Set(['Dormindo','Descansando']);
const working=new Set(['Renovando pomar','Plantando','Devolvendo corpo','Sepultando','Recolhendo falecido','Armazenando recursos','Entregando à oficina','Retirando insumos','Extraindo para fabricação','Fabricando','Distribuindo produção','Equipando','Buscando equipamento','Entregando materiais','Buscando material','Coletando material','Buscando recursos','Cortando madeira seca','Transportando minério','Colhendo safra','Operando mina','Recolhendo itens','Buscando alimento','Colhendo alimento','Buscando sementes','Construindo','Desmontando']);
export function resolveCharacterState(entity,{movingVisually=false}={}){
 if(entity.health<=0)return 'dead';
 if(movingVisually)return 'moving';
 const activity=entity.ai?.activity;
 if(resting.has(activity))return 'resting';
 if(moving.has(activity))return 'moving';
 if(working.has(activity))return 'working';
 return 'idle';
}

// Visual job markers are projections of real activity, not permanent occupations.
const rolesByActivity=Object.freeze({
 'Plantando':'farm','Colhendo safra':'farm','Renovando pomar':'farm','Buscando sementes':'farm','Colhendo alimento':'farm',
 'Construindo':'builder','Indo construir':'builder','Desmontando':'builder','Indo desmontar':'builder','Entregando materiais':'builder',
 'Operando mina':'miner','Transportando minério':'miner','Cortando madeira seca':'woodcutter',
 'Preparando alimento':'cook','Cozinhando':'cook','Fabricando':'artisan','Extraindo para fabricação':'artisan',
 'Armazenando recursos':'carrier','Recolhendo itens':'carrier','Distribuindo produção':'carrier','Buscando material':'carrier',
 'Tratando ferimentos':'healer','Tratando':'healer'
});
export function resolveCharacterRole(entity){
 if(!entity||entity.health<=0)return null;
 if(entity.communityRole==='leader')return 'leader';
 return rolesByActivity[entity.ai?.activity]??null;
}
