#!/usr/bin/env python3
"""Prüft und entpackt ausschließlich die drei definierten Sicherungsdateien."""
import hashlib
import pathlib
import sqlite3
import sys
import tarfile

archive, destination = map(pathlib.Path, sys.argv[1:])
allowed = {"lernreise.sqlite", "SHA256SUMS", "version.txt"}
with tarfile.open(archive, "r:gz") as source:
    members = source.getmembers()
    if len(members) != 3 or {m.name for m in members} != allowed:
        raise SystemExit("Abbruch: Unbekanntes Sicherungsformat oder unerwartete Dateien.")
    if any(not m.isfile() or m.size > 2 * 1024**3 for m in members):
        raise SystemExit("Abbruch: Unzulässiger Dateityp oder zu große Sicherung.")
    destination.mkdir(parents=True, exist_ok=True, mode=0o700)
    for member in members:
        with source.extractfile(member) as src, (destination / member.name).open("xb") as dst:
            while chunk := src.read(1024 * 1024):
                dst.write(chunk)
database = destination / "lernreise.sqlite"
expected = (destination / "SHA256SUMS").read_text().split()
with database.open("rb") as source:
    digest = hashlib.sha256()
    while chunk := source.read(1024 * 1024):
        digest.update(chunk)
    actual = digest.hexdigest()
if len(expected) != 2 or expected[1] != "lernreise.sqlite" or expected[0] != actual:
    raise SystemExit("Abbruch: Prüfsumme stimmt nicht. Sicherung nicht wiederherstellen.")
with sqlite3.connect(f"{database.as_uri()}?mode=ro", uri=True) as connection:
    if connection.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
        raise SystemExit("Abbruch: Datenbankprüfung fehlgeschlagen.")
    tables = {r[0] for r in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    if not {"users", "credentials", "packages", "progress", "rounds", "attempts"} <= tables:
        raise SystemExit("Abbruch: Keine vollständige Lernreise-Datenbank.")
print("Sicherung, Prüfsumme und SQLite-Struktur sind gültig.")
