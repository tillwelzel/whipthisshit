#!/bin/bash
# whipthisshit installer
#   ./install.sh            install (safe to re-run)
#   ./install.sh uninstall  remove the command + hotkey (keeps this folder)
set -e
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="$HOME/.local/bin"
SERVICE_NAME="Whip This Shit"
SERVICE_DST="$HOME/Library/Services/$SERVICE_NAME.workflow"
PBS_KEY="(null) - $SERVICE_NAME - runWorkflowAsService"

uninstall() {
  "$BIN_DIR/whipthisshit" stop >/dev/null 2>&1 || true
  rm -f "$BIN_DIR/whipthisshit"
  if [ "$(uname)" = "Darwin" ]; then
    rm -rf "$SERVICE_DST"
    defaults delete pbs NSServicesStatus 2>/dev/null || true
    /System/Library/CoreServices/pbs -update 2>/dev/null || true
  fi
  echo "Removed whipthisshit command and ⌃⌥⌘1 hotkey. Delete this folder to finish."
}

if [ "${1:-}" = "uninstall" ]; then uninstall; exit 0; fi

command -v npm >/dev/null || { echo "npm not found. Install Node.js 18+ first: https://nodejs.org" >&2; exit 1; }

echo "▸ Installing dependencies (Electron)…"
cd "$APP_DIR"
npm install --no-fund --no-audit

# Some npm setups block Electron's postinstall, leaving no binary. Fix that.
ELECTRON_DIR="$APP_DIR/node_modules/electron"
if [ "$(uname)" = "Darwin" ]; then ELECTRON_BIN="$ELECTRON_DIR/dist/Electron.app/Contents/MacOS/Electron"; else ELECTRON_BIN="$ELECTRON_DIR/dist/electron"; fi
# Electron writes path.txt only after a complete extraction; a bare binary
# without it means a half-extracted app that crashes on launch.
electron_ok() { [ -x "$ELECTRON_BIN" ] && [ -f "$ELECTRON_DIR/path.txt" ]; }
if ! electron_ok; then
  echo "▸ Electron binary missing, downloading…"
  rm -rf "$ELECTRON_DIR/dist" "$ELECTRON_DIR/path.txt"
  node "$ELECTRON_DIR/install.js" || true
fi
if ! electron_ok && [ "$(uname)" = "Darwin" ]; then
  ZIP="$(ls "$HOME"/Library/Caches/electron/*/electron-v*-darwin-*.zip 2>/dev/null | head -1)"
  if [ -n "$ZIP" ]; then
    echo "▸ Extracting cached Electron zip…"
    rm -rf "$ELECTRON_DIR/dist" && mkdir -p "$ELECTRON_DIR/dist"
    ditto -x -k "$ZIP" "$ELECTRON_DIR/dist"
    printf 'Electron.app/Contents/MacOS/Electron' > "$ELECTRON_DIR/path.txt"
  fi
fi
electron_ok || { echo "Could not get an Electron binary. Try: rm -rf node_modules && ./install.sh" >&2; exit 1; }

echo "▸ Linking the whipthisshit command into $BIN_DIR"
mkdir -p "$BIN_DIR"
ln -sf "$APP_DIR/bin/whipthisshit" "$BIN_DIR/whipthisshit"
case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) echo "  NOTE: $BIN_DIR is not on your PATH. Add this to ~/.zshrc:  export PATH=\"\$HOME/.local/bin:\$PATH\"" ;;
esac

if [ "$(uname)" = "Darwin" ]; then
  echo "▸ Installing the ⌃⌥⌘1 hotkey (macOS Quick Action)"
  mkdir -p "$HOME/Library/Services"
  rm -rf "$SERVICE_DST"
  cp -R "$APP_DIR/macos/$SERVICE_NAME.workflow" "$SERVICE_DST"
  sed -i '' "s|__WHIPTHISSHIT_BIN__|$BIN_DIR/whipthisshit|" "$SERVICE_DST/Contents/document.wflow"
  # @ = Cmd, ~ = Option, ^ = Control
  defaults write pbs NSServicesStatus -dict-add "\"$PBS_KEY\"" \
    '{ enabled_context_menu = 1; enabled_services_menu = 1; key_equivalent = "@~^1"; }'
  /System/Library/CoreServices/pbs -flush 2>/dev/null || true
  /System/Library/CoreServices/pbs -update 2>/dev/null || true
fi

cat <<MSG

✅ whipthisshit installed.

   ⌃⌥⌘1   start with whip in hand / drop + quit   (macOS hotkey)
   ⌃⌥⌘2   spawn / drop the whip while running
   whipthisshit [start|toggle|stop|status]   from any terminal

If ⌃⌥⌘1 does nothing in an app, restart that app once (it caches its Services menu).
MSG
