"""
Mock OEM update generator.

Simulates what Tanmay's OEM server will eventually do: take a firmware file,
encrypt it, sign it, and produce (manifest.json + bundle.zip) ready to POST
to the vehicle's /manifest and /bundle endpoints.

Usage:
    python3 pqc/mock_oem.py [version]

Example:
    python3 pqc/mock_oem.py 42
"""

import hashlib
import json
import sys
import zipfile
import struct
from pathlib import Path
from io import BytesIO

import oqs
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os

# ---------------- Paths ----------------
ROOT = Path(__file__).parent.parent
KEYS_DIR = ROOT / "keys"
OUT_DIR = ROOT / "mock_output"
FIRMWARE_FILE = ROOT / "firmware.bin"

FIRMWARE_ID = "brake-ecu"


# ---------------- The shared signed-message format ----------------
# MUST match exactly what the car-side buildSignedMessage function produces.
# Format: [4 bytes BE: version][N bytes: firmwareId UTF-8][32 bytes: SHA-256 of encrypted firmware]
def build_signed_message(version: int, encrypted_firmware: bytes) -> bytes:
    version_bytes = struct.pack(">I", version)
    hash_bytes = hashlib.sha256(encrypted_firmware).digest()
    return version_bytes + hash_bytes

def main():
    version = int(sys.argv[1]) if len(sys.argv) > 1 else 42

    print("=" * 60)
    print(f"Mock OEM: building update for {FIRMWARE_ID} v{version}")
    print("=" * 60)

    OUT_DIR.mkdir(exist_ok=True)

    # --- 1. Load firmware + keys ---
    firmware = FIRMWARE_FILE.read_bytes()
    oem_private_key = (KEYS_DIR / "oem" / "oem_private.key").read_bytes()
    car_public_key = (KEYS_DIR / "car" / "car_public.key").read_bytes()
    print(f"\n📄 Firmware:        {len(firmware)} bytes")

    # --- 2. Generate a fresh AES-256 key ---
    aes_key = os.urandom(32)       # 256 bits
    iv = os.urandom(12)            # 96-bit nonce for GCM
    print(f"🔑 AES key:          {len(aes_key)} bytes (freshly generated)")

    # --- 3. Encrypt the firmware with AES-256-GCM ---
    # GCM output = ciphertext || auth_tag. The `cryptography` lib appends the tag automatically.
    aesgcm = AESGCM(aes_key)
    encrypted_firmware = iv + aesgcm.encrypt(iv, firmware, associated_data=None)
    print(f"🔒 Encrypted firmware: {len(encrypted_firmware)} bytes  (IV prepended)")

    # --- 4. Wrap the AES key using ML-KEM with the car's public key ---
    # ML-KEM's encapsulate returns (ciphertext, shared_secret).
    # The shared_secret is what both sides derive; we XOR our AES key with it so the car
    # can recover our AES key after decapsulation.
    #
    # NOTE: This is a simplified wrapping scheme for the hackathon. Production systems use
    # proper KEM-DEM constructs. Good enough for your demo; mention this caveat if asked.
    with oqs.KeyEncapsulation("ML-KEM-768") as kem:
        kem_ciphertext, shared_secret = kem.encap_secret(car_public_key)

    # Derive a 32-byte wrapping key from shared_secret (SHAKE/SHA-256 to be safe about length)
    wrap_key = hashlib.sha256(shared_secret).digest()
    wrapped_aes_key = bytes(a ^ b for a, b in zip(aes_key, wrap_key))

    # Payload to send: kem_ciphertext || wrapped_aes_key
    wrapped_key_blob = kem_ciphertext + wrapped_aes_key
    print(f"📦 KEM ciphertext:   {len(kem_ciphertext)} bytes")
    print(f"📦 Wrapped AES key:  {len(wrapped_key_blob)} bytes total")

    # --- 5. Build and sign the message ---
    message = build_signed_message(version, encrypted_firmware)
    print(f"📝 Message to sign:  {len(message)} bytes")

    with oqs.Signature("ML-DSA-65", secret_key=oem_private_key) as signer:
        signature = signer.sign(message)
    print(f"✍️  Signature:        {len(signature)} bytes")

    # --- 6. Build the bundle (zip of 3 files) ---
    bundle_buf = BytesIO()
    with zipfile.ZipFile(bundle_buf, "w", zipfile.ZIP_STORED) as z:
        z.writestr("signature", signature)
        z.writestr("wrappedKey", wrapped_key_blob)
        z.writestr("encryptedFirmware", encrypted_firmware)
    bundle_bytes = bundle_buf.getvalue()
    bundle_hash = hashlib.sha256(bundle_bytes).hexdigest()
    print(f"\n🗂  Bundle (zip):    {len(bundle_bytes)} bytes")
    print(f"#️⃣  Bundle SHA-256:  {bundle_hash}")

    # --- 7. Build the manifest ---
    manifest = {
    "version": version,
    "bundleHash": bundle_hash,
}

    # --- 8. Write outputs ---
    manifest_path = OUT_DIR / "manifest.json"
    bundle_path = OUT_DIR / "bundle.zip"
    manifest_path.write_text(json.dumps(manifest, indent=2))
    bundle_path.write_bytes(bundle_bytes)

    print(f"\n✅ Wrote: {manifest_path.relative_to(ROOT)}")
    print(f"✅ Wrote: {bundle_path.relative_to(ROOT)}")

    # --- 9. Print curl commands for convenience ---
    print("\n" + "=" * 60)
    print("Test against the car server:")
    print("=" * 60)
    print(f"""
curl -X POST http://localhost:3000/manifest \\
  -H "Content-Type: application/json" \\
  -d @{manifest_path}

curl -X POST http://localhost:3000/bundle \\
  -F "bundle=@{bundle_path}"
""")


if __name__ == "__main__":
    main()