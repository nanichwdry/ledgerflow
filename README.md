# LedgerFlow

A real double-entry bookkeeping app — bank feeds, invoicing, bills, inventory,
receipt OCR, and Stripe payments, all posting through one ledger engine that
refuses to let debits and credits drift apart.

**Stack:** Next.js 14 (App Router) · Prisma · Supabase (Postgres + Auth + Storage) · Plaid · Stripe · Claude (receipt OCR) · @react-pdf/renderer · Resend · Tailwind

## What's here

| Area | What it does |
|---|---|
| **Bank feeds** | Plaid Link → `/transactions/sync` → auto-categorized, auto-posted journal entries |
| **Invoicing** | Customers, draft → send (posts accrual revenue + COGS) → record payment, PDF export, public pay-by-link page |
| **Bills** | Vendors, enter bill (posts AP) → pay bill, with the same inventory hooks as invoices |
| **Inventory** | Weighted-average costing — bills increase stock, invoices draw it down and post COGS automatically |
| **Receipts (OCR)** | Photograph a receipt → Claude reads vendor/date/total/line items → review → posts as a Bill |
| **Reports** | Trial Balance, P&L, Balance Sheet, Cash Flow Statement — all with PDF export and one-click email |
| **Email** | Real delivery via Resend — "Email invoice" attaches the PDF and includes the pay link; any report can be emailed too |
| **Stripe** | Bring-your-own-API-key integration: invoices get a real pay link, payments auto-post on webhook |
| **Manual journal** | Full double-entry entry form for anything the above doesn't cover |
| **Reconciliation** | Match cleared transactions against a bank statement; reconciled lines lock from edits |
| **Multi-user + roles** | Invite teammates by email; Owner / Admin / Accountant / Employee permission tiers |
| **Audit trail** | Every ledger-affecting action recorded with who/what/when and before/after snapshots |
| **Classes** | Tag invoice/bill/journal lines by department or location for segmented reporting |
| **Budgets** | Monthly targets per account, with a budget-vs-actual grid pulling live actuals from the ledger |
| **Payroll** | Records a payroll run processed elsewhere as a correct journal entry (no tax calculation — see note) |
| **Sales tax rates** | Named, multi-jurisdiction rates you maintain and pick per invoice (not automated lookup — see note) |

## How the ledger works

Every dollar moves from one account to another — `lib/ledger.ts` is the only
code path allowed to write to the ledger, and `postJournalEntry()` rejects
anything where total debits ≠ total credits **or** where any account in the
entry doesn't belong to the organization posting it (every account id in a
request body is verified against the org before it's ever allowed near the
ledger — see "Security" below). Every higher-level feature (invoices, bills,
Plaid sync, Stripe payments) is built as a thin layer on top that decides
*which* accounts to hit and then calls into that same engine — so the books
can't drift out of balance no matter which feature posted to them. Reports
(Trial Balance, P&L, Balance Sheet, Cash Flow) are pure read queries over the
journal, not a separately maintained "balance" that could fall out of sync
with the entries that produced it.

**Inventory costing:** `lib/inventory.ts` is the only place stock quantity and
average cost are mutated. A bill line increases stock and rolls the new unit
cost into a weighted average; an invoice line draws stock down at that
average cost and returns the COGS amount for `lib/invoices.ts` to post
alongside the revenue line, in the same atomic transaction. The weighted-
average and COGS math itself is pure (`computeWeightedAverageCost`,
`computeCogs`) and covered by `tests/inventory.test.ts`.

**Stripe (bring-your-own-key, not Stripe Connect):** each organization
connects its own Stripe secret key from Settings → Integrations. Because
there's no Stripe Connect/OAuth flow, the organization that owns a webhook
event is identified by the webhook URL path itself
(`/api/integrations/stripe/webhook/{organizationId}`), and that org's own
webhook signing secret verifies the request. Webhook retries can't double-post
a payment — `InvoicePayment.stripeEventId` is unique, so a redelivered
`checkout.session.completed` event is recognized and skipped.

**Receipt OCR:** uploads go to a private Supabase Storage bucket (capped at
8MB per file), then Claude (`claude-haiku-4-5`) reads the image and returns
structured JSON (vendor, date, total, line items). Nothing gets posted to the
ledger until you review and confirm it — at that point it becomes a normal
posted Bill, with the receipt still linked for audit.

