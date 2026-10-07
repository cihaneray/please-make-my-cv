import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from release_metadata import release_request


class ReleaseRequestTests(unittest.TestCase):
    def test_explicit_marker_with_skip(self):
        self.assertEqual(
            release_request("branch", "main", "feat: export [RELEASE:v1.2.3] [SKIP]"),
            ("v1.2.3", False),
        )

    def test_merge_message_and_lowercase_marker(self):
        self.assertEqual(
            release_request("branch", "main", "Merge PR #8\n\nfeat: export [release:v1.2.3]"),
            ("v1.2.3", False),
        )

    def test_tag_takes_precedence_over_commit_marker(self):
        self.assertEqual(
            release_request("tag", "v2.0.0", "feat: export [RELEASE:v1.0.0]"), ("v2.0.0", False)
        )

    def test_prerelease_and_build_metadata(self):
        self.assertEqual(
            release_request("tag", "v0.1.0-beta.1+build.02", ""), ("v0.1.0-beta.1+build.02", True)
        )
        self.assertEqual(release_request("tag", "v1.2.3+build.2", ""), ("v1.2.3+build.2", False))

    def test_ordinary_commits_and_feature_branches_do_not_publish(self):
        self.assertIsNone(release_request("branch", "main", "feat: export [SKIP]"))
        self.assertIsNone(
            release_request("branch", "codex/feature", "feat: export [RELEASE:v1.0.0]")
        )

    def test_invalid_or_unsafe_versions_are_rejected(self):
        for tag in (
            "v1",
            "v01.2.3",
            "v1.2.3-01",
            "v1.2.3-beta.01",
            "v1.2.3;echo hi",
            "v1.2.3\nsha=evil",
            "$(whoami)",
            "v1.2.3/other",
        ):
            with self.subTest(tag=tag), self.assertRaises(ValueError):
                release_request("tag", tag, "")

    def test_ambiguous_or_incomplete_markers_are_rejected(self):
        for message in (
            "feat: [RELEASE:v1.2.3] [RELEASE:v2.0.0]",
            "feat: [RELEASE:]",
            "feat: [RELEASE:v1.2.3",
        ):
            with self.subTest(message=message), self.assertRaises(ValueError):
                release_request("branch", "main", message)


if __name__ == "__main__":
    unittest.main()
