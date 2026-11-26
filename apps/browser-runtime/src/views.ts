import {workerCapacity} from "../../../packages/systems/construction/src/work-cycle.ts";
import {displayText} from "../../../packages/domain/src/localization.ts";
import {baseRegistry,RESOURCE_PRESETS} from "../../../packages/content/src/catalog.ts";
import {EFFECTS} from "../../../packages/content/src/effects/catalog.ts";
import {COMMUNITY_HOUSE} from "../../../packages/content/src/buildings/community-house.ts";
import {BUILDING_BLUEPRINTS,buildingBlueprint} from "../../../packages/content/src/buildings/registry.ts";
import {currentStage,materialsRemaining,hasMaterials,buildingCapabilities,storageDefinition,storedTotal,storageFree,buildingLevel,nextUpgrade} from "../../../packages/systems/construction/src/index.ts";
import {NATURAL_SOURCES} from "../../../packages/content/src/natural-sources.ts";
import {FOOD_ITEMS} from "../../../packages/content/src/foods.ts";
import {countZoneCrops} from "../../../packages/systems/farming/src/index.ts";
import {SCENERY_PRESETS} from "../../../packages/content/src/scenery.ts";
import {resolveAttributes} from "../../../packages/systems/effects/src/resolver.ts";
import {bedsIn,reservationCount,dependentBedsIn} from "../../../packages/systems/housing/src/index.ts";
import {TOOL_PRESETS,injuryProbability} from "../../../packages/systems/risk/src/index.ts";
import {TRAITS} from "../../../packages/content/src/characters.ts";
import {cemeteryCapacity,availableGraves} from "../../../packages/systems/mortality/src/index.ts";
import type {AcceptedAction} from "../../../packages/domain/src/activity.ts";
import {LEADERSHIP_PROJECTS} from "../../../packages/content/src/leadership.ts";
import {ITEMS,ITEM_CATEGORIES} from "../../../packages/content/src/items.ts";
import {RECIPES} from "../../../packages/content/src/recipes.ts";
import {productionNeeds} from "../../../packages/systems/leadership/src/production.ts";
import {productionDefinition,activeOrder,stockMissing,canWorkProduction} from "../../../packages/systems/production/src/index.ts";
export const clockView=(world,clock)=>({speed:clock.speed,paused:clock.speed===0,tick:world.tick,day:1+Math.floor(world.tick/240),hour:Math.floor(world.tick/10)%24,minute:(world.tick%10)*6});
export function catalogView(){return {
    locale:"pt-BR",
    entities:Object.fromEntries([...baseRegistry.entities].map(([id,d])=>[id,displayText(d.displayName)])),
    actions:Object.fromEntries([...baseRegistry.actions].map(([id,d])=>[id,displayText(d.displayName)])),
    resources:Object.fromEntries(Object.values(RESOURCE_PRESETS).map(p=>[p.resourceType,displayText(baseRegistry.entity(p.definitionId).displayName)])),
    effects:Object.fromEntries(Object.values(EFFECTS).map(e=>[e.id,displayText(e.displayName)])),
    tools:Object.fromEntries(Object.values(TOOL_PRESETS).map(tool=>[tool.id,tool.label])),
    traits:Object.fromEntries(Object.entries(TRAITS).map(([id,trait])=>[id,{
      label:trait.label,description:trait.description,affinities:trait.affinities??{},
      healing:trait.healing??1,risk:trait.risk??1
    }])),
    buildings:Object.fromEntries(Object.values(BUILDING_BLUEPRINTS).map(b=>[b.id,displayText(b.displayName)])),
    buildingBlueprints:Object.fromEntries(Object.values(BUILDING_BLUEPRINTS).map(b=>[b.id,{
      id:b.id,label:displayText(b.displayName),footprint:b.footprint,version:b.version,
      stages:b.stages.map(s=>({id:s.id,label:displayText(s.displayName),materials:s.materials,workUnits:s.workUnits})),
      effects:b.effects,upgrades:b.upgrades??[],storage:b.storage??null,housing:b.housing??null,cemetery:b.cemetery??null,
      production:b.production??null,mining:b.mining??null
    }])),
    naturalSources:Object.fromEntries(Object.values(NATURAL_SOURCES).map(s=>[s.id,{
      label:s.label,productId:s.productId,seedItem:s.seedItem,seedsPerHarvest:s.seedsPerHarvest,drop:s.drop,
      growthMode:s.growthMode,production:s.production,stages:s.stages,blocksMovement:s.blocksMovement
     }])),
    foods:Object.fromEntries(Object.values(FOOD_ITEMS).map(f=>[f.id,{label:f.label,satiety:f.satiety}])),
    scenery:Object.fromEntries(Object.values(SCENERY_PRESETS).map(s=>[s.id,s.label])),
    leadershipProjects:LEADERSHIP_PROJECTS,
    items:ITEMS,itemCategories:ITEM_CATEGORIES,recipes:RECIPES
   };}