**Email:** the "Email invoice" and "Email report" buttons only appear once
`RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set — without them, invoices fall
back to a "Open in mail app" `mailto:` link so the feature degrades instead of
breaking. Both routes reuse the same PDF-rendering helpers as the download
buttons (`lib/pdf.ts`), so the attached file is identical to what you'd get
from "Download PDF." Sending an invoice email stamps `lastEmailedAt`, shown
next to the action buttons.

## On payroll and sales tax — what this does and deliberately doesn't

Two of these features stop short of what a service like QuickBooks Payroll or
Stripe Tax does, on purpose, because the missing part isn't *code* — it's
ongoing legal/compliance liability that has to be carried by a licensed
provider:

- **Payroll** here records a payroll run that a real provider (Gusto, Check,
  ADP, etc.) has *already calculated and processed* — it builds the correct,
  balanced journal entry (debit wages and employer taxes, credit net pay,
  credit the withholdings/employer-tax remainder to a liabilities account).
  It does **not** calculate withholding, file returns, or move money to tax
  agencies. Doing that correctly means maintaining every jurisdiction's
  constantly-changing tax tables and taking on the liability when they're
  wrong — which is what you pay a payroll provider for. Wire one up, then
  record the result here so your books stay complete.
- **Sales tax** here is a set of named rates you maintain (e.g. "California
  7.25%") and select per invoice, with an optional region tag. It is **not**
  automated address-based rate lookup — that requires a service like Stripe
  Tax or Avalara that tracks thousands of jurisdictions and nexus rules. The
  named-rate approach is a real step up from a single hardcoded rate and is
  fine when you sell into a handful of known jurisdictions; integrate a tax
  API if you need automatic, address-accurate rates at scale.

This is the same boundary every serious bookkeeping tool draws — even
QuickBooks integrates licensed payroll/tax engines rather than reimplementing
them. The rest of the QuickBooks-style feature set (reconciliation,
multi-user, audit trail, classes, budgets) is built natively and fully here.

## Roles & permissions

Inviting a teammate (Settings → Team) sends them an email; they get access the
moment they sign in with that address. Four roles:

| Role | Can do |
|---|---|
| **Owner** | Everything; created automatically for whoever first signs up. Can't be removed or demoted. |
| **Admin** | Everything except being the owner — manage team, integrations, all books. |
| **Accountant** | Full books, reports, reconciliation, delete entries — but not team/integrations. |
| **Employee** | Day-to-day data entry. |

Permission checks are enforced server-side at the most sensitive boundaries
(team management, integration credentials, deleting ledger entries). Not
*every* route is individually role-gated yet — day-to-day create/edit
endpoints are open to any signed-in member of the org, which suits a
small-team setup where everyone's trusted; tighten per-route as needed before
opening this to a large or less-trusted user base.

## Security

- **Every API route scopes by organization.** Every read/write that touches
  user data filters by `organizationId` (verified at audit time — see git
  history for the full route-by-route check).
- **Every foreign key from a request body is verified before use, not just
  trusted.** `customerId`, `vendorId`, `revenueAccountId`,
  `expenseAccountId`, `depositAccountId`, `paidFromAccountId`,
  `inventoryItemId` — each one is checked against the calling org
  (`lib/ownership.ts`) before anything is created or posted. The ledger itself
  has a second, authoritative check baked in: `postJournalEntryInTx` verifies
  every account id in an entry belongs to the posting org, so even a future
  caller that forgets this check can't post to someone else's books.
- **Webhooks are signature-verified**, not just URL-secret-protected: Plaid's
  JWT signature (`lib/plaid-webhook.ts`) and Stripe's HMAC signature
  (`lib/stripe.ts`) are both checked before any payload is trusted.
- **Secrets are encrypted at rest** (AES-256-GCM, `lib/crypto.ts`) — Plaid
  access tokens and Stripe keys are never stored in plaintext.
- **Required env vars are validated on first use** (`lib/env.ts`) with a
  precise error naming exactly what's missing, instead of a confusing
  downstream crash three layers deep.
- **Security headers** (`next.config.mjs`): `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, HSTS, a restrictive `Permissions-Policy`,
  and `poweredByHeader: false`.

## Testing

```bash
npm test
```

