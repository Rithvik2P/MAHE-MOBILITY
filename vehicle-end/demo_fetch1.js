import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

// --- Config ---
const OEM_MANIFEST_URL = 'http://10.198.247.254:3000/getmanifest';
const OEM_BUNDLE_URL   = 'http://10.198.247.254:3000/getbundle';
const RPC_URL          = 'http://10.198.247.164:8545/';
const CONTRACT_ADDRESS = '0x5fbdb2315678afecb367f032d93f642f64180aa3';
const ABI = [
  'function getHash(string memory version) public view returns (string memory)',
  'function getLatestVersion() public view returns (string memory)',
];
// --- Mock mode for offline testing ---
const MOCK_CHAIN = process.env.MOCK_CHAIN === '1';
// --- Persistent state paths ---
const INSTALL_DIR = './installed';
const VERSION_FILE = path.join(INSTALL_DIR, 'version.txt');
const FIRMWARE_FILE = path.join(INSTALL_DIR, 'firmware.bin');
const DOWNLOADED_ZIP = './firmwareNew.zip';

// --- Helpers for persistent version tracking ---
function loadInstalledVersion() {
  try {
    if (fs.existsSync(VERSION_FILE)) {
      const raw = fs.readFileSync(VERSION_FILE, 'utf-8').trim();
      const v = parseInt(raw, 10);
      if (!isNaN(v)) return v;
    }
  } catch (_) {}
  return 0;
}

function saveInstalledVersion(version) {
  if (!fs.existsSync(INSTALL_DIR)) fs.mkdirSync(INSTALL_DIR, { recursive: true });
  fs.writeFileSync(VERSION_FILE, String(version));
}

async function main() {
  const installedVersion = loadInstalledVersion();
  console.log(`\n🚗 Car starting up. Currently installed: v${installedVersion}`);

  // ===== 1. FETCH MANIFEST =====
  console.log('\n📡 [1/4] Fetching manifest from OEM...');
  console.log(`        URL: ${OEM_MANIFEST_URL}`);

  let manifest;
  try {
    const res = await fetch(OEM_MANIFEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    manifest = await res.json();
    console.log('        📄 Received:', manifest);
  } catch (err) {
    console.error(`        ❌ Failed to reach OEM: ${err.message}`);
    return;
  }

  if (!manifest.version || !manifest.bundleHash || manifest.bundleHash === 'null') {
    console.error("        ❌ Manifest incomplete — OEM hasn't published yet");
    return;
  }

  // ===== 2. VERIFY AGAINST BLOCKCHAIN =====
  console.log('\n🔗 [2/4] Checking hash against blockchain...');
  if (MOCK_CHAIN) {
    console.log('        ⚠️  MOCK_CHAIN=1 — skipping real blockchain check');
    console.log(`        manifest hash: ${manifest.bundleHash}`);
    console.log('        ✅ (mocked) Hashes match — manifest is authentic');
  } else {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  let onchainHash;
  try {
    onchainHash = await contract.getHash(String(manifest.version));
  } catch (err) {
    console.error(`        ❌ Blockchain query failed: ${err.message}`);
    return;
  }

  console.log(`        manifest hash: ${manifest.bundleHash}`);
  console.log(`        on-chain hash: ${onchainHash || '(empty)'}`);

  if (!onchainHash) {
    console.error(`        ❌ No on-chain record for version ${manifest.version}`);
    return;
  }
  if (onchainHash !== manifest.bundleHash) {
    console.error('        ❌ HASH MISMATCH — possible tampering detected!');
    return;
  }
  console.log('        ✅ Hashes match — manifest is authentic');

  // ===== 3. DOWNLOAD BUNDLE =====
  console.log('\n📦 [3/4] Downloading bundle...');
  console.log(`        URL: ${OEM_BUNDLE_URL}`); }

  try {
    async function downloadFile() {
      console.log("        Starting download...");
      const response = await fetch(OEM_BUNDLE_URL);
      if (!response.ok) throw new Error(`Unexpected response ${response.statusText}`);
      const fileStream = fs.createWriteStream(DOWNLOADED_ZIP);
      await finished(Readable.fromWeb(response.body).pipe(fileStream));
      console.log(`        ✅ Download complete! Saved to: ${DOWNLOADED_ZIP}`);
    }
    await downloadFile();
  } catch (err) {
    console.error(`        ❌ Failed to fetch bundle: ${err.message}`);
    return;
  }

  // ===== 4. VERIFY + DECRYPT + INSTALL =====
  console.log('\n🔐 [4/4] Running verification pipeline...');

  const { runPipeline } = await import('./verification/pipeline.js');
  const { VerificationError } = await import('./verification/errors.js');

  const bundleBuffer = fs.readFileSync(DOWNLOADED_ZIP);

  console.log('DEBUG bundleBuffer:');
console.log(`  path: ${DOWNLOADED_ZIP}`);
console.log(`  length: ${bundleBuffer.length} bytes`);
console.log(`  isBuffer: ${Buffer.isBuffer(bundleBuffer)}`);
console.log(`  first 4 bytes (hex): ${bundleBuffer.subarray(0, 4).toString('hex')}`);
console.log(`  first 4 bytes (ascii): ${JSON.stringify(bundleBuffer.subarray(0, 4).toString('binary'))}`);

  try {
    const { plaintextFirmware } = await runPipeline({
      manifest,
      bundleBuffer,
      installedVersion,
    });

    // Pipeline passed → persist the install
    if (!fs.existsSync(INSTALL_DIR)) fs.mkdirSync(INSTALL_DIR, { recursive: true });
    fs.writeFileSync(FIRMWARE_FILE, plaintextFirmware);
    saveInstalledVersion(manifest.version);

    console.log(`\n🎉 UPDATE INSTALLED`);
    console.log(`   version:  v${installedVersion} → v${manifest.version}`);
    console.log(`   firmware: ${FIRMWARE_FILE} (${plaintextFirmware.length} bytes)`);
  } catch (err) {
    if (err instanceof VerificationError) {
      console.error(`\n❌ REJECTED at step [${err.step}]`);
      console.error(`   ${err.message}`);
      if (err.details) console.error(`   details:`, err.details);
    } else {
      console.error('\n❌ Unexpected error:', err);
    }
  }
}

main();