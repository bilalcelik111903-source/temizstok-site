#!/bin/bash
# Hostinger sunucusunda cron tarafından çalıştırılır: yeni sürüm varsa repoyu indirip public_html'e kopyalar.
# Ortam değişkeni TS_CONTACT_TO (cron komutunda verilir) api/config.php alıcı adresini belirler.
set -e
BASE="$HOME/domains/temizstok.com"; DOC="$BASE/public_html"
mkdir -p "$DOC"; LOG="$DOC/deploy-log.txt"
[ -f "$LOG" ] && tail -n 200 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
exec > >(tee -a "$LOG") 2>&1
echo "--- $(date) ---"
ZIP_URL="https://codeload.github.com/bilalcelik111903-source/temizstok-site/zip/refs/heads/main"
VER_URL="https://raw.githubusercontent.com/bilalcelik111903-source/temizstok-site/main/VERSION"
cur=$(cat "$BASE/.deployed_version" 2>/dev/null || echo none)
new=$(curl -sfL "$VER_URL?t=$(date +%s)" | tr -d '[:space:]' || true)
[ -n "$new" ] || { echo "VERSION okunamadı"; exit 0; }
[ "$new" != "$cur" ] || { echo "güncel: $cur"; exit 0; }
tmp="$BASE/.deploy_tmp"; rm -rf "$tmp"; mkdir -p "$tmp"
curl -sfL "$ZIP_URL" -o "$tmp/site.zip"
unzip -oq "$tmp/site.zip" -d "$tmp"
src=$(find "$tmp" -mindepth 1 -maxdepth 1 -type d | head -1)
rm -f "$src/deploy.sh" "$src/README.md" "$DOC/default.php"
mkdir -p "$DOC"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete --exclude 'api/config.php' --exclude '.well-known' --exclude 'deploy-log.txt' --exclude 'cron-ran.txt' "$src"/ "$DOC"/
else
  cp -a "$src"/. "$DOC"/
fi
if [ -n "$TS_CONTACT_TO" ]; then
  printf '<?php\nreturn ["to" => "%s", "from" => "no-reply@temizstok.com", "site" => "TemizStok"];\n' "$TS_CONTACT_TO" > "$DOC/api/config.php"
fi
echo "$new" > "$BASE/.deployed_version"
rm -rf "$tmp"
echo "yayınlandı: $new"
