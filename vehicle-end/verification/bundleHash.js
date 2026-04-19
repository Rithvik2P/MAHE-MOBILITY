import crypto from 'crypto';
import { VerificationError } from './errors.js';

/**
 * Step 2: Compute SHA-256 of received bundle bytes and compare to the
 * hash declared in the manifest. If they match, the manifest's hash is
 * authenticated (by the blockchain, step 1) and the bundle hasn't been
 * tampered with in transit.
 */
export async function checkBundleHash(bundleBuffer, manifest) {
  const computedHash = crypto
    .createHash('sha256')
    .update(bundleBuffer)
    .digest('hex');

  console.log(`  #️⃣  [Step 2] Bundle hash check`);
  console.log(`       expected: ${manifest.bundleHash}`);
  console.log(`       computed: ${computedHash}`);

  if (computedHash !== manifest.bundleHash) {
    throw new VerificationError(
      'bundleHash',
      'Bundle hash does not match manifest',
      { expected: manifest.bundleHash, computed: computedHash }
    );
  }

  console.log('       ✅ match');
  return { bundleHash: computedHash };
}