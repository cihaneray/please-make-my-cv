import importlib.util
import hashlib
import json
import shutil
import tempfile
import unittest
import zipfile
from pathlib import Path

spec = importlib.util.spec_from_file_location("package_job_capture", Path(__file__).resolve().parents[1] / "package_job_capture.py")
packager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packager)


class ExtensionPackageTests(unittest.TestCase):
    def test_allowlisted_package_is_reproducible_and_excludes_unrelated_files(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            shutil.copytree(packager.SOURCE, source)
            (source / ".env").write_text("DO_NOT_INCLUDE=secret")
            (source / "capture.log").write_text("DO_NOT_INCLUDE")
            first = packager.package(root / "first", source)
            second = packager.package(root / "second", source)
            self.assertEqual(first.read_bytes(), second.read_bytes())
            self.assertTrue(first.with_suffix(".zip.sha256").is_file())
            self.assertEqual(first.with_suffix(".zip.sha256").read_text().strip(), f"{hashlib.sha256(first.read_bytes()).hexdigest()}  {first.name}")
            with zipfile.ZipFile(first) as archive:
                self.assertEqual(set(archive.namelist()), set(packager.FILES))
                self.assertIsNone(archive.testzip())

    def test_missing_runtime_file_fails_before_creating_archive(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            shutil.copytree(packager.SOURCE, source)
            (source / "capture.js").unlink()
            with self.assertRaises(ValueError):
                packager.package(root / "output", source)
            self.assertFalse((root / "output").exists())

    def test_unexpected_permissions_require_review(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            shutil.copytree(packager.SOURCE, source)
            manifest = json.loads((source / "manifest.json").read_text())
            manifest["host_permissions"] = ["<all_urls>"]
            (source / "manifest.json").write_text(json.dumps(manifest))
            with self.assertRaises(ValueError):
                packager.package(root / "output", source)


if __name__ == "__main__":
    unittest.main()
