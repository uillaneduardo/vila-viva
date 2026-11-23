import assert from "node:assert/strict";
import test from "node:test";
import {createTranslator,UI_MESSAGES,t} from "../packages/i18n/src/index.js";

test("pt-BR UI translations include actions, UI errors and workflow messages",()=>{
 assert.equal(t("navigation.player"),"Jogador");
 assert.equal(t("error.BLOCKED"),"Não está adjacente ou falta energia");
 assert.equal(t("feedback.commandApplied",{tick:7}),"Comando aplicado no tick 7");
 assert.equal(createTranslator("en-US")("navigation.admin"),"Admin");
});
test("missing UI translation or interpolation is an explicit failure",()=>{
 assert.throws(()=>t("nonexistent.key"));
 assert.throws(()=>t("feedback.commandApplied"));
 assert.ok(Object.values(UI_MESSAGES["pt-BR"]).every(v=>typeof v==="string"&&v.trim()));
});
test("every data-i18n key referenced in UI has a translation",async()=>{
 const {readFile}=await import("node:fs/promises");
 for(const file of ["apps/player-web/index.html","apps/admin-web/index.html"]){
  const source=await readFile(new URL("../"+file,import.meta.url),"utf8");
  for(const [,key] of source.matchAll(/data-i18n(?:-aria|-placeholder|-value)?="([^"]+)"/g))assert.equal(typeof UI_MESSAGES["pt-BR"][key],"string",file+": "+key);
 }
});

test("approved UI preserves functional brush controls without localization mutating children",async()=>{
 const {readFile}=await import("node:fs/promises");
 const html=await readFile(new URL("../apps/admin-web/index.html",import.meta.url),"utf8");
 assert.doesNotMatch(html,/<label\s+data-i18n=/);
 for(const id of ["brushSize","brushMinus","brushPlus","brushValue","brushPanel","dock","panelNav"]){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 // UI messages remain in the i18n catalog; entity titles are localized by /api/catalog.
 assert.equal(typeof UI_MESSAGES["pt-BR"]["resource.wood"],"string");
});
