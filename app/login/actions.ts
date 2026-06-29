'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { IS_MOCK_MODE } from '@/lib/env';
import { cookies } from 'next/headers';

export async function signIn(formData: FormData) {
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect('/dashboard');
}

export async function signUp(formData: FormData) {
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  const supabase = createClient();

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  
  if (IS_MOCK_MODE) {
    redirect('/dashboard');
  } else {
    redirect('/login?notice=Check your email to confirm your account.');
  }
}

export async function signInWithGoogle() {
  if (IS_MOCK_MODE) {
    const cookieStore = cookies();
    cookieStore.set('mock-user', encodeURIComponent('google-user@gmail.com'), { path: '/' });
    redirect('/dashboard');
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/callback`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  
  if (data?.url) {
    redirect(data.url);
  }
}


