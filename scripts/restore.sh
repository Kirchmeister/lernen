#!/usr/bin/env bash
# Eine Wiederherstellung ersetzt die Datenbank. Bewusstes --ersetzen ist erforderlich.
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ $# != 2 || "$2" != --ersetzen ]]; then
  echo 'Verwendung: bash scripts/restore.sh /absoluter/pfad/sicherung.tar.gz --ersetzen' >&2
  echo 'Achtung: Aktuelle Konten und Lernstände werden durch die Sicherung ersetzt.' >&2
  exit 1
fi
archive=$1
[[ -f "$archive" ]] || { echo 'Sicherung nicht gefunden.' >&2; exit 1; }
command -v python3 >/dev/null || { echo 'python3 fehlt.' >&2; exit 1; }
umask 077
temp_dir=$(mktemp -d)
trap 'rm -rf "$temp_dir"' EXIT
python3 scripts/verify-backup.py "$archive" "$temp_dir"
docker compose build app
docker compose stop app
docker compose create app
# Vorhandene Daten zuerst sichern. Ein defektes Backup lässt die App gestoppt.
existing=$(docker compose run --rm --no-deps --user root app sh -eu -c '
  if test -f /app/data/lernreise.sqlite; then printf vorhanden; else printf leer; fi
')
if [[ "$existing" == vorhanden ]]; then
  bash scripts/backup.sh
fi
docker compose run --rm --no-deps --user root --volume "$temp_dir:/restore:ro" app sh -eu -c '
  rm -f /app/data/lernreise.sqlite-wal /app/data/lernreise.sqlite-shm
  cp /restore/lernreise.sqlite /app/data/lernreise.sqlite
  chown node:node /app/data/lernreise.sqlite
  chmod 600 /app/data/lernreise.sqlite
'
docker compose up -d
echo 'Sicherung eingespielt. Bitte Anmeldung und einen Lernstand im Browser prüfen.'
