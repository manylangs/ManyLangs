#!/bin/bash

# ManyLangs content uploader (single process)
# uploads only missing files while preserving folder structure

BUCKET="gs://manylangs-55fd3.firebasestorage.app"
BASE_DIR="content"

echo "Starting upload..."
echo "Local base: $BASE_DIR"
echo "Bucket: $BUCKET"
echo ""

find "$BASE_DIR" -type f | while read file; do

  remote="$BUCKET/$file"

  if gsutil -q stat "$remote"; then
    echo "SKIP (exists): $file"
  else
    echo "UPLOAD: $file"
    gsutil cp "$file" "$remote"
  fi

done

echo ""
echo "Upload finished."