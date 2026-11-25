#!/usr/bin/env bash
# Memasang semua alat kerja karyawan AI (Social: carousel & Reels, Themes: Theme Atelier) di Mac lokal atau homelab Linux.
# Aman diulang: langkah yang sudah terpasang dilewati. Langkah yang butuh sudo hanya dicetak, tidak dijalankan.
# Pemakaian: bash tools/setup.sh            (dari folder Karyawan-Luxvite)
#   LUXENARY_DIR=/opt/luxenary-engine  folder mesin render Luxenary (bawaan: projectPath di config/company_profile.json)
#   LUXENARY_REPO=<url git>            dipakai untuk clone bila LUXENARY_DIR belum ada
set -euo pipefail

HQ_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="$HQ_DIR/tools"
OS="$(uname -s)"
ARCH="$(uname -m)"
NODE_VER="v22.23.4"
TODO=()
ok() { printf '  [OK]   %s\n' "$1"; }
act() { printf '  [....] %s\n' "$1"; }
need() { printf '  [PERLU] %s\n' "$1"; TODO+=("$1"); }

echo "== Alat karyawan AI Luxvite — $OS/$ARCH =="

# 1. Python + Pillow (render slide carousel & lembar kontak tema)
if python3 -c "import PIL" 2>/dev/null; then ok "Python Pillow"; else
  act "pip install Pillow"; python3 -m pip install --user --quiet Pillow || need "pip install Pillow gagal; pasang python3-pip lalu ulangi"
fi

# 2. Node.js 22 (perekam Reels, pemotret tema, mesin render Luxenary)
NODE_BIN="$(command -v node || true)"
for cand in "$HOME/.local/node/bin/node" /opt/homebrew/bin/node /usr/local/bin/node; do
  [ -z "$NODE_BIN" ] && [ -x "$cand" ] && NODE_BIN="$cand"
done
if [ -n "$NODE_BIN" ] && "$NODE_BIN" -e 'process.exit(+process.versions.node.split(".")[0] >= 20 ? 0 : 1)'; then
  ok "Node $("$NODE_BIN" -v) ($NODE_BIN)"
else
  case "$OS-$ARCH" in
    Linux-x86_64) PLAT="linux-x64" ;; Linux-aarch64|Linux-arm64) PLAT="linux-arm64" ;;
    Darwin-arm64) PLAT="darwin-arm64" ;; Darwin-x86_64) PLAT="darwin-x64" ;; *) PLAT="" ;;
  esac
  if [ -z "$PLAT" ]; then need "Node.js 22 untuk $OS/$ARCH harus dipasang manual"; else
    act "Unduh Node $NODE_VER ($PLAT) ke ~/.local/node"
    mkdir -p "$HOME/.local"
    curl -fsSL "https://nodejs.org/dist/$NODE_VER/node-$NODE_VER-$PLAT.tar.gz" | tar -xz -C "$HOME/.local"
    ln -sfn "$HOME/.local/node-$NODE_VER-$PLAT" "$HOME/.local/node"
    NODE_BIN="$HOME/.local/node/bin/node"
    ok "Node $("$NODE_BIN" -v) terpasang"
  fi
fi
export PATH="$(dirname "${NODE_BIN:-/usr/bin/node}"):$PATH"

# 3. Pabrik Reels + pemotret tema (puppeteer-core, ffmpeg-static)
if [ -d "$TOOLS/reel-factory/node_modules/puppeteer-core" ] && [ -x "$TOOLS/reel-factory/node_modules/ffmpeg-static/ffmpeg" ]; then
  ok "reel-factory (puppeteer-core, ffmpeg)"
else
  act "npm ci di tools/reel-factory"; (cd "$TOOLS/reel-factory" && npm ci --no-audit --no-fund)
fi

# 4. Browser headless untuk memotret/merekam tema
CHROME=""
for c in "${CHROME_PATH:-}" "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
         /usr/bin/chromium /usr/bin/chromium-browser /usr/bin/google-chrome; do
  [ -n "$c" ] && [ -x "$c" ] && { CHROME="$c"; break; }
done
[ -z "$CHROME" ] && CHROME="$(find "$TOOLS/.browsers" -type f -name chrome-headless-shell 2>/dev/null | head -1 || true)"
if [ -n "$CHROME" ]; then ok "Browser: $CHROME"; else
  act "Pasang chrome-headless-shell ke tools/.browsers"
  (cd "$TOOLS/reel-factory" && npx --yes @puppeteer/browsers@2.10.5 install chrome-headless-shell@stable --path "$TOOLS/.browsers")
  if [ "$OS" = "Linux" ]; then
    need "Pustaka sistem Chrome (sekali, butuh sudo): sudo apt-get install -y libnss3 libatk-bridge2.0-0 libgbm1 libxkbcommon0 libasound2 fonts-liberation"
  fi
