-- Agents cubit. Additive and idempotent: safe to run on top of schema.sql.

alter table workspaces add column if not exists agents_status text not null default 'none';  -- none | trialing | active | past_due | canceled
alter table workspaces add column if not exists agents_period_end timestamptz;
alter table workspaces add column if not exists agents_subscription_id text;

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  instructions text not null default '',
  tools text[] not null default '{}',          -- subset of: send_email, create_invoice_draft, read_form_submissions
  model text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  status text not null default 'running',      -- running | awaiting_approval | completed | failed | rejected
  input text not null,
  output text,
  error text,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  steps int not null default 0,
  state jsonb,                                  -- paused conversation while awaiting approval
  pending_action jsonb,                         -- {tool, input} awaiting a human
  idempotency_key text,
  source text not null default 'api',           -- api | ui
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (workspace_id, idempotency_key)
);

create table if not exists run_events (
  id bigint generated always as identity primary key,
  run_id uuid not null references runs(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  type text not null,                           -- message | tool_call | tool_result | approval_required | approved | rejected | error | done
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  prefix text not null,
  key_hash text not null unique,                -- sha256 of the full key; the key itself is never stored
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create table if not exists usage_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  run_id uuid references runs(id) on delete set null,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists webhooks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  url text not null,
  secret text not null default encode(gen_random_bytes(24), 'hex'),
  events text[] not null default '{run.completed,run.needs_approval}',
  created_at timestamptz not null default now()
);

alter table agents enable row level security;
alter table runs enable row level security;
alter table run_events enable row level security;
alter table api_keys enable row level security;
alter table usage_events enable row level security;
alter table webhooks enable row level security;

-- Members can read; every write happens server-side with the service role.
drop policy if exists "agents read" on agents;
create policy "agents read" on agents for select using (is_member(workspace_id));
drop policy if exists "runs read" on runs;
create policy "runs read" on runs for select using (is_member(workspace_id));
drop policy if exists "run_events read" on run_events;
create policy "run_events read" on run_events for select using (is_member(workspace_id));
drop policy if exists "api_keys read" on api_keys;
create policy "api_keys read" on api_keys for select using (is_member(workspace_id));
drop policy if exists "usage_events read" on usage_events;
create policy "usage_events read" on usage_events for select using (is_member(workspace_id));
-- webhooks hold signing secrets: no member read policy at all (service role only).

revoke insert, update, delete on agents, runs, run_events, api_keys, usage_events, webhooks from anon, authenticated;
revoke all on webhooks from anon, authenticated;

create index if not exists idx_agents_workspace on agents(workspace_id);
create index if not exists idx_runs_workspace_created on runs(workspace_id, created_at desc);
create index if not exists idx_runs_agent on runs(agent_id);
create index if not exists idx_run_events_run on run_events(run_id, id);
create index if not exists idx_run_events_workspace on run_events(workspace_id);
create index if not exists idx_api_keys_workspace on api_keys(workspace_id);
create index if not exists idx_usage_workspace on usage_events(workspace_id, created_at desc);
create index if not exists idx_usage_run on usage_events(run_id);
create index if not exists idx_webhooks_workspace on webhooks(workspace_id);