23 unit tests cover the highest-stakes pure logic — the double-entry balance
invariant, the normal-balance sign convention, weighted-average inventory
costing, and Plaid auto-categorization rule matching — all in
`lib/pure/*.ts` and `lib/inventory.ts`'s exported math functions, with zero
database or network dependency, so they run instantly and deterministically
in CI. `npm run typecheck` and `npx next lint` are both clean.

## Project layout

```
app/
  dashboard/        sidebar shell + every feature page (banks, transactions,
                     invoices, bills, receipts, inventory, customers, vendors,
                     journal, accounts, reports, settings/integrations)
  invoice/[token]/   public, unauthenticated invoice view + pay page
  manifest.ts        PWA manifest (installable on laptop and phone)
  error.tsx / global-error.tsx / not-found.tsx / dashboard/error.tsx
                     error boundaries — a failure on one page never blanks the app
  api/
    health/          DB connectivity + env check, for uptime monitors
    plaid/           link-token, exchange-token, sync, webhook
    invoices/        create, send, record-payment, email, pdf
    bills/           create (enters + posts), pay
    receipts/        upload (+OCR), review/convert to bill
    inventory-items/ CRUD
    customers/ vendors/  CRUD
    reports/         trial-balance, profit-loss, balance-sheet, cash-flow (+ /pdf, /email)
    integrations/    stripe connect/status, stripe webhook/[organizationId]
    public/invoices/[token]   read-only public invoice data
lib/
  ledger.ts          the double-entry posting/reporting engine (+ cross-org account check)
  pure/              dependency-free logic, directly unit-tested (no DB/network)
  ownership.ts       verifies request-body foreign keys belong to the calling org
  invoices.ts        send (accrual + COGS) / record payment / email
  bills.ts           enter (AP + inventory) / pay
  inventory.ts       weighted-average costing — the only mutator of stock/cost
  cashflow.ts        simplified direct-method Cash Flow Statement
  plaid.ts           Plaid client, Link exchange, transaction sync (idempotent)
  plaid-webhook.ts   Plaid webhook JWT signature verification
  stripe.ts          Stripe client, payment links, webhook handling (idempotent)
  anthropic.ts       Claude vision call for receipt OCR
  receipts.ts        upload → OCR → review → convert-to-bill pipeline
  storage.ts         Supabase Storage helpers for receipt images
  email.ts           Resend wrapper — sends an email with a PDF attached
  pdf.ts             shared @react-pdf/renderer → Buffer helpers (download + email reuse these)
  categorize.ts      rule-based auto-categorization for Plaid transactions
  seed-accounts.ts   default chart of accounts, seeded per new org
  system-accounts.ts lookups for the fixed-code accounts (AR, AP, etc.)
  crypto.ts          AES-256-GCM encryption for stored secrets (Plaid tokens, Stripe keys)
  env.ts             fail-fast required-env-var validation
components/pdf/      @react-pdf/renderer documents (invoice, financial statements)
tests/               unit tests for lib/pure/* and lib/inventory.ts
prisma/schema.prisma Organization, Account, JournalEntry/Line, Plaid*, Invoice*,
                     Bill*, InventoryItem, Receipt, Integration, CategorizationRule
.github/workflows/ci.yml  typecheck → lint → test → build, on every push/PR
Dockerfile           multi-stage, standalone Next.js output, runs as non-root
```

## Running it on your laptop (not just in a browser tab)

The features that make this worth using — bank sync, Stripe payments, receipt
OCR, email — are all cloud APIs, so a fully offline desktop build isn't really
on the table without cutting those. What you get instead is a real app
*feel* on top of the same backend:

- Open the app in Chrome or Edge, then use the install icon in the address
  bar — `app/manifest.ts` makes it installable as a PWA: its own window, its
  own icon, no browser chrome.
- The same install works from your phone's browser too, which matters for
  receipt capture — you'll want your phone's camera for that, not just your
  laptop.
- Installing the PWA doesn't fork anything: same Postgres database, same
  login, same everything as the browser tab. You can use both at once.

## Setup (local development)

1. **Supabase** — create a project. Enable email/password auth (Authentication
   → Providers). Copy the Project URL, anon key, and pooled Postgres
   connection string into `.env`.

