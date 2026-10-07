import hashlib
import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from package_release import package_release


class ReleasePackageTests(unittest.TestCase):
    def test_bundle_pins_both_images_and_excludes_user_data(self):
        with tempfile.TemporaryDirectory() as folder:
            path = package_release(
                "v0.2.0", "Example/CV", "sha256:" + "a" * 64, "sha256:" + "b" * 64, Path(folder)
            )
            with zipfile.ZipFile(path) as bundle:
                self.assertEqual(
                    set(bundle.namelist()),
                    {
                        "docker-compose.yml",
                        ".env.example",
                        "scripts/init-app-db.sh",
                        "INSTALL.md",
                        "images.json",
                    },
                )
                manifest = json.loads(bundle.read("images.json"))
                self.assertEqual(manifest["api"], "ghcr.io/example/cv-api@sha256:" + "a" * 64)
                self.assertEqual(manifest["platform"], "linux/amd64")
                compose = bundle.read("docker-compose.yml").decode("utf-8-sig")
                self.assertNotIn("build:", compose)
                self.assertIn("name: please-make-my-cv", compose)
                self.assertIn("postgres:16-alpine", compose)
                self.assertIn(manifest["api"], bundle.read(".env.example").decode())
                self.assertNotIn(b"\r", bundle.read("scripts/init-app-db.sh"))
            self.assertEqual(
                path.with_suffix(".zip.sha256").read_text().split()[0],
                hashlib.sha256(path.read_bytes()).hexdigest(),
            )

    def test_unsafe_references_are_rejected_before_creating_assets(self):
        with tempfile.TemporaryDirectory() as folder:
            for tag, repository, digest in (
                ("v1.2.3/../../other", "example/cv", "sha256:" + "a" * 64),
                ("v1.2.3", "example/cv\nother=bad", "sha256:" + "a" * 64),
                ("v1.2.3", "example/cv", "sha256:wrong"),
            ):
                with self.subTest(tag=tag, repository=repository), self.assertRaises(ValueError):
                    package_release(tag, repository, digest, "sha256:" + "b" * 64, Path(folder))
            self.assertEqual(list(Path(folder).iterdir()), [])


if __name__ == "__main__":
    unittest.main()
