#!/usr/bin/env bash
# Sichert die geschlossene SQLite-Datenbank; startet eine zuvor laufende App wieder.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v docker >/dev/null || { echo 'Docker fehlt.' >&2; exit 1; }
umask 077
backup_dir=${1:-./backups}
mkdir -p "$backup_dir"
backup_dir=$(cd "$backup_dir" && pwd)
temp_dir=$(mktemp -d)
restart_needed=false
cleanup() {
  code=$?
  trap - EXIT
  rm -rf "$temp_dir"
  if [[ "$restart_needed" == true ]]; then
    if ! docker compose start app; then
      echo 'App konnte nicht wieder gestartet werden. Bitte docker compose up -d app ausführen.' >&2
      code=1
    fi
  fi
  exit "$code"
}
trap cleanup EXIT
if [[ -n "$(docker compose ps --status running --quiet app)" ]]; then
  restart_needed=true
  docker compose stop app
fi
docker compose cp app:/app/data/lernreise.sqlite "$temp_dir/lernreise.sqlite"
if [[ ! -s "$temp_dir/lernreise.sqlite" ]]; then echo 'Datenbank fehlt oder ist leer.' >&2; exit 1; fi
revision=$(git rev-parse HEAD 2>/dev/null || printf 'kein-git-stand')
printf 'format=1\nrevision=%s\ntime_utc=%s\n' "$revision" "$(date -u +%FT%TZ)" > "$temp_dir/version.txt"
(cd "$temp_dir" && sha256sum lernreise.sqlite > SHA256SUMS)
archive="$backup_dir/lernreise-$(date -u +%Y%m%dT%H%M%SZ)-${RANDOM}.tar.gz"
tar -C "$temp_dir" -czf "$archive" lernreise.sqlite SHA256SUMS version.txt
chmod 600 "$archive"
printf 'Sicherung erstellt: %s\n' "$archive"
echo 'Diese Datei geschützt auf ein anderes System kopieren. Sie enthält Schülerdaten und Passkey-Schlüssel.'
