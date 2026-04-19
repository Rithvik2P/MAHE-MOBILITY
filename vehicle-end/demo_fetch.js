import { ethers } from 'ethers';
import fs from 'fs';
import  { Readable } from 'stream';
import  { finished } from  'stream/promises';

// --- Config ---
const OEM_MANIFEST_URL = 'http://10.198.247.254:3000/getmanifest';
const OEM_BUNDLE_URL   = 'http://10.198.247.254:3000/getbundle';  // may not exist yet
const RPC_URL          = 'http://10.198.247.164:8545/';
const CONTRACT_ADDRESS = '0x5fbdb2315678afecb367f032d93f642f64180aa3';
const ABI = [
  'function getHash(string memory version) public view returns (string memory)',
  'function getLatestVersion() public view returns (string memory)',
];

async function main() {
  // ===== 1. FETCH MANIFEST FROM TANMAY =====
  console.log('\n📡 [1/3] Fetching manifest from OEM...');
  console.log(`        URL: ${OEM_MANIFEST_URL}`);

  let manifest;
  try {
    const res = await fetch(OEM_MANIFEST_URL, { method: 'POST' , headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    manifest = await res.json();
    console.log('        📄 Received:', manifest);
  } catch (err) {
    console.error(`        ❌ Failed to reach OEM: ${err.message}`);
    return;
  }

  if (!manifest.version || !manifest.bundleHash || manifest.bundleHash === 'null') {
    console.error('        ❌ Manifest incomplete — OEM hasn\'t published a real version yet');
    return;
  }

  // ===== 2. VERIFY AGAINST BLOCKCHAIN =====
  console.log('\n🔗 [2/3] Checking hash against blockchain...');
  console.log(`        RPC: ${RPC_URL}`);

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

  if (!onchainHash || onchainHash === '') {
    console.error(`        ❌ No on-chain record for version ${manifest.version}`);
    return;
  }

  if (onchainHash !== manifest.bundleHash) {
    console.error('        ❌ HASH MISMATCH — possible tampering detected!');
    console.error('        Manifest hash does not match the blockchain. Aborting.');
    return;
  }

  console.log('        ✅ Hashes match — manifest is authentic\n');

  // ===== 3. FETCH BUNDLE =====
  console.log('📦 [3/3] Manifest verified. Requesting bundle...');
  console.log(`        URL: ${OEM_BUNDLE_URL}`);
  const destination = "./firmware.zip";

  try {
    // Machine 3: vehicle-client.js


async function downloadFile() {
    const url = "http://10.198.247.254:3000/getbundle";
    const destination = "./firmwareNew.zip";

    console.log("Starting download...");
    const response = await fetch(url);

    if (!response.ok) throw new Error(`Unexpected response ${response.statusText}`);

    const fileStream = fs.createWriteStream(destination);
    
    await finished(Readable.fromWeb(response.body).pipe(fileStream));

    console.log("✅ Download complete! Saved to:", destination);
}

await downloadFile();
  } catch (err) {
    console.error(`        ❌ Failed to fetch bundle: ${err.message}`);
  }
}

main();