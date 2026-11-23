import test from "node:test";
import assert from "node:assert/strict";
import {createTranslator,t} from "../packages/i18n/src/index.js";
test("pt-BR UI keys and future-language fallback",()=>{
 assert.equal(t("navigation.player"),"Jogador");
 assert.equal(t("feedback.commandApplied",{tick:3}),"Comando aplicado no tick 3");
 assert.equal(createTranslator("en-US")("navigation.player"),"Jogador");
 assert.throws(()=>t("nonexistent.key"));
});
