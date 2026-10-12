"""Build a reproducible, allowlisted browser-extension ZIP using only stdlib."""

import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path

SOURCE = Path(__file__).resolve().parent / "job-capture"
FILES = (
    "manifest.json", "capture.js", "popup.html", "popup.css", "popup.js",
    "README.md", "icons/icon-16.png", "icons/icon-32.png",
    "icons/icon-48.png", "icons/icon-128.png",
)


def package(output: Path, source: Path = SOURCE) -> Path:
    manifest = json.loads((source / "manifest.json").read_text(encoding="utf-8"))
    version = manifest.get("version", "")
    if not re.fullmatch(r"\d+(?:\.\d+){0,3}", version):
        raise ValueError("Invalid extension version")
    if manifest.get("manifest_version") != 3 or set(manifest.get("permissions", [])) != {"activeTab", "scripting"}:
        raise ValueError("Unexpected manifest version or permissions")
    if manifest.get("host_permissions") or manifest.get("optional_host_permissions"):
        raise ValueError("Broad host permissions are not supported")
    references = [manifest["action"]["default_popup"], *manifest["icons"].values(), *manifest["action"]["default_icon"].values()]
    if any(path not in FILES for path in references):
        raise ValueError("Manifest references an unexpected file")
    contents = {}
    for name in FILES:
        path = source / name
        if path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(source.resolve()):
            raise ValueError(f"Missing or symlinked package file: {name}")
        content = path.read_bytes()
        if not name.endswith(".png"):
            content = content.replace(b"\r\n", b"\n")
        contents[name] = content
    output.mkdir(parents=True, exist_ok=True)
    archive = output / f"cv-job-capture-{version}.zip"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        for name in sorted(contents):
            entry = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            entry.compress_type = zipfile.ZIP_DEFLATED
            bundle.writestr(entry, contents[name], compresslevel=9)
    checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
    archive.with_suffix(".zip.sha256").write_text(f"{checksum}  {archive.name}\n", encoding="utf-8")
    return archive


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("output/extensions"))
    args = parser.parse_args()
    print(package(args.output))
