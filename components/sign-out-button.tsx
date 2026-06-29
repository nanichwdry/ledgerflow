'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
      }}
      className="mt-1 text-xs text-paper/50 underline-offset-2 hover:text-brass hover:underline"
    >
      Sign out
    </button>
  );
}
