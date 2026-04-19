import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import AdmZip from 'adm-zip';
import { runPipeline } from './verification/pipeline.js';
import { VerificationError } from './verification/errors.js';

const app = express();
const PORT = 3000;

const upload = multer({ storage: multer.memoryStorage() });

// The single piece of state: the manifest that passed blockchain check
// and is waiting for its bundle. Null if no update is pending.
let pendingManifest = null;
let installedVersion = 0;

// Health check
app.get('/', (req, res) => {
  res.send('Car server is alive 🚗');
});

// -------------------------------------------------------------------
// Step 1: OEM sends manifest.
// Car checks blockchain (stubbed for now), stores it as pending.
// -------------------------------------------------------------------
app.post('/manifest', express.json(), (req, res) => {
  console.log('\n====== /manifest request received ======');
  const manifest = req.body;

  if (manifest?.version === undefined || !manifest?.bundleHash) {
  console.log('❌ Manifest missing required fields');
  return res.status(400).json({ error: 'Manifest must have version and bundleHash' });
}

  console.log('📄 Manifest:', manifest);
  console.log('⚠️  Blockchain check stubbed — accepting for now');

  if (pendingManifest) {
    console.log(`ℹ️  Replacing previous pending manifest (${pendingManifest.firmwareId} v${pendingManifest.version})`);
  }
  pendingManifest = manifest;

  console.log(`✅ Manifest accepted. Awaiting bundle for v${manifest.version}`);
  res.json({ status: 'ok', message: 'Manifest accepted, send bundle next' });
});

// -------------------------------------------------------------------
// Step 2: OEM sends the bundle.
// Runs the verification pipeline. Each step can reject with a specific error.
// -------------------------------------------------------------------
app.post('/bundle', upload.single('bundle'), async (req, res) => {
  console.log('\n====== /bundle request received ======');

  if (!pendingManifest) {
    console.log('❌ No pending manifest — bundle rejected');
    return res.status(400).json({ error: 'No pending manifest. Send /manifest first.' });
  }
  if (!req.file) {
    console.log('❌ No bundle in request');
    return res.status(400).json({ error: 'Bundle file required' });
  }

  const manifest = pendingManifest;
  const bundleBuffer = req.file.buffer;
  console.log(`📄 Using pending manifest: v${manifest.version}`);
  console.log(`📦 Bundle: ${bundleBuffer.length} bytes`);

  try {
    const { plaintextFirmware } = await runPipeline({
      manifest,
      bundleBuffer,
      installedVersion,
    });

    // "Install": write firmware to installed/ and update version counter
    const installedDir = path.resolve('installed');
    if (!fs.existsSync(installedDir)) fs.mkdirSync(installedDir, { recursive: true });
    const installPath = path.join(installedDir, 'firmware.bin');
    fs.writeFileSync(installPath, plaintextFirmware);

    installedVersion = manifest.version;
    pendingManifest = null;

    console.log(`📥 Installed v${installedVersion} → ${installPath} (${plaintextFirmware.length} bytes)`);

    res.json({
      status: 'installed',
      version: installedVersion,
      path: installPath,
      firmwareBytes: plaintextFirmware.length,
    });
  } catch (err) {
    pendingManifest = null;

    if (err instanceof VerificationError) {
      console.log(`❌ Rejected at step [${err.step}]: ${err.message}`);
      return res.status(400).json({
        error: err.message,
        step: err.step,
        details: err.details,
      });
    }

    console.error('❌ Unexpected error in pipeline:', err);
    res.status(500).json({ error: 'Internal error during verification' });
  }
});

app.listen(PORT, () => {
  console.log(`Car server listening on http://localhost:${PORT}`);
});