#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if ! command -v supabase >/dev/null 2>&1; then
    echo "Install the Supabase CLI, run supabase login, then retry this script." >&2
    exit 1
fi
# Deploy only the AI function; no database or auth configuration is changed.
supabase functions deploy generate-recipes --project-ref beyztutorxvopftaiflk
