import base64
import json
import os
from typing import Any, Union

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

from shared.config import settings

# 256-bit AES key derivation constant salt
_KDF_SALT = b"noteorbit_aes256_kdf_salt_v1"


def _derive_key(secret: str | None = None) -> bytes:
    """Derive a 256-bit (32 byte) key from the secret key using PBKDF2-SHA256."""
    raw_secret = (secret or settings.jwt_secret_key or "default-noteorbit-aes-key-32b").encode("utf-8")
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,  # 256 bits
        salt=_KDF_SALT,
        iterations=100_000,
    )
    return kdf.derive(raw_secret)


# Cached AESGCM instance
_AES_KEY = _derive_key()
_AES_GCM = AESGCM(_AES_KEY)


def encrypt_aes256(plaintext: Union[str, bytes]) -> str:
    """
    Encrypt string or bytes with AES-256-GCM (Galois/Counter Mode).
    Format of output: base64( 12-byte random IV + ciphertext + 16-byte auth tag )
    """
    if isinstance(plaintext, str):
        plaintext = plaintext.encode("utf-8")

    # 96-bit (12 byte) cryptographically secure nonce
    nonce = os.urandom(12)
    ciphertext = _AES_GCM.encrypt(nonce, plaintext, None)

    # Combined payload: nonce + ciphertext (tag is appended by AESGCM)
    payload = nonce + ciphertext
    return base64.urlsafe_b64encode(payload).decode("utf-8")


def decrypt_aes256(ciphertext_b64: str) -> str:
    """
    Decrypt base64-encoded AES-256-GCM ciphertext.
    Verifies authenticity tag automatically; raises ValueError on tampering or invalid key.
    """
    try:
        raw = base64.urlsafe_b64decode(ciphertext_b64.encode("utf-8"))
        if len(raw) < 28:  # 12 byte nonce + minimum 16 byte tag
            raise ValueError("Invalid ciphertext length")

        nonce = raw[:12]
        ciphertext = raw[12:]
        decrypted = _AES_GCM.decrypt(nonce, ciphertext, None)
        return decrypted.decode("utf-8")
    except Exception as e:
        raise ValueError(f"AES-256 decryption failed: {e}") from e


def encrypt_json(data: Any) -> str:
    """Serialize and encrypt dictionary/list to AES-256-GCM ciphertext."""
    serialized = json.dumps(data)
    return encrypt_aes256(serialized)


def decrypt_json(ciphertext_b64: str) -> Any:
    """Decrypt and deserialize AES-256-GCM ciphertext back to Python object."""
    decrypted = decrypt_aes256(ciphertext_b64)
    return json.loads(decrypted)
