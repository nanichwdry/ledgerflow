import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { assertEnv, IS_MOCK_MODE } from '@/lib/env';

export function createClient() {
  assertEnv();
  const cookieStore = cookies();

  if (IS_MOCK_MODE) {
    return {
      auth: {
        getUser: async () => {
          const cookie = cookieStore.get('mock-user');
          if (cookie && cookie.value) {
            const email = decodeURIComponent(cookie.value);
            const id = 'mock-user-' + email.replace(/[^a-zA-Z0-9]/g, '');
            return { data: { user: { id, email } }, error: null };
          }
          return { data: { user: null }, error: new Error('No mock session') };
        },
        signInWithPassword: async ({ email }: { email: string }) => {
          cookieStore.set('mock-user', encodeURIComponent(email), { path: '/' });
          return { data: { user: { id: 'mock-user-' + email.replace(/[^a-zA-Z0-9]/g, ''), email } }, error: null };
        },
        signUp: async ({ email }: { email: string }) => {
          cookieStore.set('mock-user', encodeURIComponent(email), { path: '/' });
          return { data: { user: { id: 'mock-user-' + email.replace(/[^a-zA-Z0-9]/g, ''), email } }, error: null };
        },
        signOut: async () => {
          cookieStore.delete('mock-user');
          return { error: null };
        }
      },
      storage: {
        from: (bucket: string) => ({
          upload: async (path: string, file: Buffer, options: any) => {
            return { data: { path }, error: null };
          },
          createSignedUrl: async (storagePath: string, expiresIn: number) => {
            return { data: { signedUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500&auto=format&fit=crop&q=60' }, error: null };
          }
        })
      }
    } as any;
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — middleware refreshes the session instead.
          }
        },
      },
    }
  );
}

// Resolves the current user's Organization, creating one (with a default chart
// of accounts) on first sign-in, or attaching them to an org they were
// invited to or already belong to. Existing call sites are unaffected — this
// keeps returning a plain Organization, just resolved through Membership now.
export async function getOrCreateOrganization() {
  const membership = await getCurrentMembership();
  return membership?.organization ?? null;
}

/** Like getOrCreateOrganization, but also returns the caller's role — use this for anything permission-gated. */
export async function getCurrentMembership() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { resolveMembership } = await import('@/lib/membership');
  return resolveMembership({ id: data.user.id, email: data.user.email });
}

