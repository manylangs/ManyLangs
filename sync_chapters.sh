#!/bin/bash

ROOT=content
SERIES=("voca" "idiom" "grammar" "conversation")

for series in "${SERIES[@]}"; do
  for lang in $ROOT/$series/*; do
    for level in $lang/*; do

      chapters=$(ls "$level" | sort | jq -R . | jq -s .)

      for chdir in $level/*; do
        manifest="$chdir/manifest.json"

        if [ -f "$manifest" ]; then
          tmp=$(mktemp)

          jq --argjson chapters "$chapters" \
            '.chapters=$chapters' \
            "$manifest" > "$tmp"

          mv "$tmp" "$manifest"

          echo "updated $manifest"
        fi

      done

    done
  done
done
