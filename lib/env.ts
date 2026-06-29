import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const IS_MOCK_MODE =
  !supabaseUrl ||
  supabaseUrl.includes('your-project.supabase.co') ||
  process.env.MOCK_MODE === 'true';

if (IS_MOCK_MODE) {
  process.env.NEXT_PUBLIC_SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project')
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : 'https://mock-project.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length >= 20
      ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      : 'mock-anon-key-placeholder-at-least-20-chars';
  process.env.PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID || 'mock-plaid-client-id';
  process.env.PLAID_SECRET = process.env.PLAID_SECRET || 'mock-plaid-secret';
  process.env.PLAID_TOKEN_ENCRYPTION_KEY =
    process.env.PLAID_TOKEN_ENCRYPTION_KEY && process.env.PLAID_TOKEN_ENCRYPTION_KEY.length === 64
      ? process.env.PLAID_TOKEN_ENCRYPTION_KEY
      : '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
}

// Required for the app to function at all. Optional integrations (Stripe,
// Resend, Plaid webhooks) are validated separately, closer to where they're
// used, since the app should run fine without them configured.
const requiredSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({ message: 'must be a full https:// URL' }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  DATABASE_URL: z.string().min(1).startsWith('postgres', {
    message: 'must be a postgresql:// connection string',
  }),
  PLAID_CLIENT_ID: z.string().min(1),
  PLAID_SECRET: z.string().min(1),
  PLAID_TOKEN_ENCRYPTION_KEY: z
    .string()
    .length(64, 'must be a 64-character hex string (32 bytes) — generate with `openssl rand -hex 32`'),
});

let validated = false;

/** Throws with a precise, actionable message on first call if any required env var is missing/malformed. */
export function assertEnv() {
  if (validated) return;
  const result = requiredSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `LedgerFlow is missing required environment variables:\n${issues}\n\nCopy .env.example to .env and fill these in.`
    );
  }
  validated = true;
}

