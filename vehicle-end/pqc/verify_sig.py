"""
ML-DSA-65 signature verifier.

Invoked as a subprocess by Node. Reads binary inputs from stdin with a small
length-prefixed framing scheme, verifies the signature, and writes exactly
"VALID\\n" or "INVALID\\n" to stdout.

Input framing (all little-endian uint32 lengths, then raw bytes):
    [4 bytes: pubkey_len][pubkey_bytes]
    [4 bytes: message_len][message_bytes]
    [4 bytes: signature_len][signature_bytes]

Exit codes:
    0 — completed (check stdout for VALID/INVALID)
    1 — framing or internal error (wrote details to stderr)
"""

import sys
import struct
import oqs


def read_exact(stream, n: int) -> bytes:
    """Read exactly n bytes from a binary stream, or raise if EOF hit early."""
    buf = b""
    while len(buf) < n:
        chunk = stream.read(n - len(buf))
        if not chunk:
            raise EOFError(f"unexpected EOF: wanted {n}, got {len(buf)}")
        buf += chunk
    return buf


def read_blob(stream) -> bytes:
    """Read a length-prefixed blob from the stream."""
    (length,) = struct.unpack("<I", read_exact(stream, 4))
    return read_exact(stream, length)


def main() -> int:
    try:
        pubkey = read_blob(sys.stdin.buffer)
        message = read_blob(sys.stdin.buffer)
        signature = read_blob(sys.stdin.buffer)
    except Exception as e:
        print(f"framing error: {e}", file=sys.stderr)
        return 1

    try:
        with oqs.Signature("ML-DSA-65") as verifier:
            valid = verifier.verify(message, signature, pubkey)
    except Exception as e:
        print(f"verify error: {e}", file=sys.stderr)
        return 1

    sys.stdout.write("VALID\n" if valid else "INVALID\n")
    sys.stdout.flush()
    return 0


if __name__ == "__main__":
    sys.exit(main())