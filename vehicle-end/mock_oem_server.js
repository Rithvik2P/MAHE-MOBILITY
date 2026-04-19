import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 4000;

const MANIFEST_PATH = './mock_output/manifest.json';
const BUNDLE_PATH   = './mock_output/bundle.zip';

app.post('/getmanifest', (req, res) => {
  console.log('→ manifest requested');
  if (!fs.existsSync(MANIFEST_PATH)) {
    return res.status(404).json({ error: 'Run mock_oem.py first' });
  }
  res.json(JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')));
});

app.get('/getbundle', (req, res) => {
  console.log('→ bundle requested');
  if (!fs.existsSync(BUNDLE_PATH)) {
    return res.status(404).send('Run mock_oem.py first');
  }
  res.sendFile(path.resolve(BUNDLE_PATH));
});

app.listen(PORT, () => {
  console.log(`Mock OEM server listening on http://localhost:${PORT}`);
});