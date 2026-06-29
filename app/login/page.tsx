import { signIn, signUp } from './actions';
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

        <div className="rounded-sm border border-rule bg-surface p-6 shadow-ledger">
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
        </div>
      </div>
    </main>
  );
}
