"""Authenticated encryption of local settings and portable password-protected backups."""

import base64
import json
import os
import tempfile
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives.kdf.argon2 import Argon2id

from app.core.exceptions import AppException


def private_write(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(dir=path.parent, prefix=".private-", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf8") as file:
            json.dump(payload, file)
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def local_cipher(key_path: Path, *, create: bool = False) -> Fernet:
    try:
        if create and not key_path.exists():
            key_path.parent.mkdir(parents=True, exist_ok=True)
            try:
                fd = os.open(key_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                with os.fdopen(fd, "wb") as file:
                    file.write(Fernet.generate_key())
            except FileExistsError:
                pass
        return Fernet(key_path.read_bytes().strip())
    except (OSError, ValueError) as exc:
        raise AppException(
            "AI_SECRET_KEY_UNAVAILABLE",
            "AI encryption key is missing or invalid. Restore the key or reconfigure the AI connection.",
            503,
        ) from exc


def decrypt_secret(token: str, key_path: Path) -> str:
    try:
        return local_cipher(key_path).decrypt(token.encode()).decode()
    except (InvalidToken, UnicodeError, ValueError) as exc:
        raise AppException(
            "AI_SECRET_INVALID",
            "AI credential cannot be decrypted. Restore its encryption key or reconfigure AI.",
            503,
        ) from exc


def backup_cipher(password: str, salt: bytes) -> Fernet:
    key = Argon2id(salt=salt, length=32, iterations=3, lanes=4, memory_cost=65536).derive(
        password.encode()
    )
    return Fernet(base64.urlsafe_b64encode(key))


def encrypt_backup(payload: bytes, password: str) -> dict:
    salt = os.urandom(16)
    return {
        "format": "cv-workspace-encrypted-v1",
        "salt": base64.b64encode(salt).decode(),
        "ciphertext": backup_cipher(password, salt).encrypt(payload).decode(),
    }


def decrypt_backup(envelope: dict, password: str) -> bytes:
    try:
        if envelope.get("format") != "cv-workspace-encrypted-v1":
            raise ValueError("Unsupported backup format")
        salt = base64.b64decode(envelope["salt"], validate=True)
        if len(salt) != 16:
            raise ValueError("Invalid salt")
        if not isinstance(envelope.get("ciphertext"), str):
            raise ValueError("Invalid ciphertext")
        return backup_cipher(password, salt).decrypt(envelope["ciphertext"].encode())
    except (InvalidToken, KeyError, TypeError, ValueError, UnicodeError) as exc:
        raise AppException(
            "BACKUP_DECRYPT_FAILED", "Incorrect backup password or damaged backup file.", 422
        ) from exc
