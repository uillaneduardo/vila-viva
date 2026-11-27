import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
test("CI checks whole HTTP response before grep so curl cannot fail with SIGPIPE 23",async()=>{
 const workflow=await readFile(new URL("../.github/workflows/vnext-ci.yml",import.meta.url),"utf8");
 assert.doesNotMatch(workflow,/curl[^\n]*\|\s*grep\s+-q\b/);
 const deployment=await readFile(new URL("../infra/deploy-vnext.sh",import.meta.url),"utf8");
 assert.doesNotMatch(deployment,/curl[^\n]*\|\s*grep\s+-q\b/);
 assert.match(deployment,/curl -fsS --max-time 12 "https:\/\/vila-viva-svr2\.ulln\.com\.br\/admin" \| grep -F ADMINISTRADOR >\/dev\/null/);
 assert.match(workflow,/curl -fsS http:\/\/127\.0\.0\.1:18586\/admin \| grep -F ADMINISTRADOR >\/dev\/null/);
});
