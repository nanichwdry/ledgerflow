import { importJWK, jwtVerify, decodeProtectedHeader } from 'jose';
import crypto from 'crypto';
import { plaidClient } from '@/lib/plaid';

const keyCache = new Map<string, { jwk: any; expiresAt: number }>();

async function getVerificationKey(kid: string) {
  const cached = keyCache.get(kid);
  if (cached && cached.expiresAt > Date.now()) return cached.jwk;

  const res = await plaidClient.webhookVerificationKeyGet({ key_id: kid });
  const jwk = res.data.key;
  keyCache.set(kid, { jwk, expiresAt: Date.now() + 1000 * 60 * 60 }); // Plaid keys rotate rarely
  return jwk;
}

/**
 * Validates the `Plaid-Verification` JWT header against Plaid's published
 * signing key, then checks its embedded body hash matches the raw request
 * body — this is what stops a forged webhook from triggering a fake sync.
 */
export async function verifyPlaidWebhook(rawBody: string, jwtHeader: string | null) {
  if (!jwtHeader) return false;
  try {
    const { kid } = decodeProtectedHeader(jwtHeader);
    if (!kid) return false;

    const jwk = await getVerificationKey(kid);
    const key = await importJWK(jwk, 'ES256');
    const { payload } = await jwtVerify(jwtHeader, key, { maxTokenAge: '5 min' });

    const expectedHash = crypto.createHash('sha256').update(rawBody).digest('hex');
    return payload.request_body_sha256 === expectedHash;
  } catch (err) {
    console.error('Plaid webhook verification failed', err);
    return false;
  }
}
