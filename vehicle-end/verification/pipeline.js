import AdmZip from 'adm-zip';
import { checkBlockchain } from './blockchain.js';
import { checkBundleHash } from './bundleHash.js';
import { checkSignature } from './signature.js';
import { decryptFirmware } from './decrypt.js';
import { VerificationError } from './errors.js';

/**
 * Run the full update verification pipeline.
 *
 * Order matters — cheaper checks first, decryption last so we never
 * decrypt unauthenticated ciphertext.
 *
 * Throws VerificationError on any failure.
 * Returns the decrypted firmware on success.
 */
export async function runPipeline({ manifest, bundleBuffer, installedVersion }) {
  console.log('\n🔍 Starting verification pipeline...');

  // Step 1: Blockchain + rollback check
  await checkBlockchain(manifest, installedVersion);

  // Step 2: Bundle hash check (real)
  await checkBundleHash(bundleBuffer, manifest);

  // Unpack the zip once — all remaining steps need its contents
  const bundleEntries = unpackBundle(bundleBuffer);

  // Step 3: ML-DSA signature verify
  await checkSignature(manifest, bundleEntries);

  // Step 4: Decrypt
  const { plaintextFirmware } = await decryptFirmware(bundleEntries);

  console.log('🎉 All checks passed\n');
  return { plaintextFirmware };
}

/**
 * Extract the three files we expect inside the bundle zip.
 * Returns a map: { signature: Buffer, wrappedKey: Buffer, encryptedFirmware: Buffer }
 */
function unpackBundle(bundleBuffer) {
  const zip = new AdmZip(bundleBuffer);

  console.log('DEBUG zip contents:');

  const allEntries = zip.getEntries();
  allEntries.forEach(e => {
    console.log(`  "${e.entryName}" (${e.header.size} bytes)`);
  });

  const required = ['signature.sig', 'aeskey.bin', 'nonce.bin', 'ciphertext.enc', 'tag.bin'];
  const entries = {};

  for (const name of required) {
    // const entry = zip.getEntry(name);
    const entry = allEntries.find(e => {
      const basename = e.entryName.split('/').pop().trim();
      return basename === name;
    });
    if (!entry) {
     throw new VerificationError(
        'bundleStructure',
        `Bundle is missing required file: ${name}`
       ); 
    }
    entries[name] = entry.getData();
  }
  return entries;
}