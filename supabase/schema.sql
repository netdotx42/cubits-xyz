-- Cubits schema. Run once in the Supabase SQL editor.
create extension if not exists "pgcrypto";

-- ───────── Workspaces & members ─────────
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  logo_url text,
  company_details text,           -- address / VAT id shown on invoices
  currency text not null default 'USD',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan_status text not null default 'none',  -- none | trialing | active | past_due | canceled
  trial_end timestamptz,
  seats int not null default 5,
  created_at timestamptz not null default now()
);

create table if not exists members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',        -- owner | member
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ───────── Cubit 1: invoices & quotes ─────────
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null default 'invoice',        -- invoice | quote
  number text not null,
  client_name text not null,
  client_email text,
  items jsonb not null default '[]',           -- [{description, qty, unit_price}]
  tax_rate numeric not null default 0,
  notes text,
  status text not null default 'draft',        -- draft | sent | paid
  due_date date,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- ───────── Cubit 2: forms & leads ─────────
create table if not exists forms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  slug text not null unique default encode(gen_random_bytes(6), 'hex'),
  fields jsonb not null default '[]',          -- [{name,label,type,required}]
  notify_email text,
  created_at timestamptz not null default now()
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references forms(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ───────── Automations ─────────
create table if not exists automations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  trigger text not null,       -- form.submitted | invoice.created | invoice.sent | invoice.paid | schedule.daily | schedule.weekly
  action text not null,        -- email | slack | webhook | create_invoice_draft
  config jsonb not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references automations(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  status text not null,        -- success | error
  error text,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- ───────── Row level security ─────────
create or replace function is_member(ws uuid) returns boolean
language sql security definer set search_path = public as $$
  select exists (select 1 from members where workspace_id = ws and user_id = auth.uid());
$$;

-- Signed-in users need EXECUTE for RLS policies; anonymous callers do not.
revoke execute on function is_member(uuid) from public, anon;
grant execute on function is_member(uuid) to authenticated, service_role;

alter table workspaces enable row level security;
alter table members enable row level security;
alter table invites enable row level security;
alter table invoices enable row level security;
alter table forms enable row level security;
alter table submissions enable row level security;
alter table automations enable row level security;
alter table automation_runs enable row level security;

create policy "ws read" on workspaces for select using (is_member(id));
create policy "members read" on members for select using (is_member(workspace_id));
create policy "invites read" on invites for select using (is_member(workspace_id));
create policy "invoices all" on invoices for all using (is_member(workspace_id)) with check (is_member(workspace_id));
create policy "forms all" on forms for all using (is_member(workspace_id)) with check (is_member(workspace_id));
create policy "submissions read" on submissions for select using (is_member(workspace_id));
create policy "automations all" on automations for all using (is_member(workspace_id)) with check (is_member(workspace_id));
create policy "runs read" on automation_runs for select using (is_member(workspace_id));

-- Workspaces, members and invites are only ever written server-side with the service role.
-- No user-level write policies exist, so owners cannot edit plan_status, trial_end or seats directly.
revoke insert, update, delete on workspaces from anon, authenticated;
revoke insert, update, delete on members from anon, authenticated;
revoke insert, update, delete on invites from anon, authenticated;

-- Covering indexes for foreign keys used in joins and RLS checks.
create index if not exists idx_members_user on members(user_id);
create index if not exists idx_workspaces_owner on workspaces(owner_id);
create index if not exists idx_invites_workspace on invites(workspace_id);
create index if not exists idx_invoices_workspace on invoices(workspace_id, created_at desc);
create index if not exists idx_forms_workspace on forms(workspace_id);
create index if not exists idx_submissions_form on submissions(form_id, created_at desc);
create index if not exists idx_submissions_workspace on submissions(workspace_id);
create index if not exists idx_automations_workspace on automations(workspace_id);
create index if not exists idx_runs_automation on automation_runs(automation_id);
create index if not exists idx_runs_workspace on automation_runs(workspace_id, created_at desc);

-- Writes to workspaces (create), members (insert), submissions (public form posts),
-- automation_runs and Stripe fields are done server-side with the service role key.
