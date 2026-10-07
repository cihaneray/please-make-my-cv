"""Exercise publication in a disposable Git repo with a recording GitHub CLI stub."""

import os
import subprocess
import tempfile
import unittest
from pathlib import Path

PUBLISH = Path(__file__).resolve().parents[1] / "publish-release.sh"


@unittest.skipUnless(os.name == "posix", "Publication uses the Linux GitHub Actions runner")
class PublishReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.repo = Path(self.temporary.name)
        self.git("init", "-q")
        self.git(
            "-c",
            "user.name=Test",
            "-c",
            "user.email=test@example.test",
            "commit",
            "--allow-empty",
            "-qm",
            "Example",
        )
        self.sha = self.git("rev-parse", "HEAD").stdout.strip()
        bin_path = self.repo / "bin"
        bin_path.mkdir()
        gh = bin_path / "gh"
        gh.write_text(
            '#!/usr/bin/env bash\nprintf "%s\\n" "$*" >> "$GH_CALL_LOG"\nif [ "$1 $2" = "release view" ]; then exit "${GH_VIEW_EXIT:-1}"; fi\n'
        )
        gh.chmod(0o700)
        self.log = self.repo / "calls.log"
        self.env = dict(
            os.environ,
            PATH=f"{bin_path}:{os.environ['PATH']}",
            GH_CALL_LOG=str(self.log),
            RELEASE_TAG="v1.2.3",
            RELEASE_SHA=self.sha,
            RELEASE_PRERELEASE="false",
            GITHUB_REPOSITORY="example/cv",
        )

    def git(self, *args):
        return subprocess.run(
            ["git", *args], cwd=self.repo, check=True, text=True, capture_output=True
        )

    def publish(self):
        return subprocess.run(
            ["bash", str(PUBLISH)], cwd=self.repo, env=self.env, text=True, capture_output=True
        )

    def calls(self):
        return self.log.read_text() if self.log.exists() else ""

    def test_commit_marker_creates_tag_at_exact_commit_and_generated_notes(self):
        result = self.publish()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(f"-f ref=refs/tags/v1.2.3 -f sha={self.sha}", self.calls())
        self.assertIn("release create v1.2.3", self.calls())
        self.assertIn("--verify-tag --generate-notes", self.calls())

    def test_annotated_tag_is_preserved(self):
        self.git(
            "-c",
            "user.name=Test",
            "-c",
            "user.email=test@example.test",
            "tag",
            "-a",
            "v1.2.3",
            "-m",
            "Version",
        )
        self.assertEqual(self.publish().returncode, 0)
        self.assertNotIn("git/refs", self.calls())
        self.assertIn("release create", self.calls())

    def test_existing_release_is_not_republished(self):
        self.git("tag", "v1.2.3")
        self.env["GH_VIEW_EXIT"] = "0"
        result = self.publish()
        self.assertEqual(result.returncode, 0)
        self.assertIn("already exists", result.stdout)
        self.assertNotIn("release create", self.calls())

    def test_conflicting_tag_never_moves_or_publishes(self):
        self.git("tag", "v1.2.3")
        self.git(
            "-c",
            "user.name=Test",
            "-c",
            "user.email=test@example.test",
            "commit",
            "--allow-empty",
            "-qm",
            "Later",
        )
        self.env["RELEASE_SHA"] = self.git("rev-parse", "HEAD").stdout.strip()
        result = self.publish()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("will not be moved", result.stderr)
        self.assertEqual(self.calls(), "")

    def test_prerelease_does_not_replace_latest(self):
        self.env.update(RELEASE_TAG="v1.2.3-beta.1", RELEASE_PRERELEASE="true")
        self.assertEqual(self.publish().returncode, 0)
        self.assertIn("--prerelease --latest=false", self.calls())


if __name__ == "__main__":
    unittest.main()
