#!/usr/bin/env bash
set -euo pipefail

PROFILES_DIR="$HOME/Library/MobileDevice/Provisioning Profiles"
mkdir -p "$PROFILES_DIR"

PROFILE_UUID="405c532c-d31d-4936-a0e6-44ff2f305f19"

if [ -n "${IOS_SHARE_EXT_PROFILE:-}" ]; then
  echo "$IOS_SHARE_EXT_PROFILE" | base64 --decode > "$PROFILES_DIR/$PROFILE_UUID.mobileprovision"
  echo "[hook] Installed ShareExtension profile from env var: $PROFILE_UUID"
else
  echo "[hook] WARNING: IOS_SHARE_EXT_PROFILE env var not set"
fi
