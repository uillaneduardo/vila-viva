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
 if(entity.ai?.action&&entity.ai.action!=='movement.move')return 'working';
 if(moving.has(activity)||activity?.startsWith('Indo ')||activity?.startsWith('Carregando ')||activity?.startsWith('Transportando falecido'))return 'moving';
 if(working.has(activity))return 'working';
 return 'idle';
}

// A profession is persistent; work is a transient visual action.
const professions=new Set(['farm','builder','miner','woodcutter','cook','carrier','artisan','healer','collector','gravedigger']);
export function resolveCharacterRole(entity){
 if(!entity||entity.health<=0)return null;
 if(entity.communityRole==='leader')return 'leader';
 return professions.has(entity.profession)?entity.profession:null;
}
export function resolveFacing(dx,dy,fallback='south'){
 if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.abs(dx)+Math.abs(dy)<.001)return fallback;
 return Math.abs(dx)>=Math.abs(dy)?(dx>0?'east':'west'):(dy>0?'south':'north');
}
