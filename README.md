# Cubits

A B2B workspace of small tools for small businesses and agencies: **Invoices**, **Forms** and **Automations**.
One plan: **$29/month per workspace**, 7-day free trial (card upfront), up to 5 seats.

Stack: Next.js 15 (App Router) · Tailwind 3 · Supabase (auth + Postgres + RLS) · Stripe · Resend.

## Setup

1. `npm install`
2. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
3. Copy `.env.example` to `.env.local` and fill in every value.
4. In Stripe, create a Product with a recurring **$29 / month** Price and set `STRIPE_PRICE_ID`.
   (Optional: a second yearly Price of $290.)
5. Add a webhook endpoint at `{APP_URL}/api/stripe/webhook` with these events:
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
   Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
6. Enable the Stripe Customer Portal (Settings → Billing → Customer portal).
7. In Resend, verify your sending domain and set `EMAIL_FROM`.
8. In Supabase Auth settings, set the Site URL to `NEXT_PUBLIC_APP_URL` and add `{APP_URL}/auth/callback` as a redirect URL.
9. `npm run dev`

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public base URL, used in emails, invites and form embeds |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only writes (never exposed to the browser) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` | Billing |
| `RESEND_API_KEY`, `EMAIL_FROM` | Transactional email |
| `CRON_SECRET` | Bearer token protecting `/api/cron/*` |

## Deploy

Vercel is the simplest path: import the repo, add the env vars, deploy. `vercel.json` registers two crons
(daily and weekly automations); Vercel sends `CRON_SECRET` automatically.
On Netlify or Cloudflare, call the same `/api/cron/*` URLs from a scheduled function with
`Authorization: Bearer $CRON_SECRET`.

## How it fits together

- **Trial countdown:** no reminder emails. A "days left" strip shows on every `/app` page and a 7-day meter on `/app/billing` (`src/lib/account.ts`), turning urgent in the last 3 days.
- **Workspace = paying unit.** `workspaces.plan_status` (`trialing` / `active`) gates every `/app` page via `requireWorkspace()`.
- **Cubits** live in `src/app/app/*` and are listed in `src/lib/cubits/registry.ts`.
- **Events:** cubits call `emit(workspaceId, event, payload)` (`src/lib/events.ts`); the automations engine runs matching rules.
- **RLS** scopes all data by workspace membership; Stripe fields, public form submissions and automation logs are written server-side with the service role.

## Pages

Marketing (4): `/`, `/pricing`, `/cubits`, `/contact` (Privacy and Terms are sections on the contact page).
App: `/login`, `/signup`, `/app`, `/app/invoices`, `/app/forms`, `/app/automations`, `/app/team`, `/app/billing`. Public form: `/f/{slug}`.

## Not in v1

SSO, roles beyond owner/member, audit logs, public API, per-cubit add-ons, retry queues and multi-step automations.
