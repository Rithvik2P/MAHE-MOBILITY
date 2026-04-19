"""
One-time keypair generation for the OTA update system.

Generates:
  - OEM ML-DSA-65 keypair (signing keys)
      → oem_private.key goes to Tanmay
      → oem_public.key stays on the car

  - Car ML-KEM-768 keypair (key-encapsulation keys)
      → car_public.key goes to Tanmay
      → car_private.key stays on the car

Run once at setup. Do NOT commit the generated keys to git.
"""

import oqs
from pathlib import Path


KEYS_DIR = Path(__file__).parent.parent / "keys"
OEM_DIR = KEYS_DIR / "oem"
CAR_DIR = KEYS_DIR / "car"


def write_key(path: Path, data: bytes, label: str):
    """Write bytes to a file and print a short confirmation."""
    path.write_bytes(data)
    print(f"  ✅ {label:25} → {path.relative_to(KEYS_DIR.parent)}  ({len(data)} bytes)")


def generate_oem_signing_keys():
    """Generate the OEM's ML-DSA-65 keypair for signing firmware."""
    print("\n🔐 Generating OEM ML-DSA-65 keypair (signing)...")

    with oqs.Signature("ML-DSA-65") as signer:
        public_key = signer.generate_keypair()     # returns public key
        private_key = signer.export_secret_key()   # export private key

    write_key(OEM_DIR / "oem_public.key", public_key, "OEM public key")
    write_key(OEM_DIR / "oem_private.key", private_key, "OEM private key")


def generate_car_kem_keys():
    """Generate the car's ML-KEM-768 keypair for key encapsulation."""
    print("\n🔐 Generating Car ML-KEM-768 keypair (key encapsulation)...")

    with oqs.KeyEncapsulation("ML-KEM-768") as kem:
        public_key = kem.generate_keypair()
        private_key = kem.export_secret_key()

    write_key(CAR_DIR / "car_public.key", public_key, "Car public key")
    write_key(CAR_DIR / "car_private.key", private_key, "Car private key")


def main():
    # Ensure folders exist
    OEM_DIR.mkdir(parents=True, exist_ok=True)
    CAR_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("PQC Keypair Generation")
    print("=" * 60)

    generate_oem_signing_keys()
    generate_car_kem_keys()

    print("\n" + "=" * 60)
    print("✅ Done.")
    print()
    print("Distribute as follows:")
    print(f"  → Tanmay needs: keys/oem/oem_private.key + keys/car/car_public.key")
    print(f"  → Car keeps:    keys/oem/oem_public.key  + keys/car/car_private.key")
    print("=" * 60)


if __name__ == "__main__":
    main()