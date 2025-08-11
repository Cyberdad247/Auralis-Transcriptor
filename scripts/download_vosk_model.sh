# Downloads a small English Vosk model into ./models/vosk
# Usage: bash scripts/download_vosk_model.sh
set -euo pipefail

MODEL_DIR="$(dirname "$0")/../models/vosk"
mkdir -p "$MODEL_DIR"

# Small English model (~50MB). Adjust if needed.
URL="https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
ZIP="$MODEL_DIR/model.zip"

if command -v curl >/dev/null 2>&1; then
  curl -L "$URL" -o "$ZIP"
elif command -v wget >/dev/null 2>&1; then
  wget -O "$ZIP" "$URL"
else
  echo "Error: curl or wget required to download model" >&2
  exit 1
fi

# Unzip
if command -v unzip >/dev/null 2>&1; then
  unzip -o "$ZIP" -d "$MODEL_DIR"
else
  echo "Error: unzip is required to extract the model" >&2
  exit 1
fi

# Move/normalize to models/vosk
SUBDIR=$(find "$MODEL_DIR" -maxdepth 1 -type d -name "vosk-model-*" | head -n 1)
if [ -n "$SUBDIR" ]; then
  rm -rf "$MODEL_DIR/current"
  mv "$SUBDIR" "$MODEL_DIR/current"
  echo "Vosk model installed at $MODEL_DIR/current"
else
  echo "Error: extracted model directory not found" >&2
  exit 1
fi

# Clean zip
rm -f "$ZIP"

