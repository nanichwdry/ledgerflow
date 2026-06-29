import { signIn, signUp, signInWithGoogle } from './actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; notice?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center gap-[3px]">
            <span className="block h-[2px] w-6 self-center bg-brass" />
          </div>
          <h1 className="font-display text-3xl italic tracking-tight text-ink">LedgerFlow</h1>
          <p className="mt-1 text-sm text-ink-soft">Books that balance themselves.</p>
        </div>

        <div className="rounded-sm border border-rule bg-surface p-6 shadow-ledger space-y-4">
          <form action={signIn} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
                Email
              </label>
              <Input type="email" name="email" required autoComplete="email" />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
                Password
              </label>
              <Input type="password" name="password" required autoComplete="current-password" />
            </div>

            {searchParams.error && (
              <p className="text-sm text-debit">{searchParams.error}</p>
            )}
            {searchParams.notice && (
              <p className="text-sm text-credit">{searchParams.notice}</p>
            )}

            <Button type="submit" className="w-full">
              Sign in
            </Button>
            <Button type="submit" formAction={signUp} variant="secondary" className="w-full">
              Create an account
            </Button>
          </form>

          <div className="relative my-4 flex items-center justify-center">
            <span className="absolute w-full border-t border-rule" />
            <span className="relative bg-surface px-2 text-xs uppercase text-ink-soft">or</span>
          </div>

          <form action={signInWithGoogle}>
            <Button type="submit" variant="secondary" className="w-full flex items-center justify-center gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}