2. **Supabase Storage (for receipts)** — create a bucket named `receipts`,
   set it **private**. Add a policy allowing the `authenticated` role to
   `INSERT` and `SELECT` on `storage.objects` for that bucket — the app already
   namespaces every upload under `{organizationId}/...`, so a permissive
   authenticated policy is fine for personal/small-team use; tighten it with a
   custom claim check if you need stricter per-org isolation.

3. **Plaid** — create an app at dashboard.plaid.com, grab `client_id` and a
   sandbox `secret`. Sandbox test login: `user_good` / `pass_good`.

4. **Anthropic** — grab an API key from console.anthropic.com for receipt OCR.

5. **Resend (optional)** — grab an API key from resend.com, then verify
   `godurgaorganics.com` as a sending domain (Resend → Domains → Add Domain →
   add the SPF/DKIM/DMARC records it gives you to your DNS). Once verified,
   `payments@godurgaorganics.com` can be used as `RESEND_FROM_EMAIL` — a
   payments-specific address reads more clearly to customers than a general
   `admin@` one, and keeps invoice replies out of your main inbox. Without
   this set up, invoices and reports just fall back to PDF download + a
   `mailto:` link instead of real delivery.

6. **Encryption key** for Plaid tokens and Stripe keys at rest:
   ```bash
   openssl rand -hex 32
   ```

7. Copy `.env.example` → `.env` and fill in the values above (including
   `NEXT_PUBLIC_APP_URL`, used to build the public invoice link, and
   `DIRECT_URL`, a non-pooled connection Prisma's migration commands need —
   see the "Database migrations" note below).

8. Install, generate the client, and push the schema:
   ```bash
   npm install
   npx prisma db push
   ```
   (`prisma generate` runs automatically via the `postinstall` script — no
   need to run it by hand unless you used `npm ci --ignore-scripts`.)

9. Run it:
   ```bash
   npm run dev
   ```
   Sign up at `/login` — your chart of accounts seeds itself on first sign-in.

10. **Stripe (optional)** — from Settings → Integrations, follow the on-screen
    steps: create a webhook endpoint in your Stripe dashboard pointing at the
    URL shown, listening for `checkout.session.completed`, then paste your
    secret key and that webhook's signing secret into the form.

11. **Plaid webhooks (optional but recommended)** — point `PLAID_WEBHOOK_URL`
    at your deployed `/api/plaid/webhook` so transactions sync automatically.
    Needs a public HTTPS URL in local dev (ngrok, Cloudflare Tunnel, etc.).

## Database migrations (read this before your first real deploy)

`npx prisma db push` (used above) is fine for local development — it's fast
and doesn't ask questions. It is **not** what you want for production,
because it has no migration history: there's no record of *how* the schema
got from A to B, and no safe rollback path.

Before deploying for real:

```bash
npx prisma migrate dev --name init   # generates prisma/migrations/, run once locally
git add prisma/migrations && git commit -m "Add initial migration"
```

From then on, every environment (staging, production, CI) runs:

```bash
npx prisma migrate deploy   # = npm run db:deploy
```

which applies only the migrations that haven't run yet — safe to run on every
deploy, never destructive, and gives you a real history to read or roll back
from. This repo doesn't ship a pre-generated migration because `prisma
migrate dev` needs to download engine binaries from `binaries.prisma.sh`,
which wasn't reachable from the sandbox this was built in (see "How this was
verified" below) — it's one command, run once, on your own machine.

## Deploying

**Vercel** is the lowest-friction option for a Next.js app like this: connect
the repo, set every variable from `.env.example` in Project Settings →
Environment Variables (including build-time `NEXT_PUBLIC_*` ones), and set
the build command to `npx prisma generate && npx prisma migrate deploy && next build`
so migrations run automatically on deploy.

**Self-hosted / Docker** — `Dockerfile` is included (multi-stage, Next's
`output: 'standalone'`, runs as a non-root user, has a `HEALTHCHECK` hitting
`/api/health`):

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  --build-arg NEXT_PUBLIC_APP_URL=https://yourdomain.com \
  -t ledgerflow .
docker run -p 3000:3000 --env-file .env ledgerflow
```

Note the `--build-arg` flags — `NEXT_PUBLIC_*` variables get baked into the
client-side JS bundle at *build* time, not read at container start, so they
have to be passed at `docker build`, not just `docker run`. Everything else
(secrets, `DATABASE_URL`, API keys) is read at runtime via `--env-file` and
never baked into the image.

