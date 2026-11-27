#!/usr/bin/env bash
# Oturo vNext deployment on the dedicated homelab2 runner.
# No host git pull, SSH private key or permanent GHCR credentials needed.
set -Eeuo pipefail
fail(){ echo "::error::$*" >&2; exit 1; }
: "${DEPLOY_SHA:?}"
: "${DEPLOY_IMAGE_TAG:?}"
: "${GHCR_USER:?}"
: "${GHCR_TOKEN:?}"
[[ "$DEPLOY_SHA" =~ ^[0-9a-f]{40}$ ]] || fail "Invalid release SHA"
[[ "$DEPLOY_IMAGE_TAG" == "vnext-sha-$DEPLOY_SHA" ]] || fail "Tag/commit mismatch"
[[ "$(git -C "$GITHUB_WORKSPACE" rev-parse HEAD)" == "$DEPLOY_SHA" ]] || fail "Checkout differs from validated commit"
app_dir="/home/uillan/homelab2/apps/vila-viva"
[[ -d "$app_dir" ]] || fail "Host application directory missing: $app_dir"
compose_file="$app_dir/.deploy/compose.yml"
mkdir -p "$app_dir/.deploy"
backup="$(mktemp "$app_dir/.deploy/compose.backup.XXXXXX")"
had_previous=0
if [[ -f "$compose_file" ]]; then cp "$compose_file" "$backup"; had_previous=1; fi
previous_tag=""
previous_sha=""
if [[ -f "$app_dir/.release.svr2.env" ]]; then
 previous_tag="$(sed -n 's/^IMAGE_TAG=//p' "$app_dir/.release.svr2.env" | head -n1)"
 previous_sha="$(sed -n 's/^SOURCE_SHA=//p' "$app_dir/.release.svr2.env" | head -n1)"
fi
# One-time vNext in-memory -> persisted-state migration. This does NOT touch .old worlds.
# Capture before replacing the prior container, even if the import fails later.
migration_snapshot=""
mkdir -p "$app_dir/.deploy/world-backups"
old_world="$(mktemp "$app_dir/.deploy/world-backups/current-world.XXXXXX")"
if curl -fsS --max-time 8 http://127.0.0.1:8481/api/world >"$old_world" 2>/dev/null; then
 migration_snapshot="$app_dir/.deploy/world-backups/pre-persistence-$DEPLOY_SHA.json"
 if ! python3 - "$old_world" "$migration_snapshot" <<'PY'
import json,sys,uuid,datetime,os
with open(sys.argv[1],encoding="utf-8") as file:
    before=json.load(file)
if before.get("persistent") is not False or not isinstance(before.get("world"),dict):
    sys.exit(2)
world=before["world"]
if not world.get("id") or not isinstance(world.get("entities"),list):
    sys.exit(3)
snapshot={"formatVersion":1,"savedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),
          "timelineId":str(uuid.uuid4()),"lastSequence":0,"clock":{"speed":0},"world":world}
if isinstance(world.get("seed"),str):
    snapshot["seed"]=world["seed"]
with open(sys.argv[2],"w",encoding="utf-8") as file:
    json.dump(snapshot,file,ensure_ascii=False)
os.chmod(sys.argv[2],0o600)
PY
 then
  migration_snapshot=""
  rm -f "$app_dir/.deploy/world-backups/pre-persistence-$DEPLOY_SHA.json"
 fi
fi
rm -f "$old_world"
if [[ -n "$migration_snapshot" ]]; then
 echo "Previous in-memory vNext world preserved: $migration_snapshot"
