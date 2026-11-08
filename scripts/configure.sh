#!/usr/bin/env bash
# Erstellt .env mit einem neuen Geheimnis, ohne es im Terminal auszugeben.
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -e .env ]]; then
  echo 'Abbruch: .env existiert bereits und wird nicht überschrieben.' >&2
  exit 1
fi
domain=${1:-}
domain=${domain,,}
mode=${2:-}
if [[ $# -gt 2 || ( -n "$mode" && "$mode" != --apache ) ]]; then
  echo 'Verwendung: bash scripts/configure.sh DOMAIN [--apache]' >&2
  exit 1
fi
if [[ ! "$domain" =~ ^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$ ]]; then
  echo 'Verwendung: bash scripts/configure.sh lernen.deine-domain.de (ohne https://, Port oder Pfad)' >&2
  exit 1
fi
command -v openssl >/dev/null || { echo 'openssl fehlt.' >&2; exit 1; }
umask 077
token=$(openssl rand -hex 32)
# noclobber verhindert ein Überschreiben auch bei zwei gleichzeitigen Aufrufen.
(set -o noclobber
  {
    printf 'DOMAIN=%s\nSETUP_TOKEN=%s\n' "$domain" "$token"
    if [[ "$mode" == --apache ]]; then
      printf 'COMPOSE_FILE=compose.apache.yaml\nCOMPOSE_PROJECT_NAME=lernreise\nAPP_PORT=18080\n'
    fi
  } > .env
)
echo '.env wurde mit privaten Dateirechten erstellt. Das Geheimnis wurde nicht ausgegeben.'
if [[ "$mode" == --apache ]]; then
  echo 'Apache-Variante gewählt: nur die App auf 127.0.0.1:18080, kein Caddy.'
  echo 'Vor dem Start: Port und Ressourcen prüfen; docker compose config --services muss nur app zeigen.'
fi
echo 'Weiter: docker compose up -d --build'
