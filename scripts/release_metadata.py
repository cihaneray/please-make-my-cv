"""Resolve explicit release requests without executing commit-message contents."""

import os
import re
import subprocess
from pathlib import Path

VERSION = re.compile(
    r"v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)"
    r"(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?"
    r"(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?"
)


def release_request(ref_type: str, ref_name: str, message: str) -> tuple[str, bool] | None:
    if ref_type == "tag":
        tag = ref_name
    elif ref_type == "branch" and ref_name == "main":
        markers = re.findall(r"\[release:([^\]]*)\]", message, re.IGNORECASE)
        if not markers:
            if "[release:" in message.lower():
                raise ValueError("Incomplete release marker; use [RELEASE:v1.2.3].")
            return None
        if len(markers) != 1:
            raise ValueError("Use exactly one release marker per commit.")
        tag = markers[0].strip()
    else:
        return None
    version = VERSION.fullmatch(tag)
    if not version:
        raise ValueError(
            "Release version must be vMAJOR.MINOR.PATCH, optionally with prerelease/build metadata."
        )
    prerelease = version.group(4)
    if prerelease and any(
        part.isdigit() and len(part) > 1 and part[0] == "0" for part in prerelease.split(".")
    ):
        raise ValueError("Numeric prerelease identifiers cannot have leading zeros.")
    return tag, bool(prerelease)


def main() -> None:
    request = release_request(
        os.environ["GITHUB_REF_TYPE"],
        os.environ["GITHUB_REF_NAME"],
        os.environ.get("HEAD_COMMIT_MESSAGE", ""),
    )
    if request is None:
        return
    tag, prerelease = request
    # A tag may point to an older main commit, but never to an unmerged feature branch.
    subprocess.run(["git", "merge-base", "--is-ancestor", "HEAD", "origin/main"], check=True)
    sha = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    with Path(os.environ["GITHUB_OUTPUT"]).open("a", encoding="utf8") as output:
        output.write(f"tag={tag}\nsha={sha}\nprerelease={str(prerelease).lower()}\n")
    print(f"Release requested: {tag} at {sha}")


if __name__ == "__main__":
    main()
