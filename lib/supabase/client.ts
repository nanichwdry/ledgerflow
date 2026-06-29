import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const isMock =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('mock-project');

  if (isMock) {
    return {
      auth: {
        signOut: async () => {
          document.cookie = 'mock-user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          return { error: null };
        },
        getUser: async () => {
          const match = document.cookie.match(/(^| )mock-user=([^;]+)/);
          if (match) {
            const email = decodeURIComponent(match[2]);
            const id = 'mock-user-' + email.replace(/[^a-zA-Z0-9]/g, '');
            return { data: { user: { id, email } }, error: null };
          }
          return { data: { user: null }, error: new Error('No mock session') };
        }
      }
    } as any;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

