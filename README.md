# Cubits

A B2B workspace of small tools for small businesses and agencies: **Invoices**, **Forms** and **Automations**.
One plan: **$29/month per workspace**, 7-day free trial (card upfront), up to 5 seats.

Stack: Next.js 15 (App Router) · Tailwind 3 · Supabase (auth + Postgres + RLS) · Stripe · Resend.

## Setup

1. `npm install`
2. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
3. Copy `.env.example` to `.env.local` and fill in every value.
4. In Stripe, create a Product with a recurring **$29 / month** Price and set `STRIPE_PRICE_ID`.
   (Live account: product `prod_VXzdvoBKoaKSor`, monthly price `price_1UWteY17sTkAsp8v9gmwj9we`, annual $290 price `price_1UWtf917sTkAsp8vzW2uLsht`. Price IDs are not secret.)
   Set `STRIPE_PRICE_ID_ANNUAL` to the annual price; the annual button on `/app/billing` only shows when it is set.
   (Optional: a second yearly Price of $290.)
5. Add a webhook endpoint at `{APP_URL}/api/stripe/webhook` with these events:
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
   Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
6. Enable the Stripe Customer Portal (Settings → Billing → Customer portal).
7. In Resend, verify your sending domain and set `EMAIL_FROM`.
8. In Supabase Auth settings, set the Site URL to `NEXT_PUBLIC_APP_URL` and add `{APP_URL}/auth/callback` as a redirect URL.
9. `npm run dev`

Checks before deploying: `npm run typecheck` and `npm run build`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public base URL, used in emails, invites and form embeds |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only writes (never exposed to the browser) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `STRIPE_PRICE_ID_ANNUAL` (optional) | Billing |
| `RESEND_API_KEY`, `EMAIL_FROM` | Transactional email |
| `CRON_SECRET` | Bearer token protecting `/api/cron/*` |
| `ADMIN_EMAILS` | Comma-separated emails allowed to read Contact page messages at `/app/admin/messages` (run `supabase/contact.sql` first) |

## Agents (add-on)

Run `supabase/agents.sql` after `schema.sql`. Set `STRIPE_PRICE_ID_AGENTS`, `ANTHROPIC_API_KEY` (and optionally `AGENTS_MODEL`).
Public API under `/v1` (Bearer `cbk_...` keys): `POST/GET /v1/agents`, `PATCH /v1/agents/{id}`, `POST /v1/agents/{id}/runs` (Idempotency-Key, `?stream=1`),
`GET /v1/runs/{id}`, `POST /v1/runs/{id}/approve`, `GET /v1/usage`, `POST /v1/webhooks`.
Limits: 5 steps and 20k tokens per run, 3,000 runs per yearly period, 60 requests/min per key (per-instance, best effort).
Sensitive tools (send_email) pause the run until a human approves it in the app or via the API.

## Deploy to Vercel

1. Import `netdotx42/cubits-xyz` in Vercel. Framework preset: Next.js (auto-detected). Node 20+.
2. Add every variable from the table above under Settings → Environment Variables (Production, and Preview if you use previews).
   Set `NEXT_PUBLIC_APP_URL` to your final domain (for example `https://cubits.xyz`), with no trailing slash. Redeploy after changing it.
3. Deploy. Then wire the services to the live URL:
   - **Stripe:** webhook endpoint `https://YOUR_DOMAIN/api/stripe/webhook` with the five events listed in Setup.
   - **Supabase:** Auth → URL Configuration: Site URL = your domain, add `https://YOUR_DOMAIN/auth/callback` to Redirect URLs.
   - **Resend:** verify your sending domain and set `EMAIL_FROM` to an address on it.
4. Cron: `vercel.json` registers two crons (daily 08:00 UTC and Monday 08:00 UTC automations). Vercel sends
   `Authorization: Bearer $CRON_SECRET` automatically once `CRON_SECRET` is set. Hobby plans allow daily crons, which is all this needs.
5. Smoke test: sign up, create a workspace, start the trial with Stripe test card `4242 4242 4242 4242`,
   create an invoice, build a form and submit it, add an automation, and check the run log.

On Netlify or Cloudflare, call the same `/api/cron/*` URLs from a scheduled function with `Authorization: Bearer $CRON_SECRET`.

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
