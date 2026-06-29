'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { IS_MOCK_MODE } from '@/lib/env';

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

