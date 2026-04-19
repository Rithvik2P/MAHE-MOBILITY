import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve absolute path to the pqc folder (needed because Node's cwd
// might differ from the project root when spawned)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PQC_DIR = path.resolve(__dirname, '..', 'pqc');

/**
 * Prepend a 4-byte little-endian length to a Buffer.
 * Format matches what verify_sig.py / decap_key.py expect on stdin.
 */
function frame(buf) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(buf.length, 0);
  return Buffer.concat([lenBuf, buf]);
}

/**
 * Spawn a Python script and communicate via stdin/stdout using length-prefixed binary framing.
 *
 * @param {string} scriptName  filename inside pqc/ (e.g. 'verify_sig.py')
 * @param {Buffer[]} inputs    array of Buffers to send as length-prefixed blobs
 * @returns {Promise<{stdout: Buffer, stderr: string, exitCode: number}>}
 */
export function callPython(scriptName, inputs) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(PQC_DIR, scriptName);
    const child = spawn('python3', [scriptPath]);

    const stdoutChunks = [];
    const stderrChunks = [];

    child.stdout.on('data', (chunk) => stdoutChunks.push(chunk));
    child.stderr.on('data', (chunk) => stderrChunks.push(chunk.toString()));

    child.on('error', reject);  // failed to spawn python3 at all

    child.on('close', (exitCode) => {
      resolve({
        stdout: Buffer.concat(stdoutChunks),
        stderr: stderrChunks.join(''),
        exitCode,
      });
    });

    // Write all inputs as framed blobs, then close stdin to signal EOF
    for (const input of inputs) {
      child.stdin.write(frame(input));
    }
    child.stdin.end();
  });
}