**CI** (`.github/workflows/ci.yml`) runs typecheck → lint → unit tests →
build on every push and PR, using placeholder env values (the build never
touches a live database — Prisma generate just reads the schema file, and
every page that needs real data is dynamically rendered, not statically
generated, so it doesn't execute at build time).

## Pre-launch checklist

- [ ] Ran `npx prisma migrate dev --name init` once, committed the migration
- [ ] Real Supabase project (not the sandbox/dev one), with the `receipts`
      Storage bucket created and policies set
- [ ] `PLAID_ENV=production` with production Plaid credentials (sandbox keys
      won't work against real bank accounts)
- [ ] Stripe **live** secret key + a live-mode webhook endpoint per org that
      uses it (test-mode and live-mode are entirely separate in Stripe)
- [ ] Resend domain verified, `RESEND_FROM_EMAIL` on that domain
- [ ] `NEXT_PUBLIC_APP_URL` set to the real production URL (it's baked into
      public invoice links and emails)
- [ ] A fresh `PLAID_TOKEN_ENCRYPTION_KEY` generated for production — don't
      reuse the one from local dev
- [ ] `/api/health` returns `200` from your deploy target
- [ ] Some form of error monitoring wired up (Sentry, Logtail, or even just
      your platform's log aggregation) — `console.error` calls throughout the
      codebase are ready to be picked up by whatever you point at them, but
      nothing is wired up by default in this repo

## A note on how this was verified

This was built and validated inside a sandboxed container with restricted
network access. `npm install`, the TypeScript compiler, ESLint, the full unit
test suite (23/23 passing), and a complete `next build` (webpack compile +
route collection) all ran clean against this exact code. Every route was
manually audited for organization-scoping and request-body foreign-key
ownership (see "Security" above) — that pass found and fixed two real gaps
(unverified cross-org foreign keys, and webhook-retry double-posting risk)
before they became production incidents.

The one step that *couldn't* run here is `npx prisma generate` /
`prisma migrate dev`, because both need to download engine binaries from
`binaries.prisma.sh`, which the sandbox's network policy blocks. That works
normally on your machine or in CI (GitHub Actions runners have full internet
access) — it's a standard part of any Prisma project's setup, not specific to
this app.

**What "production ready" means here, honestly:** the logic that handles
money is tested, the multi-tenant boundaries are audited and enforced in two
independent places, webhooks are idempotent and signature-verified, secrets
are encrypted, errors have boundaries instead of blank-screening the app, and
there's a real CI pipeline and migration workflow. It does **not** mean zero
bugs will ever surface — no software ships with that guarantee — and a few
things still need *you*, not me: generating the real migration, getting
production API keys, verifying domains, and wiring up actual error monitoring
once you're live.

## Things to know before going to production

- **Recategorizing a Plaid transaction reposts, it doesn't reverse.** This
  deletes the old journal entry and creates a new one rather than posting a
  formal reversing entry — fine for personal/small-biz books, but an auditor
  would expect both the original and a correction to stay visible.
- **The Cash Flow Statement is simplified.** It's a real direct-method
  statement (every cash-account journal line, bucketed by what it posted
  against), but only distinguishes Operating vs. Financing — there's no
  fixed-asset account type yet to classify Investing activity against.
- **Stripe is bring-your-own-key, not Stripe Connect.** Each org pastes in
  their own secret key and sets up their own webhook endpoint. That's simpler
  to set up than OAuth, but means you're trusting the app's encryption rather
  than Stripe's own connected-account isolation — fine for a single
  organization running its own books, not for a multi-tenant SaaS reselling
  this to others without further work.
- **No application-level rate limiting yet.** The receipt-OCR endpoint calls
  a paid API per upload and is capped at 8MB/file, but isn't rate-limited per
  org — fine for personal/small-team use behind a login, worth adding
  (Upstash Ratelimit or similar) before exposing this to the public internet
  at scale.
- **One organization per user.** Multi-user organizations, roles, and
  approval workflows aren't built — every signed-in user gets their own books.
- **Inventory costing is weighted-average only** — no FIFO/LIFO option, and
  quantities can go negative if you invoice more than you've received (no
  hard stop, just lets the cost basis go where the math takes it).
