// Custom error class that remembers which pipeline step failed.
// Used so the handler can return the correct HTTP status + message.
export class VerificationError extends Error {
  constructor(step, message, details = {}) {
    super(message);
    this.name = 'VerificationError';
    this.step = step;            // e.g. 'blockchain', 'bundleHash', 'signature'
    this.details = details;      // optional extra info (expected vs got, etc.)
  }
}