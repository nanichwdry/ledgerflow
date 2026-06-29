import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { assertEnv, IS_MOCK_MODE } from '@/lib/env';

export async function updateSession(request: NextRequest) {
  assertEnv();
  let response = NextResponse.next({ request });

  let user = null;

  if (IS_MOCK_MODE) {
    const cookie = request.cookies.get('mock-user');
    if (cookie && cookie.value) {
      const email = decodeURIComponent(cookie.value);
      const id = 'mock-user-' + email.replace(/[^a-zA-Z0-9]/g, '');
      user = { id, email };
    }
  } else {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return response;
}

