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
docker_config="$(mktemp -d)"
chmod 700 "$docker_config"
export DOCKER_CONFIG="$docker_config"
cleanup(){ rm -rf "$docker_config"; }
trap cleanup EXIT
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null
export IMAGE_TAG="$DEPLOY_IMAGE_TAG" SOURCE_SHA="$DEPLOY_SHA"
docker pull "ghcr.io/uillaneduardo/vila-viva:$IMAGE_TAG"
staged="$(mktemp "$compose_file.tmp.XXXXXX")"
cp "$GITHUB_WORKSPACE/compose.yml" "$staged"
chmod 600 "$staged"
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
   curl -fsS --max-time 3 http://127.0.0.1:8481/admin | grep -q 'ADMINISTRADOR' && \
   curl -fsS --max-time 3 http://127.0.0.1:8481/apps/player-web/assets-preview.html | grep -q 'Oturo' && \
   curl -fsS --max-time 3 http://127.0.0.1:8481/assets/world/vegetation/apple_tree_atlas_96.png -o /dev/null && \
   curl -fsS --max-time 3 http://127.0.0.1:8481/api/world | grep -q '"world"'; then
   healthy=1;break
  fi
 fi
 sleep 3
done
if [[ "$healthy" != 1 ]]; then
 echo "::error::vNext deploy failed local smoke; attempting rollback"
 if [[ "$had_previous" == 1 ]]; then
  cp "$backup" "$compose_file"
  export IMAGE_TAG="$previous_tag" SOURCE_SHA="${previous_sha:-unknown}"
  if [[ -n "$previous_tag" ]]; then "${compose[@]}" up -d --no-deps web || true; fi
 fi
 "${compose[@]}" ps || true
 fail "Failed to serve vNext revision $DEPLOY_SHA; previous compose restored when available"
fi
umask 077
release_tmp="$(mktemp "$app_dir/.release.svr2.env.tmp.XXXXXX")"
printf 'IMAGE_TAG=%s\nSOURCE_SHA=%s\n' "$DEPLOY_IMAGE_TAG" "$DEPLOY_SHA" > "$release_tmp"
mv -f "$release_tmp" "$app_dir/.release.svr2.env"
# Preserve latest backup for manual recovery, without altering legacy volumes.
mv -f "$backup" "$app_dir/.deploy/compose.previous.yml"
echo "Oturo vNext deployed: $DEPLOY_SHA on http://127.0.0.1:8481"
