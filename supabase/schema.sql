-- ACI Motors Field Force Module — Supabase schema
create extension if not exists pgcrypto;

create table if not exists profiles(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  staff_id_hash text not null,
  role text not null default 'officer' check (role in ('admin','officer')),
  business text not null default 'Foton',
  is_disabled boolean default false,
  created_at timestamptz default now()
);

create table if not exists files(
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (char_length(code) >= 3),
  sale_type text not null check (sale_type in ('credit','cash')),
  reg_type text not null default 'new' check (reg_type in ('new','resale')),
  business text default 'Foton',
  officer_id uuid references profiles(id) on delete set null,
  customer_name text default '',
  vehicle_model text default '',
  status text default 'incomplete' check (status in ('incomplete','complete')),
  delivery_status text default 'Pending',
  documents jsonb default '{}'::jsonb,
  steps jsonb default '{}'::jsonb,
  paper_received_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz default now(),
  constraint docs_rule check (
    (sale_type = 'credit' and documents ?& array['invoice','chalan','nid','chassis'])
    or (sale_type = 'cash' and documents ?& array['invoice','chalan','nid','chassis','tin'])
    or documents = '{}'::jsonb
  )
);

create table if not exists notifications(
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  file_id uuid references files(id) on delete cascade,
  type text not null,
  title text not null,
  body text default '',
  severity text default 'info',
  for_role text default null,
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists email_log(
  id uuid primary key default gen_random_uuid(),
  file_id uuid references files(id) on delete cascade,
  recipient text not null,
  subject text not null,
  status text default 'queued',
  attempts int default 0,
  last_error text default '',
  created_at timestamptz default now()
);

alter table profiles enable row level security;
alter table files enable row level security;
alter table notifications enable row level security;
alter table email_log enable row level security;

drop policy if exists p_all on profiles; create policy p_all on profiles for all using (true) with check (true);
drop policy if exists f_officer_select on files; create policy f_officer_select on files for select using (true);
drop policy if exists f_officer_insert on files; create policy f_officer_insert on files for insert with check (true);
drop policy if exists f_admin_all on files; create policy f_admin_all on files for all using (true) with check (true);
drop policy if exists n_all on notifications; create policy n_all on notifications for all using (true) with check (true);
drop policy if exists e_all on email_log; create policy e_all on email_log for all using (true) with check (true);

insert into storage.buckets (id, name, public) values ('documents','documents',false) on conflict (id) do nothing;

create or replace function notify_change() returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    insert into notifications(user_id,file_id,type,title,body,severity)
      values (NEW.officer_id,NEW.id,'new_file','New File Received','File '||NEW.code||' has been received successfully.','info');
    insert into notifications(user_id,file_id,type,title,body,severity,for_role)
      values (NEW.officer_id,NEW.id,'approval_pending','Approval Pending','File '||NEW.code||' is waiting for approval.','critical','admin');
    return NEW;
  end if;
  if NEW.delivery_status = 'Delivered' and coalesce(OLD.delivery_status,'') <> 'Delivered' then
    insert into notifications(user_id,file_id,type,title,body,severity)
      values (NEW.officer_id,NEW.id,'delivered','Delivered to Field Force','File '||NEW.code||' has been delivered.','info');
  end if;
  if (NEW.steps->>'approval' is distinct from OLD.steps->>'approval') then
    insert into notifications(user_id,file_id,type,title,body,severity)
      values (NEW.officer_id,NEW.id,'approval_done','Approval Completed','File '||NEW.code||' has been approved.','info');
  end if;
  if (NEW.steps->>'payment' is distinct from OLD.steps->>'payment') then
    insert into notifications(user_id,file_id,type,title,body,severity)
      values (NEW.officer_id,NEW.id,'registration_done','Registration Completed','Registration completed for file '||NEW.code||'.','info');
  end if;
  if (NEW.steps->>'route_permit' is distinct from OLD.steps->>'route_permit') then
    insert into notifications(user_id,file_id,type,title,body,severity)
      values (NEW.officer_id,NEW.id,'route_permit','Route Permit Generated','Route permit generated for file '||NEW.code||'.','info');
  end if;
  if (NEW.steps->>'insurance' is distinct from OLD.steps->>'insurance') then
    insert into notifications(user_id,file_id,type,title,body,severity)
      values (NEW.officer_id,NEW.id,'insurance_ready','Insurance Ready','Insurance is ready for file '||NEW.code||'.','info');
  end if;
  return NEW;
end; $$ language plpgsql;

drop trigger if exists trg_notify on files;
create trigger trg_notify after insert or update on files for each row execute function notify_change();
