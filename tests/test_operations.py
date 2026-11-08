"""Prüft echte Dateien und Fehlerpfade; Docker wird gezielt simuliert."""
import hashlib
import io
import json
import os
import pathlib
import shutil
import sqlite3
import subprocess
import tarfile
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent


def database(path, marker="alter-stand"):
    with sqlite3.connect(path) as connection:
        for name in ["users", "credentials", "packages", "progress", "rounds", "attempts"]:
            connection.execute(f"CREATE TABLE {name}(id TEXT)")
        connection.execute("INSERT INTO users VALUES(?)", (marker,))


def archive_for(db, target, corrupt=False):
    checksum = hashlib.sha256(db.read_bytes()).hexdigest()
    if corrupt:
        checksum = "0" * 64
    with tarfile.open(target, "w:gz") as archive:
        archive.add(db, arcname="lernreise.sqlite")
        for name, content in [("SHA256SUMS", f"{checksum}  lernreise.sqlite\n"), ("version.txt", "format=1\n")]:
            raw = content.encode()
            entry = tarfile.TarInfo(name)
            entry.size = len(raw)
            archive.addfile(entry, io.BytesIO(raw))


class OperationsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="lernreise-betriebstest-")
        self.root = pathlib.Path(self.temp.name)
        shutil.copytree(ROOT / "scripts", self.root / "scripts")
        self.bin = self.root / "bin"
        self.bin.mkdir()
        self.log = self.root / "docker.log"
        mock = self.bin / "docker"
        mock.write_text('''#!/usr/bin/env python3
import json, os, pathlib, shutil, sys
a = sys.argv[1:]
with open(os.environ["FAKE_LOG"], "a") as f: f.write(json.dumps(a)+"\\n")
if a == ["compose", "ps", "--status", "running", "--quiet", "app"]:
    if os.environ.get("FAKE_RUNNING") == "true": print("container-id")
elif a[:2] == ["compose", "cp"]:
    if os.environ.get("FAKE_FAIL_CP") == "true": sys.exit(42)
    shutil.copyfile(os.environ["FAKE_DB"], a[-1])
elif a[:2] == ["compose", "run"]:
    if "--volume" in a:
        source = pathlib.Path(a[a.index("--volume")+1].split(":")[0])
        shutil.copyfile(source / "lernreise.sqlite", os.environ["FAKE_DB"])
    else:
        print("vorhanden" if pathlib.Path(os.environ["FAKE_DB"]).exists() else "leer", end="")
elif a[:2] not in [["compose", "build"], ["compose", "stop"], ["compose", "start"], ["compose", "create"], ["compose", "up"]]:
    sys.exit(99)
''')
        mock.chmod(0o755)
        self.db = self.root / "live.sqlite"
        database(self.db)
        self.env = {**os.environ, "PATH": str(self.bin) + os.pathsep + os.environ["PATH"], "FAKE_LOG": str(self.log), "FAKE_DB": str(self.db), "TMPDIR": str(self.root)}

    def tearDown(self):
        self.temp.cleanup()

    def run_script(self, script, *args, extra=None):
        return subprocess.run(["bash", str(self.root / "scripts" / script), *map(str, args)], cwd=self.root, env={**self.env, **(extra or {})}, text=True, capture_output=True)

    def calls(self):
        return [json.loads(x) for x in self.log.read_text().splitlines()] if self.log.exists() else []

    def test_configure_creates_private_secret_without_printing_or_overwriting(self):
        result = self.run_script("configure.sh", "lernen.example.de")
        self.assertEqual(result.returncode, 0, result.stderr)
        config = self.root / ".env"
        token = config.read_text().split("SETUP_TOKEN=")[1].strip()
        self.assertEqual(len(token), 64)
        self.assertNotIn(token, result.stdout + result.stderr)
        self.assertEqual(config.stat().st_mode & 0o777, 0o600)
        self.assertNotEqual(self.run_script("configure.sh", "andere.example.de").returncode, 0)
        self.assertIn(token, config.read_text())

    def test_configure_rejects_url_instead_of_domain(self):
        self.assertNotEqual(self.run_script("configure.sh", "https://lernen.example.de").returncode, 0)
        self.assertFalse((self.root / ".env").exists())

    def test_apache_configuration_selects_only_separate_compose_file(self):
        result = self.run_script("configure.sh", "lernen.funkymonkeytown.de", "--apache")
        self.assertEqual(result.returncode, 0, result.stderr)
        config = (self.root / ".env").read_text()
        self.assertIn("COMPOSE_FILE=compose.apache.yaml\n", config)
        self.assertIn("COMPOSE_PROJECT_NAME=lernreise\n", config)
        self.assertIn("APP_PORT=18080\n", config)
        self.assertIn("DOMAIN=lernen.funkymonkeytown.de\n", config)

    def test_unknown_configuration_mode_does_not_create_secret(self):
        self.assertNotEqual(self.run_script("configure.sh", "lernen.example.de", "--unbekannt").returncode, 0)
        self.assertFalse((self.root / ".env").exists())

    def test_backup_restarts_running_app_even_when_copy_fails(self):
        result = self.run_script("backup.sh", extra={"FAKE_RUNNING": "true", "FAKE_FAIL_CP": "true"})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(["compose", "stop", "app"], self.calls())
        self.assertEqual(self.calls()[-1], ["compose", "start", "app"])
        self.assertEqual(list((self.root / "backups").glob("*.tar.gz")), [])

    def test_backup_produces_verified_archive_and_keeps_stopped_app_stopped(self):
        result = self.run_script("backup.sh")
        self.assertEqual(result.returncode, 0, result.stderr)
        archive = next((self.root / "backups").glob("*.tar.gz"))
        self.assertEqual(archive.stat().st_mode & 0o777, 0o600)
        output = self.root / "verification"
        check = subprocess.run(["python3", str(self.root / "scripts/verify-backup.py"), str(archive), str(output)], capture_output=True, text=True)
        self.assertEqual(check.returncode, 0, check.stderr)
        self.assertNotIn(["compose", "start", "app"], self.calls())

    def test_restore_rejects_corruption_before_any_docker_call(self):
        archive = self.root / "corrupt.tar.gz"
        archive_for(self.db, archive, corrupt=True)
        result = self.run_script("restore.sh", archive, "--ersetzen")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Prüfsumme", result.stderr)
        self.assertEqual(self.calls(), [])

    def test_restore_requires_explicit_replacement_and_rejects_path_traversal(self):
        archive = self.root / "unsafe.tar.gz"
        with tarfile.open(archive, "w:gz") as source:
            entry = tarfile.TarInfo("../unerlaubt")
            entry.size = 1
            source.addfile(entry, io.BytesIO(b"x"))
        self.assertNotEqual(self.run_script("restore.sh", archive).returncode, 0)
        self.assertNotEqual(self.run_script("restore.sh", archive, "--ersetzen").returncode, 0)
        self.assertEqual(self.calls(), [])
        self.assertFalse((self.root / "unerlaubt").exists())

    def test_restore_saves_old_database_before_replacing_it(self):
        new = self.root / "new.sqlite"
        database(new, "wiederhergestellt")
        archive = self.root / "good.tar.gz"
        archive_for(new, archive)
        result = self.run_script("restore.sh", archive, "--ersetzen")
        self.assertEqual(result.returncode, 0, result.stderr)
        with sqlite3.connect(self.db) as connection:
            self.assertEqual(connection.execute("SELECT id FROM users").fetchone()[0], "wiederhergestellt")
        old = next((self.root / "backups").glob("*.tar.gz"))
        with tarfile.open(old) as source:
            raw = source.extractfile("lernreise.sqlite").read()
        saved = self.root / "old.sqlite"
        saved.write_bytes(raw)
        with sqlite3.connect(saved) as connection:
            self.assertEqual(connection.execute("SELECT id FROM users").fetchone()[0], "alter-stand")
        self.assertEqual(self.calls()[-1], ["compose", "up", "-d"])


if __name__ == "__main__":
    unittest.main()