export function economyView(world){
    const workshops=world.entities.filter(e=>e.kind==="construction"&&!!productionDefinition(e));
    const depots=world.entities.filter(e=>e.kind==="construction"&&e.blueprintId==="building.depot"&&
     !!storageDefinition(e));
    const leader=world.entities.find(e=>e.kind==="character"&&e.health>0&&e.communityRole==="leader");
    return {
     tick:world.tick,
     leader:leader?.kind==="character"?{id:leader.id,name:leader.name,
      construction:leader.leadership?.lastReason??null,
      production:leader.leadership?.productionReason??null,
      lastRecipe:leader.leadership?.lastRecipeId??null}:null,
     productionNeeds:productionNeeds(world),
     workshops:workshops.map(e=>({id:e.id,blueprintId:e.blueprintId,
      order:activeOrder(e)??null,missing:activeOrder(e)?stockMissing(e,activeOrder(e)!.recipeId):{},
      ready:canWorkProduction(e),stock:e.stock??{}})),
     depots:depots.map(e=>({id:e.id,capacity:storageDefinition(e)?.capacity??0,
      occupied:storedTotal(e),stock:e.stock??{}}))
    };}
export function inspectView(world,id){
    const entity=world.entities.find(e=>e.id===id);
    if(!entity)return null;
    return {entityId:entity.id,
      attributes:entity.kind==="character"?resolveAttributes({...entity,attributes:{...entity.attributes,health:entity.health,energy:entity.energy}},world.tick):null,
      effects:entity.kind==="character"?(entity.effects??[]).map(e=>({
       id:e.instanceId,name:EFFECTS[e.definitionId]?.displayName["pt-BR"]??e.definitionId,
       sourceId:e.sourceId,stacks:e.stacks,expiresAtTick:e.expiresAtTick??null
      })):[],
      activity:entity.kind==="character"?entity.ai?.activity??null:null,
      route:entity.kind==="character"?entity.ai?.route??null:null,
      reason:entity.kind==="character"?entity.ai?.reason??"Sem tarefa":null,
      inventory:entity.kind==="character"?(entity.inventory??{}):null,
      leadership:entity.kind==="character"?entity.leadership??null:null,
      survival:entity.kind==="character"?{
       satiety:entity.satiety??100,equipment:entity.equipment??{},injuries:entity.injuries??0,
       risk:{
        wood:injuryProbability(entity,"resource.gather:wood",world.tick),
        stone:injuryProbability(entity,"resource.gather:stone",world.tick),
        building:injuryProbability(entity,"construction.work",world.tick),
        iron:injuryProbability(entity,"resource.gather:iron_ore",world.tick),
        copper:injuryProbability(entity,"resource.gather:copper_ore",world.tick),
        manufacturing:injuryProbability(entity,"production.work",world.tick)
       }
      }:null,
      natural:entity.kind==="resource"&&entity.sourceId?{
       species:entity.sourceId,productId:entity.productId,life:entity.life??null,
       production:NATURAL_SOURCES[entity.sourceId]?.production??null
      }:null,
      scenery:entity.kind==="obstacle"?{type:entity.obstacleType,blocksMovement:entity.blocksMovement,harvestable:false}:null,
      farming:entity.kind==="planting_zone"?{
       species:entity.sourceId,...countZoneCrops(world,entity)
      }:null,
      construction:entity.kind==="construction"?{
       blueprintId:entity.blueprintId,blueprintVersion:entity.blueprintVersion,
       level:buildingLevel(entity),upgrade:entity.upgrade??null,nextUpgrade:nextUpgrade(entity)??null,
       stage:currentStage(entity)?.id??null,remaining:materialsRemaining(entity),
       materialsReady:hasMaterials(entity),capabilities:buildingCapabilities(entity),
       workerCapacity:workerCapacity(entity),
       mining:entity.mineRemaining?{remaining:entity.mineRemaining,stock:entity.stock??{}}:null,
       stageIndex:entity.stageIndex,status:entity.status,availability:entity.availability,
       production:productionDefinition(entity)?{
        orders:entity.productionOrders??[],active:activeOrder(entity)??null,
        missing:activeOrder(entity)?stockMissing(entity,activeOrder(entity)!.recipeId):{},
        ready:canWorkProduction(entity),
        recipes:productionDefinition(entity)!.recipes
       }:null,
       cemetery:entity.blueprintId==="building.cemetery"?{
        capacity:cemeteryCapacity(entity),free:availableGraves(entity),
        burials:entity.burials??[]
       }:null,
       housing:bedsIn(entity)>0?{
        beds:bedsIn(entity),reserved:reservationCount(entity),residents:entity.residents??[],dependentBeds:dependentBedsIn(entity),
        reservations:Object.entries(entity.bedReservations??{}).map(([npcId,data])=>({
         npcId,name:world.entities.find(e=>e.id===npcId&&e.kind==="character")?.name??npcId,
         expiresTick:data.expiresTick
        }))
       }:null,
       storage:storageDefinition(entity)?{
        stock:entity.stock??{},total:storedTotal(entity),free:storageFree(entity),
        capacity:storageDefinition(entity)!.capacity,accepted:storageDefinition(entity)!.accepted
       }:null
      }:null,
      needs:entity.kind==="character"?{satiety:entity.satiety??100,health:entity.health,energy:entity.energy,sleepingInId:entity.sleepingInId??null}:null,social:null,
      decisions:entity.kind==="character"?entity.ai?.history??[]:null
    };}
