import base64
import binascii
import json
from typing import Any


VEILMI_PREFIX = "VEILMI1:"
VEILMI_VERSION = 1
VEILMI_KDF = "PBKDF2-SHA256"

SUPPORTED_PBKDF2_ITERATIONS = {
    50_000,
    100_000,
    600_000,
}

SALT_LENGTH = 16
NONCE_LENGTH = 12
MAC_LENGTH = 16


class VeilmiValidationError(ValueError):
    """Raised when a string is not a supported Veilmi message envelope."""


def _decode_base64url(value: str, field_name: str) -> bytes:
    if not isinstance(value, str) or not value:
        raise VeilmiValidationError(
            f"Veilmi field '{field_name}' must be a non-empty Base64URL string."
        )

    # Dart's Base64URL decoder accepts normal URL-safe Base64 padding.
    # Add missing padding so both padded and unpadded Veilmi strings can be checked.
    padded = value + ("=" * (-len(value) % 4))

    try:
        return base64.b64decode(
            padded,
            altchars=b"-_",
            validate=True,
        )
    except (binascii.Error, ValueError) as exc:
        raise VeilmiValidationError(
            f"Veilmi field '{field_name}' is not valid Base64URL."
        ) from exc


def validate_veilmi_message(encoded_message: str) -> None:
    """
    Validate the structure of a Veilmi message without decrypting it.

    This mirrors the format checks performed by Veilmi's
    MessageEnvelope.decode() method.

    It verifies:
    - VEILMI1 prefix
    - Base64URL payload
    - JSON object structure
    - required fields and basic types
    - supported version
    - supported KDF
    - supported PBKDF2 iteration count
    - salt, nonce, and MAC byte lengths
    - non-empty ciphertext

    It does NOT verify the passphrase or decrypt the message.
    """

    if not isinstance(encoded_message, str):
        raise VeilmiValidationError("Veilmi message must be a string.")

    if not encoded_message.startswith(VEILMI_PREFIX):
        raise VeilmiValidationError("Invalid Veilmi message prefix.")

    payload = encoded_message[len(VEILMI_PREFIX):]

    if not payload:
        raise VeilmiValidationError("Veilmi message payload is empty.")

    try:
        json_bytes = _decode_base64url(payload, "payload")
        decoded_text = json_bytes.decode("utf-8")
        decoded_json: Any = json.loads(decoded_text)
    except UnicodeDecodeError as exc:
        raise VeilmiValidationError(
            "Veilmi message payload is not valid UTF-8."
        ) from exc
    except json.JSONDecodeError as exc:
        raise VeilmiValidationError(
            "Veilmi message payload is not valid JSON."
        ) from exc

    if not isinstance(decoded_json, dict):
        raise VeilmiValidationError("Invalid Veilmi message format.")

    required_fields = ("v", "k", "i", "s", "n", "c", "m")

    for field in required_fields:
        if field not in decoded_json:
            raise VeilmiValidationError(
                f"Veilmi message is missing required field '{field}'."
            )

    version = decoded_json["v"]
    kdf = decoded_json["k"]
    iterations = decoded_json["i"]
    salt_value = decoded_json["s"]
    nonce_value = decoded_json["n"]
    ciphertext_value = decoded_json["c"]
    mac_value = decoded_json["m"]

    # bool is a subclass of int in Python, so reject it explicitly.
    if isinstance(version, bool) or not isinstance(version, int):
        raise VeilmiValidationError("Veilmi field 'v' must be an integer.")

    if not isinstance(kdf, str):
        raise VeilmiValidationError("Veilmi field 'k' must be a string.")

    if isinstance(iterations, bool) or not isinstance(iterations, int):
        raise VeilmiValidationError("Veilmi field 'i' must be an integer.")

    for field_name, value in (
        ("s", salt_value),
        ("n", nonce_value),
        ("c", ciphertext_value),
        ("m", mac_value),
    ):
        if not isinstance(value, str):
            raise VeilmiValidationError(
                f"Veilmi field '{field_name}' must be a string."
            )

    if version != VEILMI_VERSION:
        raise VeilmiValidationError("Unsupported Veilmi message version.")

    if kdf != VEILMI_KDF:
        raise VeilmiValidationError(
            "Unsupported Veilmi key derivation function."
        )

    if iterations not in SUPPORTED_PBKDF2_ITERATIONS:
        raise VeilmiValidationError(
            "Unsupported Veilmi PBKDF2 iteration count."
        )

    salt = _decode_base64url(salt_value, "s")
    nonce = _decode_base64url(nonce_value, "n")
    ciphertext = _decode_base64url(ciphertext_value, "c")
    mac = _decode_base64url(mac_value, "m")

    if len(salt) != SALT_LENGTH:
        raise VeilmiValidationError("Invalid Veilmi salt length.")

    if len(nonce) != NONCE_LENGTH:
        raise VeilmiValidationError("Invalid Veilmi nonce length.")

    if len(mac) != MAC_LENGTH:
        raise VeilmiValidationError("Invalid Veilmi authentication tag length.")

    if not ciphertext:
        raise VeilmiValidationError("Ciphertext must not be empty.")


def is_valid_veilmi_message(encoded_message: str) -> bool:
    """Return True when the message passes Veilmi format validation."""
    try:
        validate_veilmi_message(encoded_message)
        return True
    except VeilmiValidationError:
        return False
