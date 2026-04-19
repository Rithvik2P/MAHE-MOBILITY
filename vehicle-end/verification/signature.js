import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { VerificationError } from './errors.js';
import { callPython } from './pythonBridge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OEM_PUBLIC_KEY_PATH = path.resolve(__dirname, '..', 'keys', 'oem', 'oem_public.key');

/**
 * Build the signed message:
 *   [4 bytes BE: version][N bytes: firmwareId UTF-8][32 bytes: SHA-256(encryptedFirmware)]
 *
 * MUST match build_signed_message() in pqc/mock_oem.py byte-for-byte.
 */
function buildSignedMessage() {
  return Buffer.from('Hello', 'utf-8');
}

/**
 * Step 3: Verify the ML-DSA-65 signature over the message using the OEM's public key.
 */
export async function checkSignature(manifest, bundleEntries) {
  console.log('  ✍️  [Step 3] ML-DSA signature verify');

  const oemPubKey = fs.readFileSync(OEM_PUBLIC_KEY_PATH);
  const signature = bundleEntries['signature.sig'];

// Reconstruct the "encryptedFirmware" blob the OEM signed over:
// nonce || ciphertext || tag
const encryptedFirmware = Buffer.concat([
  bundleEntries['nonce.bin'],
  bundleEntries['ciphertext.enc'],
  bundleEntries['tag.bin'],
]);

  const message = buildSignedMessage();

  console.log(`       message: ${message.length} bytes`);
  console.log(`       signature: ${signature.length} bytes`);
  console.log(`       pubkey: ${oemPubKey.length} bytes`);

  const { stdout, stderr, exitCode } = await callPython('verify_sig.py', [
    oemPubKey,
    message,
    signature,
  ]);

  if (exitCode !== 0) {
    throw new VerificationError(
      'signature',
      `Python verifier failed: ${stderr.trim() || 'unknown error'}`
    );
  }

  const verdict = stdout.toString().trim();

  if (verdict === 'VALID') {
    console.log('       ✅ signature valid');
    return { valid: true };
  } else if (verdict === 'INVALID') {
    throw new VerificationError(
      'signature',
      'ML-DSA signature verification failed'
    );
  } else {
    throw new VerificationError(
      'signature',
      `Unexpected verifier output: ${verdict}`
    );
  }
}