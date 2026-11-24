import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";
import {godMenuOptions,BUILD_MODES,HAS_GOD_SUBMENU} from "../packages/ui/src/god-menu-definitions.js";
import {createHud} from "../packages/ui/src/hud.js";
import {BUILDING_BLUEPRINTS} from "../packages/content/src/buildings/registry.ts";
import {NATURAL_SOURCES} from "../packages/content/src/natural-sources.ts";
import {uiAssets} from "../packages/ui/assets/registry.js";
import {UI_VISUAL_MANIFEST} from "../packages/ui/assets/manifest.js";

test("God Mode submenus map to existing domain catalog IDs, with replaceable semantic visuals",()=>{
 assert.deepEqual(godMenuOptions("npc").map(o=>o.id),["settler","leader"]);
 assert.deepEqual(godMenuOptions("stone").map(o=>o.id),["stone","iron_ore","copper_ore"]);
 assert.deepEqual(godMenuOptions("food").map(o=>o.id),["apple_adult","apple_seedling"]);
 assert.deepEqual(godMenuOptions("scenery").map(o=>o.id),["boulder","wall","statue"]);
 assert.deepEqual(godMenuOptions("farm",{farmingSpecies:NATURAL_SOURCES}).map(o=>o.id),
  Object.keys(NATURAL_SOURCES));
 assert.deepEqual(godMenuOptions("house",{blueprints:BUILDING_BLUEPRINTS}).map(o=>o.id),
  Object.keys(BUILDING_BLUEPRINTS));
 assert.deepEqual(BUILD_MODES.map(x=>x.id),["site","completed"]);
 assert.deepEqual(HAS_GOD_SUBMENU,["npc","stone","food","farm","scenery","house"]);
 for(const tool of HAS_GOD_SUBMENU)
  for(const option of godMenuOptions(tool,{blueprints:BUILDING_BLUEPRINTS,farmingSpecies:NATURAL_SOURCES})){
   assert.ok(UI_VISUAL_MANIFEST.visuals[option.icon],"Missing sprite/icon registration: "+option.icon);
   assert.equal(uiAssets.resolve(option.icon).id,option.icon);
  }
 for(const mode of BUILD_MODES)assert.equal(uiAssets.resolve(mode.icon).id,mode.icon);
 assert.equal(godMenuOptions("inspect").length,0);
 assert.equal(godMenuOptions("wood").length,0);
 const unknown=godMenuOptions("house",{blueprints:{"building.future":{
  label:"Novo projeto",footprint:{width:1,height:1}
 }}});
 assert.equal(unknown[0].icon,"action.build","New content reuses generic visual until art is created");
});

class Element {
 constructor(tag="div"){
  this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};
  this.listeners={};this.classes=new Set();this.className="";this.hidden=false;
  this.disabled=false;this.value="1";this.textContent="";this.title="";
  this.style={setProperty(){}};
  this.classList={toggle:(id,force)=>{
   const on=force??!this.classes.has(id);on?this.classes.add(id):this.classes.delete(id);
   return on;
  },contains:id=>this.classes.has(id)};
 }
 append(...items){this.children.push(...items);return items.length;}
 replaceChildren(...items){this.children=[...items];}
 setAttribute(key,value){this.attributes[key]=String(value);}
 addEventListener(type,handler){this.listeners[type]=handler;}
 querySelector(selector){
  let child=this.children.find(node=>node.className===selector.slice(1));
  if(!child&&selector.startsWith(".")){
   child=new Element("span");child.className=selector.slice(1);this.append(child);
  }
  return child??null;
 }
 querySelectorAll(selector){
  if(selector==="[data-tool]")return this.children.filter(x=>x.dataset.tool);
  return [];
 }
 click(){this.listeners.click?.();}
}
function makeHud(role="admin"){
 const ids=["dock","speed0","speed1","speed2","speed4","brushSize","brushMinus","brushPlus",
  "brushPanel","brushValue","brushCount","brushName","toolBadge","godSubmenu",
  "godSubmenuChoices","godSubmenuLabel","godBuildModes","godBuildModeChoices",
  "worldName","day","clockTime","population","woodCount","foodCount","stoneCount","worldTick"];
 const elements=Object.fromEntries(ids.map(id=>[id,new Element(id)]));
 elements.brushSize.value="1";
 const original=globalThis.document;
 globalThis.document={createElement:tag=>new Element(tag),getElementById:id=>elements[id]??null};
 const presets=[],phases=[],tools=[],sizes=[];
 let hud;
 hud=createHud({role,
  onTool:id=>{tools.push(id);hud.tool(id);},
  onClock:()=>{},onSize:n=>{sizes.push(n);hud.size(n);},
  onPreset:id=>presets.push(id),
  onBuildMode:id=>phases.push(id)
 });
 return {hud,elements,presets,phases,tools,sizes,
  cleanup(){globalThis.document=original;}};
}

