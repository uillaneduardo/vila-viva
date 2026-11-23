#!/usr/bin/env bash
# Shared action entrypoint. Invoked only on a trusted, dedicated self-hosted runner.
set -Eeuo pipefail

fail() { echo "::error::$*" >&2; exit 1; }
required=(GITHUB_WORKSPACE DEPLOY_APP_DIR DEPLOY_COMPOSE_SOURCE DEPLOY_COMPOSE_TARGET DEPLOY_VALIDATED_SHA IMAGE_TAG GHCR_USER GHCR_TOKEN DEPLOY_HEALTH_URL DEPLOY_RELEASE_FILE)
for key in "${required[@]}"; do
  [[ -n "${!key:-}" ]] || fail "Missing required setting: $key"
done
[[ "$DEPLOY_APP_DIR" == /* ]] || fail "app-dir must be an absolute path"

safe_relative() {
  case "$1" in
    ''|/*|..|../*|*/../*|*/..) fail "Unsafe relative path: $1" ;;
  esac
}
safe_relative "$DEPLOY_COMPOSE_SOURCE"
safe_relative "$DEPLOY_COMPOSE_TARGET"
safe_relative "$DEPLOY_RELEASE_FILE"
if [[ -n "${DEPLOY_ENV_FILE:-}" ]]; then safe_relative "$DEPLOY_ENV_FILE"; fi

[[ "$DEPLOY_VALIDATED_SHA" =~ ^[0-9a-f]{40}$ ]] || fail "validated-sha must be a full 40-character commit SHA"
checkout_sha="$(git -C "$GITHUB_WORKSPACE" rev-parse HEAD)"
[[ "$checkout_sha" == "$DEPLOY_VALIDATED_SHA" ]] || fail "Checkout SHA does not match tested commit"

source_compose="$GITHUB_WORKSPACE/$DEPLOY_COMPOSE_SOURCE"
target_compose="$DEPLOY_APP_DIR/$DEPLOY_COMPOSE_TARGET"
[[ -f "$source_compose" ]] || fail "Compose missing in validated checkout"
[[ -d "$DEPLOY_APP_DIR" ]] || fail "Target app-dir does not exist"

mkdir -p "$(dirname "$target_compose")"
staged="$(mktemp "$target_compose.tmp.XXXXXX")"
docker_config=""
cleanup() {
  rm -f "$staged"
  if [[ -n "$docker_config" ]]; then rm -rf -- "$docker_config"; fi
}
trap cleanup EXIT
cp "$source_compose" "$staged"
chmod 600 "$staged"
mv -f "$staged" "$target_compose"

compose=(docker compose)
if [[ -n "${DEPLOY_ENV_FILE:-}" ]]; then
  env_path="$DEPLOY_APP_DIR/$DEPLOY_ENV_FILE"
  [[ -f "$env_path" ]] || fail "Required host env-file is missing"
  compose+=(--env-file "$env_path")
fi
compose+=(-f "$target_compose")

cd "$DEPLOY_APP_DIR"
# Docker stores a short-lived config.json; the EXIT trap removes it.
docker_config="$(mktemp -d)"
chmod 700 "$docker_config"
export DOCKER_CONFIG="$docker_config"
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null
"${compose[@]}" config --quiet

services=()
if [[ -n "${DEPLOY_SERVICES:-}" ]]; then read -r -a services <<< "$DEPLOY_SERVICES"; fi
for service in "${services[@]}" "${DEPLOY_BOOTSTRAP_SERVICE:-}" "${DEPLOY_MIGRATE_SERVICE:-}" "${DEPLOY_SEED_SERVICE:-}"; do
  if [[ -n "$service" && ! "$service" =~ ^[a-zA-Z0-9_.-]+$ ]]; then fail "Invalid Compose service"; fi
done
"${compose[@]}" pull "${services[@]}"
if [[ -n "${DEPLOY_BOOTSTRAP_SERVICE:-}" ]]; then
  "${compose[@]}" up -d "$DEPLOY_BOOTSTRAP_SERVICE"
fi
if [[ -n "${DEPLOY_MIGRATE_SERVICE:-}" ]]; then
  "${compose[@]}" --profile "${DEPLOY_MAINTENANCE_PROFILE:-maintenance}" run --rm "$DEPLOY_MIGRATE_SERVICE"
fi
if [[ -n "${DEPLOY_SEED_SERVICE:-}" ]]; then
  "${compose[@]}" --profile "${DEPLOY_MAINTENANCE_PROFILE:-maintenance}" run --rm "$DEPLOY_SEED_SERVICE"
fi
"${compose[@]}" up -d --no-build "${services[@]}"

retries="${DEPLOY_HEALTH_RETRIES:-20}"
[[ "$retries" =~ ^[0-9]+$ && "$retries" -ge 1 && "$retries" -le 120 ]] || fail "health-retries must be between 1 and 120"
for ((attempt=1; attempt<=retries; attempt++)); do
  if curl -fsS --max-time 3 "$DEPLOY_HEALTH_URL" >/dev/null; then
    runtime_base="${DEPLOY_HEALTH_URL%/healthz}"
    actual_sha="$(curl -fsS --max-time 4 -H 'Cache-Control: no-cache' "$runtime_base/version.txt" | tr -d '\\r\\n')" || fail "Runtime release marker not reachable"
    [[ "$actual_sha" == "$DEPLOY_VALIDATED_SHA" ]] || fail "Running container is stale: expected $DEPLOY_VALIDATED_SHA but received $actual_sha"
    curl -fsS --max-time 4 "$runtime_base/lab.js" | grep -q 'window.VilaLab' || fail "Running container does not serve lab.js"
    curl -fsS --max-time 4 "$runtime_base/app.js" | grep -q 'function setup' || fail "Running container does not serve app.js"
    umask 077
    marker="$DEPLOY_APP_DIR/$DEPLOY_RELEASE_FILE"
    mkdir -p "$(dirname "$marker")"
    marker_tmp="$(mktemp "$marker.tmp.XXXXXX")"
    printf 'IMAGE_TAG=%s\nSOURCE_SHA=%s\n' "$IMAGE_TAG" "$checkout_sha" > "$marker_tmp"
    mv -f "$marker_tmp" "$marker"
    echo "Validated deploy succeeded: $IMAGE_TAG ($checkout_sha)"
    exit 0
  fi
  sleep 3
done

"${compose[@]}" ps || true
fail "Post-deploy health URL did not pass; version marker not advanced"
