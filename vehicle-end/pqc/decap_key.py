"""
ML-KEM-768 key decapsulation helper.

Invoked as a subprocess by Node. Reads two length-prefixed binary blobs from
stdin, decapsulates using the car's private key, writes the resulting shared
secret to stdout as raw bytes.

Input framing (little-endian uint32 lengths):
    [4 bytes: private_key_len][private_key_bytes]
    [4 bytes: kem_ciphertext_len][kem_ciphertext_bytes]

Output: raw shared_secret bytes on stdout (32 bytes for ML-KEM-768)

Exit codes:
    0 — success (stdout contains the shared secret)
    1 — framing or decap error (stderr has details)
"""

import sys
import struct
import oqs


def read_exact(stream, n: int) -> bytes:
    buf = b""
    while len(buf) < n:
        chunk = stream.read(n - len(buf))
        if not chunk:
            raise EOFError(f"unexpected EOF: wanted {n}, got {len(buf)}")
        buf += chunk
    return buf


def read_blob(stream) -> bytes:
    (length,) = struct.unpack("<I", read_exact(stream, 4))
    return read_exact(stream, length)


def main() -> int:
    try:
        private_key = read_blob(sys.stdin.buffer)
        kem_ciphertext = read_blob(sys.stdin.buffer)
    except Exception as e:
        print(f"framing error: {e}", file=sys.stderr)
        return 1

    try:
        with oqs.KeyEncapsulation("ML-KEM-768", secret_key=private_key) as kem:
            shared_secret = kem.decap_secret(kem_ciphertext)
    except Exception as e:
        print(f"decap error: {e}", file=sys.stderr)
        return 1

    sys.stdout.buffer.write(shared_secret)
    sys.stdout.flush()
    return 0


if __name__ == "__main__":
    sys.exit(main())