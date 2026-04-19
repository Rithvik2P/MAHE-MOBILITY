import { VerificationError } from './errors.js';


 
export async function checkBlockchain(manifest, installedVersion) {
  console.log('  🔗 [Step 1] Rollback guard');
  console.log(`       installed: v${installedVersion}`);
  console.log(`       requested: v${manifest.version}`);

  if (manifest.version <= installedVersion) {
    throw new VerificationError(
      'blockchain',
      'Rollback attempt: version is not newer than installed',
      { installedVersion, attemptedVersion: manifest.version }
    );
  }

  console.log('       ✅ version is newer — proceeding');
  return { ok: true };
}