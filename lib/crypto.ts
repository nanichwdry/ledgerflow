import crypto from 'crypto';

// PLAID_TOKEN_ENCRYPTION_KEY must be a 32-byte key, hex-encoded (64 hex chars).
// Generate one with: openssl rand -hex 32
function getKey() {
  const hex = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'PLAID_TOKEN_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes). Generate one with `openssl rand -hex 32`.'
    );
  }
  return Buffer.from(hex, 'hex');
}

export function encrypt(plaintext: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

export function decrypt(payload: string) {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