export function projectWorldView(world,clock,timelineId,persistent=false,mode="browser"){
    const depots=world.entities.filter(e=>e.kind==="construction"&&
     e.blueprintId==="building.depot"&&!!storageDefinition(e));
    const storageSummary=depots.length?
     Object.fromEntries(Object.keys(ITEMS).map(
      item=>[item,depots.reduce((sum,d)=>sum+(d.stock?.[item]??0),0)])):null;
    if(storageSummary){
     storageSummary.food=(storageSummary.apple??0)+(storageSummary.carrot??0)+(storageSummary.potato??0);
     storageSummary.seeds=(storageSummary.apple_seed??0)+(storageSummary.carrot_seed??0)+(storageSummary.potato_seed??0)+(storageSummary.medicinal_herb_seed??0);
    }
    return {world,clock:clockView(world,clock),storageSummary,
    npcViews:Object.fromEntries(world.entities.filter(e=>e.kind==="character").map(e=>[e.id,{
     mood:resolveAttributes({...e,attributes:{...e.attributes,health:e.health,energy:e.energy}},world.tick).values.mood,
     activity:e.ai?.activity??null,reason:e.ai?.reason??"Sem tarefa",route:e.ai?.route??null,
     targetId:e.ai?.targetId??null
    }])),
    playerId:world.entities.find(e=>e.kind==="character"&&e.ownerId==="local-player")?.id??null,mode,persistent,
    timelineId};
}
