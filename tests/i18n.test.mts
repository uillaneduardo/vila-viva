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
