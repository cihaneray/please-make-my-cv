"""One-time ownership migration for existing local Docker volumes; app stays non-root."""

import os
from pathlib import Path

for name in ("/app/data", "/app/secrets", "/web-cache"):
    root = Path(name)
    if not root.exists():
        continue
    for directory, _, files in os.walk(root, followlinks=False):
        os.chown(directory, 10001, 10001)
        for file in files:
            path = Path(directory) / file
            if not path.is_symlink():
                os.chown(path, 10001, 10001)
    os.chmod(root, 0o700)