fi
docker_config="$(mktemp -d)"
chmod 700 "$docker_config"
export DOCKER_CONFIG="$docker_config"
cleanup(){ rm -rf "$docker_config"; }
rollback_armed=0
rollback_on_exit(){
 local rc=$?
 trap - EXIT
 if [[ "$rc" != 0 && "$rollback_armed" == 1 ]]; then
  echo '::error::Deployment failed after staging; attempting rollback.' >&2
  if [[ "$had_previous" == 1 && -n "$previous_tag" ]]; then
   cp "$backup" "$compose_file"
   export IMAGE_TAG="$previous_tag" SOURCE_SHA="${previous_sha:-unknown}"
   if docker compose -f "$compose_file" up -d --no-deps --no-build web; then
    local restored=0
    for attempt in {1..20}; do
     if [[ "$(curl -fsS --max-time 3 http://127.0.0.1:8481/version.txt 2>/dev/null | tr -d '\r\n' || true)" == "$previous_sha" ]] && curl -fsS --max-time 3 http://127.0.0.1:8481/healthz >/dev/null 2>&1; then restored=1; break; fi
     sleep 3
    done
    if [[ "$restored" == 1 ]]; then echo 'Rollback verified locally.'; else echo '::error::Rollback revision could not be verified.'; fi
   else echo '::error::Rollback compose failed.'; fi
  else echo '::error::No previous release available for rollback.'; fi
 fi
 cleanup
 exit "$rc"
}
trap rollback_on_exit EXIT
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null
export IMAGE_TAG="$DEPLOY_IMAGE_TAG" SOURCE_SHA="$DEPLOY_SHA"
docker pull "ghcr.io/uillaneduardo/vila-viva:$IMAGE_TAG"
staged="$(mktemp "$compose_file.tmp.XXXXXX")"
cp "$GITHUB_WORKSPACE/compose.yml" "$staged"
chmod 600 "$staged"
rollback_armed=1
mv -f "$staged" "$compose_file"
cd "$app_dir"
compose=(docker compose -f "$compose_file")
"${compose[@]}" config --quiet || fail "Invalid compose"
# Preserve the legacy api container and its persistent simulation-data volume.
# Deliberately do not use --remove-orphans, --volumes or docker compose down.
"${compose[@]}" up -d --no-deps --no-build web
healthy=0
for attempt in {1..30}; do
 if curl -fsS --max-time 3 http://127.0.0.1:8481/healthz >/dev/null 2>&1; then
  actual="$(curl -fsS --max-time 3 http://127.0.0.1:8481/version.txt | tr -d '\r\n')" || actual=""
  if [[ "$actual" == "$DEPLOY_SHA" ]] && \
   curl -fsS --max-time 3 http://127.0.0.1:8481/admin | grep -F ADMINISTRADOR >/dev/null && \
   curl -fsS --max-time 3 http://127.0.0.1:8481/apps/player-web/assets-preview.html | grep -F Oturo >/dev/null && \
   curl -fsS --max-time 3 http://127.0.0.1:8481/assets/world/vegetation/apple_tree_atlas_96.png -o /dev/null && \
   curl -fsS --max-time 3 http://127.0.0.1:8481/api/world | grep -F '"world"' >/dev/null; then
   healthy=1;break
  fi
 fi
 sleep 3
done
if [[ "$healthy" != 1 ]]; then
 fail "Failed to serve vNext revision $DEPLOY_SHA locally"
fi
# Import the captured old vNext world into the new persistent volume once.
# Once the API reports persistent:true, future deploys skip this migration entirely.
if [[ -n "$migration_snapshot" ]]; then
 echo "Importing prior vNext simulation into durable storage (paused)..."
 import_response="$(mktemp "$app_dir/.deploy/world-backups/import-response.XXXXXX")"
 if ! python3 - "$migration_snapshot" <<'PY' | curl -fsS --max-time 30 \
  -H 'Content-Type: application/json' -X POST --data-binary @- \
  http://127.0.0.1:8481/api/world/import -o "$import_response"; then
import json,sys
with open(sys.argv[1],encoding="utf-8") as file:
    snapshot=json.load(file)
print(json.dumps({"role":"admin","snapshot":snapshot},ensure_ascii=False))
PY
  cat "$import_response" || true
  rm -f "$import_response"
  fail "Prior world captured at $migration_snapshot but import failed; refusing to mark deploy completed"
 fi
 if ! python3 - "$migration_snapshot" "$import_response" <<'PY'; then
import json,sys
with open(sys.argv[1],encoding="utf-8") as file: original=json.load(file)
with open(sys.argv[2],encoding="utf-8") as file: result=json.load(file)
assert result.get("ok") is True and result.get("paused") is True
assert result.get("tick")==original["world"]["tick"]
PY
  rm -f "$import_response"
  fail "Migration did not confirm identical tick and paused state; backup: $migration_snapshot"
 fi
 rm -f "$import_response"
 echo "Prior world migrated successfully; source backup retained."
fi
# Verify the Tunnel before committing the release metadata. Any failure invokes the EXIT rollback.
public_ok=0
for attempt in $(seq 1 8); do
 actual="$(curl -fsS --max-time 12 -H 'Cache-Control: no-cache' "https://vila-viva-svr2.ulln.com.br/version.txt?sha=${DEPLOY_SHA}" 2>/dev/null | tr -d '\r\n' || true)"
 if [[ "$actual" == "$DEPLOY_SHA" ]] && \
  curl -fsS --max-time 12 "https://vila-viva-svr2.ulln.com.br/admin" | grep -F ADMINISTRADOR >/dev/null && \
  curl -fsS --max-time 12 "https://vila-viva-svr2.ulln.com.br/browser" | grep -F ADMINISTRADOR >/dev/null && \
  curl -fsS --max-time 12 "https://vila-viva-svr2.ulln.com.br/assets/world/vegetation/apple_tree_atlas_96.png" -o /dev/null; then public_ok=1; break; fi
 sleep 5
done
[[ "$public_ok" == 1 ]] || fail "Public Tunnel did not serve validated release"
umask 077
release_tmp="$(mktemp "$app_dir/.release.svr2.env.tmp.XXXXXX")"
printf 'IMAGE_TAG=%s\nSOURCE_SHA=%s\n' "$DEPLOY_IMAGE_TAG" "$DEPLOY_SHA" > "$release_tmp"
mv -f "$release_tmp" "$app_dir/.release.svr2.env"
rollback_armed=0
# Preserve latest backup for manual recovery, without altering legacy volumes.
mv -f "$backup" "$app_dir/.deploy/compose.previous.yml"
echo "Oturo vNext deployed: $DEPLOY_SHA on http://127.0.0.1:8481"
