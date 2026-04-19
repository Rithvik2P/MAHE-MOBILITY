import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { VerificationError } from './errors.js';
import { callPython } from './pythonBridge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAR_PRIVATE_KEY_PATH = path.resolve(__dirname, '..', 'keys', 'car', 'car_private.key');

/**
 * Step 4: Decrypt the firmware.
 *   a) ML-KEM decapsulate the wrapped key blob → shared secret → AES key
 *   b) AES-256-GCM decrypt using nonce + ciphertext + tag
 *
 * All crypto happens in one Python subprocess (decap_key.py).
 */
export async function decryptFirmware(bundleEntries) {
  console.log('  🔓 [Step 4] Decryption (via Python)');

  const carPrivKey = fs.readFileSync(CAR_PRIVATE_KEY_PATH);

  // Reconstruct the wrapped key blob from aeskey.bin (contains kem_ct || wrapped_key)
  const wrappedKeyBlob = bundleEntries['aeskey.bin'];

  // Reconstruct encryptedFirmware blob = nonce || ciphertext || tag
  const encryptedFirmware = Buffer.concat([
    bundleEntries['nonce.bin'],
    bundleEntries['ciphertext.enc'],
    bundleEntries['tag.bin'],
  ]);

  console.log(`       wrapped key blob:  ${wrappedKeyBlob.length} bytes`);
  console.log(`       encrypted fw:      ${encryptedFirmware.length} bytes`);

  const { stdout, stderr, exitCode } = await callPython('decap_key.py', [
    carPrivKey,
    wrappedKeyBlob,
    encryptedFirmware,
  ]);

  if (exitCode !== 0) {
    throw new VerificationError(
      'decrypt',
      `Python decrypt failed: ${stderr.trim() || 'unknown error'}`
    );
  }

  const plaintext = stdout;
  console.log(`       ✅ firmware decrypted: ${plaintext.length} bytes`);
  return { plaintextFirmware: plaintext };
}