fi

# 5. Sandbox OS untuk ruang kerja Theme Atelier (agen penulis tema hanya boleh menulis di folder kerjanya)
if [ "$OS" = "Darwin" ]; then
  command -v sandbox-exec >/dev/null && ok "sandbox-exec (macOS)" || need "sandbox-exec tidak ditemukan"
else
  command -v bwrap >/dev/null && ok "bubblewrap (bwrap)" || need "Sandbox Atelier (butuh sudo): sudo apt-get install -y bubblewrap"
fi

# 6. Mesin render Luxenary (render master dengan data demo, audit kontrak token)
PROFILE="$HQ_DIR/config/company_profile.json"
LUX_DIR="${LUXENARY_DIR:-}"
if [ -z "$LUX_DIR" ] && [ -f "$PROFILE" ]; then
  LUX_DIR="$(python3 -c "import json,sys;print(json.load(open(sys.argv[1])).get('projectPath',''))" "$PROFILE")"
fi
if [ -z "$LUX_DIR" ]; then
  need "Set projectPath di config/company_profile.json (atau LUXENARY_DIR) ke folder repo Luxenary"
else
  if [ ! -d "$LUX_DIR/.git" ]; then
    if [ -n "${LUXENARY_REPO:-}" ]; then
      act "git clone repo Luxenary ke $LUX_DIR"; git clone --depth 1 "$LUXENARY_REPO" "$LUX_DIR"
    else
      need "Repo Luxenary belum ada di $LUX_DIR; jalankan ulang dengan LUXENARY_REPO=<url git> (butuh akses baca repo)"
    fi
  fi
  if [ -d "$LUX_DIR/.git" ]; then
    if [ -x "$LUX_DIR/node_modules/.bin/tsx" ]; then ok "Mesin render Luxenary ($LUX_DIR)"; else
      act "npm ci di repo Luxenary"; (cd "$LUX_DIR" && npm ci --no-audit --no-fund && npx prisma generate)
    fi
  fi
fi

# 7. Antigravity CLI (otak semua karyawan AI)
AGY="$(command -v agy || echo "$HOME/.local/bin/agy")"
if [ -x "$AGY" ]; then
  if "$AGY" models >/dev/null 2>&1; then ok "agy terpasang & login"; else need "agy perlu login: jalankan 'agy' sekali di terminal host lalu ikuti login"; fi
else
  need "Pasang Antigravity CLI (agy) di host ini lalu login"
fi

# 8. rclone + remote Google Drive 'gdrive' (arsip konten yang sudah diposting/dipakai/ditolak)
RCLONE_VER="v1.68.2"
RCLONE="$(command -v rclone || echo "$HOME/.local/bin/rclone")"
if [ ! -x "$RCLONE" ]; then
  case "$OS-$ARCH" in
    Linux-x86_64) RPLAT="linux-amd64" ;; Linux-aarch64|Linux-arm64) RPLAT="linux-arm64" ;;
    Darwin-arm64) RPLAT="osx-arm64" ;; Darwin-x86_64) RPLAT="osx-amd64" ;; *) RPLAT="" ;;
  esac
  if [ -z "$RPLAT" ]; then need "rclone untuk $OS/$ARCH harus dipasang manual"; else
    act "Unduh rclone $RCLONE_VER ($RPLAT) ke ~/.local/bin"
    TMPZ="$(mktemp -d)"
    curl -fsSL "https://downloads.rclone.org/$RCLONE_VER/rclone-$RCLONE_VER-$RPLAT.zip" -o "$TMPZ/rclone.zip"
    python3 -c "import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "$TMPZ/rclone.zip" "$TMPZ"
    mkdir -p "$HOME/.local/bin"; install -m 0755 "$TMPZ/rclone-$RCLONE_VER-$RPLAT/rclone" "$HOME/.local/bin/rclone"; rm -rf "$TMPZ"
    RCLONE="$HOME/.local/bin/rclone"
  fi
fi
if [ -x "$RCLONE" ]; then
  if "$RCLONE" listremotes 2>/dev/null | grep -qx "gdrive:"; then ok "rclone $("$RCLONE" version | head -1 | awk '{print $2}') + remote gdrive"; else
    need "Login Google Drive untuk arsip (sekali): $RCLONE config → n → nama: gdrive → storage: drive → scope: drive.file (lihat deploy/HOMELAB-GUIDE.md). Tanpa ini arsip tetap disimpan lokal."
  fi
fi

echo
if [ ${#TODO[@]} -eq 0 ]; then echo "SEMUA ALAT SIAP."; else
  echo "MASIH PERLU DIKERJAKAN MANUSIA (${#TODO[@]}):"; for t in "${TODO[@]}"; do echo " - $t"; done; exit 1
fi