test("clickable squares preserve active state, phase selection and blueprint size without dropdown",()=>{
 const {hud,elements,presets,phases,cleanup}=makeHud();
 try{
  hud.tool("stone");
  assert.equal(elements.godSubmenu.hidden,false);
  assert.equal(elements.brushPanel.hidden,false);
  assert.deepEqual(elements.godSubmenuChoices.children.map(b=>b.dataset.preset),
   ["stone","iron_ore","copper_ore"]);
  assert.equal(presets.at(-1),"stone");
  elements.godSubmenuChoices.children[1].click();
  assert.equal(presets.at(-1),"iron_ore");
  assert.equal(elements.godSubmenuChoices.children[1].attributes["aria-pressed"],"true");
  assert.equal(elements.godSubmenuChoices.children[0].attributes["aria-pressed"],"false");
  hud.tool("npc");
  assert.equal(presets.at(-1),"settler");
  hud.tool("stone");
  assert.equal(presets.at(-1),"iron_ore","reselecting a tool restores the last option");

  hud.setBlueprints(BUILDING_BLUEPRINTS);
  hud.tool("house");
  assert.equal(presets.at(-1),"building.community_house");
  assert.equal(phases.at(-1),"site");
  assert.equal(elements.godBuildModes.hidden,false);
  assert.equal(elements.godBuildModeChoices.children.length,2);
  const cemetery=elements.godSubmenuChoices.children.find(x=>x.dataset.preset==="building.cemetery");
  cemetery.click();
  assert.equal(elements.brushValue.textContent,"3 × 3");
  assert.equal(elements.brushCount.textContent,"9 células ocupadas");
  const workshop=elements.godSubmenuChoices.children.find(x=>x.dataset.preset==="building.workshop");
  workshop.click();
  assert.equal(elements.brushValue.textContent,"3 × 2");
  assert.equal(elements.brushCount.textContent,"6 células ocupadas");
  const final=elements.godBuildModeChoices.children.find(x=>x.dataset.buildMode==="completed");
  final.click();
  assert.equal(phases.at(-1),"completed");
  assert.equal(final.attributes["aria-pressed"],"true");
  assert.equal(elements.brushMinus.disabled,true);

  hud.tool("farm");
  hud.setFarmingSpecies(NATURAL_SOURCES);
  assert.equal(elements.godBuildModes.hidden,true);
  assert.equal(elements.brushSize.disabled,false);
  assert.equal(elements.godSubmenuChoices.children.length,Object.keys(NATURAL_SOURCES).length);
  hud.tool("house");
  assert.equal(phases.at(-1),"completed");
  assert.equal(presets.at(-1),"building.workshop");
  assert.equal(elements.brushValue.textContent,"3 × 2");
  hud.tool("inspect");
  assert.equal(elements.godSubmenu.hidden,true);
  assert.equal(elements.brushPanel.hidden,true);
  hud.tool("wood");
  assert.equal(elements.godSubmenu.hidden,true);
  assert.equal(elements.brushPanel.hidden,false);
 }finally{cleanup();}
});

test("submenu buttons remain disabled outside God Mode and no options are exposed for player",()=>{
 const {hud,elements,cleanup}=makeHud("player");
 try{
  assert.equal(elements.dock.children.find(x=>x.dataset.tool==="house").disabled,true);
  hud.tool("house");
  assert.equal(elements.godSubmenu.hidden,true);
  assert.equal(elements.brushPanel.hidden,true);
 }finally{cleanup();}
});
test("HTML and CSS provide square mobile-friendly submenus without changing engine or API",async()=>{
 const admin=await readFile(new URL("../apps/admin-web/index.html",import.meta.url),"utf8");
 const player=await readFile(new URL("../apps/player-web/index.html",import.meta.url),"utf8");
 const hud=await readFile(new URL("../packages/ui/src/hud.js",import.meta.url),"utf8");
 const css=await readFile(new URL("../apps/shared-ui/style.css",import.meta.url),"utf8");
 for(const html of [admin,player]){
  for(const id of ["godActionStack","godSubmenu","godSubmenuChoices","godBuildModeChoices"])
   assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.doesNotMatch(hud,/createElement\('select'\)|brushPreset|buildMode[^A-Za-z]*select/);
 assert.match(hud,/createUiVisual\(item.icon/);
 assert.match(css,/\.god-submenu-tile\{flex:0 0 74px/);
 assert.match(css,/\.god-submenu-tiles\{display:flex;.*overflow-x:auto/s);
 assert.match(css,/@media\(max-width:740px\)/);
});
