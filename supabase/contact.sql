-- On-site contact messages. Written and read only with the service role (no policies = no client access).
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table contact_messages enable row level security;
revoke all on contact_messages from anon, authenticated;
create index if not exists idx_contact_messages_created on contact_messages(created_at desc);
