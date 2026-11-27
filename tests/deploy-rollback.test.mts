import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
const script=fileURLToPath(new URL("../infra/deploy-vnext.sh",import.meta.url));
const previous="b".repeat(40),next="a".repeat(40);
for(const failPublic of [false,true])test("deployment "+(failPublic?"rolls back on public failure":"commits only after public health"),()=>{
 const dir=mkdtempSync(join(tmpdir(),"oturo-deploy-test-"));
 try{
  const bin=join(dir,"bin"),app=join(dir,"app"),workspace=join(dir,"workspace"),current=join(dir,"current");
  mkdirSync(bin);mkdirSync(app);mkdirSync(workspace);mkdirSync(join(app,".deploy"));
  const executable=(name,body)=>writeFileSync(join(bin,name),"#!/usr/bin/env bash\nset -eu\n"+body+"\n",{mode:0o755});
  writeFileSync(join(app,".deploy/compose.yml"),"old compose\n");
  writeFileSync(join(app,".release.svr2.env"),"IMAGE_TAG=vnext-sha-"+previous+"\nSOURCE_SHA="+previous+"\n");
  writeFileSync(join(workspace,"compose.yml"),"new compose\n");writeFileSync(current,previous);
  executable("git",'printf "%s\\n" "$DEPLOY_SHA"');
  executable("sleep","exit 0");
  executable("docker",[
   'if [[ "$1" == login ]]; then cat >/dev/null; exit 0; fi',
   'if [[ "$1" == compose && " $* " == *" up "* ]]; then printf "%s" "$SOURCE_SHA" > "$MOCK_CURRENT"; fi',
   'exit 0'
  ].join("\n"));
  executable("curl",[
   'url=""; for arg in "$@"; do if [[ "$arg" == http* ]]; then url="$arg"; fi; done',
   'case "$url" in',
   ' *version.txt*) if [[ "$url" == https:* && "$MOCK_FAIL_PUBLIC" == 1 ]]; then printf "stale"; else cat "$MOCK_CURRENT"; fi;;',
   ' *healthz*) printf "{\\"status\\":\\"ok\\"}";;',
   ' */admin|*/browser) printf "ADMINISTRADOR";;',
   ' *assets-preview.html) printf "Oturo";;',
   ' */api/world) printf "{\\"persistent\\":true,\\"world\\":{}}";;',
   ' *) :;;',
   'esac'
  ].join("\n"));
  const run=spawnSync("bash",[script],{encoding:"utf8",timeout:15000,env:{...process.env,PATH:bin+":"+process.env.PATH,
   OTURO_APP_DIR:app,GITHUB_WORKSPACE:workspace,DEPLOY_SHA:next,DEPLOY_IMAGE_TAG:"vnext-sha-"+next,GHCR_USER:"mock",GHCR_TOKEN:"mock",
   MOCK_CURRENT:current,MOCK_FAIL_PUBLIC:failPublic?"1":"0"}});
  assert.equal(run.status,failPublic?1:0,run.stdout+"\n"+run.stderr);
  assert.equal(readFileSync(current,"utf8"),failPublic?previous:next);
  assert.match(readFileSync(join(app,".release.svr2.env"),"utf8"),new RegExp("SOURCE_SHA="+(failPublic?previous:next)));
  assert.equal(readFileSync(join(app,".deploy/compose.yml"),"utf8"),failPublic?"old compose\n":"new compose\n");
  if(failPublic)assert.match(run.stdout,/Rollback verified locally/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
