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
 if(resolveWorkAnimation(entity))return 'working';
 if(moving.has(activity))return 'moving';
 if(working.has(activity))return 'working';
 return 'idle';
}

// A profession is persistent; work is a transient visual action.
const professions=new Set(['farm','builder','miner','woodcutter','cook','carrier','artisan','healer']);
export function resolveCharacterRole(entity){
 if(!entity||entity.health<=0)return null;
 if(entity.communityRole==='leader')return 'leader';
 return professions.has(entity.profession)?entity.profession:null;
}
export function resolveFacing(dx,dy,fallback='south'){
 if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.abs(dx)+Math.abs(dy)<.001)return fallback;
 return Math.abs(dx)>=Math.abs(dy)?(dx>0?'east':'west'):(dy>0?'south':'north');
}

/** Work animations describe actions, not professions. Old worlds can use label fallback. */
const clipsByAction=Object.freeze({
 'construction.work':'hammer','construction.deliver':'carry','construction.removal.work':'hammer',
 'farming.plant':'plant','resource.harvest':'harvest','nature.cut':'axe','mine.extract':'pickaxe',
 'storage.deposit':'carry','storage.withdraw':'carry','item.pickup':'pickup','item.drop':'carry',
 'storage.temporary.create':'carry','storage.temporary.remove':'hammer','burial.pickup':'carry',
 'burial.inter':'dig','burial.drop':'carry','npc.equip':'equip','npc.eat':'eat'
});
const clipsByLabel=Object.freeze({'Construindo':'hammer','Desmontando':'hammer','Plantando':'plant','Colhendo safra':'harvest','Colhendo alimento':'harvest','Operando mina':'pickaxe','Cortando madeira seca':'axe','Renovando pomar':'axe','Sepultando':'dig','Fabricando':'craft','Preparando alimento':'cook','Cozinhando':'cook','Alimentando-se':'eat','Tratando ferimentos':'heal','Equipando':'equip','Armazenando recursos':'carry','Entregando materiais':'carry','Recolhendo itens':'pickup'});
export function resolveWorkAnimation(entity){
 const action=entity?.ai?.workAction,material=entity?.ai?.workMaterial;
 if(action==='resource.gather')return material==='wood'?'axe':['iron_ore','copper_ore','stone'].includes(material)?'pickaxe':'harvest';
 if(action==='production.work')return material==='building.cafeteria'?'cook':'craft';
 return (Object.hasOwn(clipsByAction,action)?clipsByAction[action]:null)??(Object.hasOwn(clipsByLabel,entity?.ai?.activity)?clipsByLabel[entity.ai.activity]:null);
}
