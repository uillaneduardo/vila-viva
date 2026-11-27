#!/usr/bin/env bash
set -euo pipefail
if [[ -z "${TELEGRAM_BOT_TOKEN:-}" || -z "${TELEGRAM_CHAT_ID:-}" ]]; then
 echo "::notice::Telegram not configured (TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)."
 exit 0
fi
# Never echo the credential or response. Notification failure must not invalidate a release.
if ! curl -fsS --max-time 15 --retry 1 -o /dev/null \
 --data-urlencode "chat_id=$TELEGRAM_CHAT_ID" --data-urlencode "text=${MESSAGE:-Oturo CI/CD}" \
 "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" 2>/dev/null; then
 echo "::warning::Telegram notification failed."
fi
