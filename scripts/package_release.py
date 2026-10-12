"""Create an explicit, secret-free Compose distribution pinned to image digests."""

import hashlib
import json
import os
import re
import zipfile
from pathlib import Path

from release_metadata import release_request

ROOT = Path(__file__).resolve().parents[1]


def package_release(
    tag: str, repository: str, api_digest: str, web_digest: str, output: Path
) -> Path:
    release_request("tag", tag, "")
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        raise ValueError("Invalid repository name")
    for digest in (api_digest, web_digest):
        if not re.fullmatch(r"sha256:[a-f0-9]{64}", digest):
            raise ValueError("Invalid image digest")
    repository = repository.lower()
    images = {
        "api": f"ghcr.io/{repository}-api@{api_digest}",
        "web": f"ghcr.io/{repository}-web@{web_digest}",
    }
    env = ROOT.joinpath(".env.example").read_text().rstrip() + "\n"
    env += f"CV_API_IMAGE={images['api']}\nCV_WEB_IMAGE={images['web']}\n"
    instructions = f"""# CV Workspace {tag} - Docker installation

Requires Docker Compose v2 with Linux containers on an x86-64/amd64 computer.
No local Python, Node.js or source-code build is needed.

1. Extract this ZIP into a persistent folder.
2. Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell).
3. Set two different passwords in `.env`: POSTGRES_PASSWORD and CV_DB_PASSWORD.
   Leave CV_API_IMAGE and CV_WEB_IMAGE unchanged; they pin this release's digests.
4. Run `docker compose pull`, then `docker compose up -d --wait`.
5. Open http://localhost:3000.

API/web images are hosted on GHCR; PostgreSQL uses the official image.
If package visibility is private, authenticate first with `docker login ghcr.io`
using a GitHub token with read:packages access. Public packages need no login.
The publisher can set each package to Public under its GitHub Package settings.

All ports bind to 127.0.0.1. db-init and volume-init exit after successful setup.
PDF rendering stays in the API. User data and AI credentials are never in this ZIP.

## Updating an existing installation

Back up your workspace first. Stop the old stack with `docker compose down`.
Extract the new ZIP into the same folder, keep `.env` and its passwords, and
update only CV_API_IMAGE/CV_WEB_IMAGE using the new `.env.example` values.
Then run `docker compose pull` and `docker compose up -d --wait`.
The fixed project name `please-make-my-cv` retains the original project's named
data volumes, including installations started from the source repository.
If you used a custom project name, keep using that name with `docker compose -p`.
Never use `down --volumes` to update; it erases saved data.

Published images: {images["api"]} and {images["web"]}.
"""
    contents = {
        "docker-compose.yml": ROOT.joinpath("docker-compose.release.yml").read_bytes(),
        ".env.example": env.encode(),
        "scripts/init-app-db.sh": ROOT.joinpath("scripts/init-app-db.sh")
        .read_bytes()
        .replace(b"\r\n", b"\n"),
        "INSTALL.md": instructions.encode(),
        "images.json": json.dumps(
            {"version": tag, "platform": "linux/amd64", **images}, indent=2
        ).encode(),
    }
    output.mkdir(parents=True, exist_ok=True)
    archive = output / f"please-make-my-cv-{tag}-docker.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
        for name, content in contents.items():
            bundle.writestr(name, content)
    checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
    archive.with_suffix(".zip.sha256").write_text(f"{checksum}  {archive.name}\n")
    notes = f"""## Ready-to-run Docker installation

Download **{archive.name}**, extract it and follow INSTALL.md. No local build is required.
Linux/amd64 API and web images are published to GHCR with version {tag[1:].replace("+", "-build.")}.
The Compose package pins their exact digests and includes a SHA-256 checksum.

- [API package](https://github.com/{repository.split("/")[0]}?tab=packages&repo_name={repository.split("/")[1]})
- [Container publication documentation](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)

"""
    (output / "release-notes.md").write_text(notes)
    return archive


if __name__ == "__main__":
    print(
        package_release(
            os.environ["RELEASE_TAG"],
            os.environ["GITHUB_REPOSITORY"],
            os.environ["API_DIGEST"],
            os.environ["WEB_DIGEST"],
            Path("dist"),
        )
    )
