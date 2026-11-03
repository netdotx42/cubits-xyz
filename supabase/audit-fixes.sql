-- Audit fixes (Nov 2026). Additive and idempotent: run after schema.sql and agents.sql.

-- ───────── Plan gating in SQL (M1) ─────────
-- A member may write workspace data only while the Cubits plan is trialing or active.
create or replace function has_access(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from workspaces w
    join members m on m.workspace_id = w.id and m.user_id = auth.uid()
    where w.id = ws and w.plan_status in ('trialing', 'active')
  );
$$;
revoke execute on function has_access(uuid) from public, anon;
grant execute on function has_access(uuid) to authenticated, service_role;

drop policy if exists "invoices all" on invoices;
drop policy if exists "invoices read" on invoices;
drop policy if exists "invoices write" on invoices;
create policy "invoices read" on invoices for select using (is_member(workspace_id));
create policy "invoices write" on invoices for all using (has_access(workspace_id)) with check (has_access(workspace_id));

drop policy if exists "forms all" on forms;
drop policy if exists "forms read" on forms;
drop policy if exists "forms write" on forms;
create policy "forms read" on forms for select using (is_member(workspace_id));
create policy "forms write" on forms for all using (has_access(workspace_id)) with check (has_access(workspace_id));

drop policy if exists "automations all" on automations;
drop policy if exists "automations read" on automations;
drop policy if exists "automations write" on automations;
create policy "automations read" on automations for select using (is_member(workspace_id));
create policy "automations write" on automations for all using (has_access(workspace_id)) with check (has_access(workspace_id));

-- ───────── Seat limit enforced in the database (L2) ─────────
create or replace function enforce_seats() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cap int;
  used int;
begin
  select seats into cap from workspaces where id = new.workspace_id for update;
  select count(*) into used from members where workspace_id = new.workspace_id;
  if used >= cap then
    raise exception 'seat limit reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists members_enforce_seats on members;
create trigger members_enforce_seats before insert on members for each row execute function enforce_seats();

-- ───────── Shared rate limiter (M2, M3) ─────────
-- Fixed-window counter shared by every server instance. Returns true when the call is allowed.
create table if not exists rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count int not null
);
alter table rate_limits enable row level security;
revoke all on rate_limits from anon, authenticated;

create or replace function rate_limit_hit(p_key text, p_limit int, p_window_seconds int) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  insert into rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    count = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.count + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning count into n;
  return n <= p_limit;
end;
$$;
revoke execute on function rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function rate_limit_hit(text, int, int) to service_role;

-- Old windows are useless; the cron prunes them.
create index if not exists idx_rate_limits_window on rate_limits(window_start);

-- ───────── Invoice numbers are unique per workspace and kind (M7) ─────────
do $$
begin
  if exists (
    select 1 from invoices group by workspace_id, kind, number having count(*) > 1
  ) then
    -- Renumber later duplicates with a suffix so the constraint can be added without losing rows.
    with d as (
      select id, row_number() over (partition by workspace_id, kind, number order by created_at, id) as rn
      from invoices
    )
    update invoices i set number = i.number || '-' || d.rn
    from d where d.id = i.id and d.rn > 1;
  end if;
end $$;
create unique index if not exists uq_invoices_number on invoices(workspace_id, kind, number);

-- ───────── Agents: who started and approved a run (M6) ─────────
alter table runs add column if not exists api_key_id uuid references api_keys(id) on delete set null;
alter table runs add column if not exists decided_by text;   -- 'user:<uuid>' or 'key:<uuid>'
create index if not exists idx_runs_status_created on runs(status, created_at);
create index if not exists idx_runs_api_key on runs(api_key_id);

-- ───────── Invites expire (M9) ─────────
alter table invites add column if not exists expires_at timestamptz;
update invites set expires_at = created_at + interval '7 days' where expires_at is null;
alter table invites alter column expires_at set default now() + interval '7 days';
