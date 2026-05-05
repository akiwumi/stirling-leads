create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company_name text,
  email text,
  plan_name text not null default 'Stirling Solo',
  billing_cycle text not null default 'monthly',
  subscription_status text not null default 'trial',
  monthly_price_cents integer not null default 4200,
  annual_price_cents integer not null default 40800,
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '2 days'),
  email_confirmed_at timestamptz,
  refund_policy text not null default 'No refunds after the trial. Core workflow stays available across paid plans.',
  plan_key text default 'solo_monthly',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  seats_included integer not null default 1,
  seat_count integer not null default 1,
  workspace_owner_id uuid,
  workspace_role text not null default 'owner',
  welcome_email_sent_at timestamptz,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.users add column if not exists plan_name text not null default 'Stirling Solo';
alter table public.users add column if not exists billing_cycle text not null default 'monthly';
alter table public.users add column if not exists subscription_status text not null default 'trial';
alter table public.users add column if not exists monthly_price_cents integer not null default 4200;
alter table public.users add column if not exists annual_price_cents integer not null default 40800;
alter table public.users add column if not exists trial_started_at timestamptz not null default now();
alter table public.users add column if not exists trial_ends_at timestamptz not null default (now() + interval '2 days');
alter table public.users add column if not exists email_confirmed_at timestamptz;
alter table public.users add column if not exists refund_policy text not null default 'No refunds after the trial. Core workflow stays available across paid plans.';
alter table public.users add column if not exists plan_key text default 'solo_monthly';
alter table public.users add column if not exists stripe_customer_id text;
alter table public.users add column if not exists stripe_subscription_id text;
alter table public.users add column if not exists stripe_price_id text;
alter table public.users add column if not exists current_period_start timestamptz;
alter table public.users add column if not exists current_period_end timestamptz;
alter table public.users add column if not exists cancel_at_period_end boolean default false;
alter table public.users add column if not exists seats_included integer not null default 1;
alter table public.users add column if not exists seat_count integer not null default 1;
alter table public.users add column if not exists workspace_owner_id uuid;
alter table public.users add column if not exists workspace_role text not null default 'owner';
alter table public.users add column if not exists welcome_email_sent_at timestamptz;
alter table public.users add column if not exists terms_accepted_at timestamptz;

update public.users
set workspace_owner_id = id
where workspace_owner_id is null;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  stripe_subscription_id text not null unique,
  stripe_customer_id text,
  stripe_price_id text,
  plan_key text,
  billing_cycle text,
  subscription_status text not null default 'trial',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  seats_included integer not null default 1,
  seat_count integer not null default 1,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  workspace_owner_id uuid not null references public.users(id) on delete cascade,
  metric_key text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  used_count integer not null default 0,
  limit_count integer not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (workspace_owner_id, metric_key, period_start, period_end)
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_owner_id uuid not null references public.users(id) on delete cascade,
  member_user_id uuid references public.users(id) on delete set null,
  invite_email text not null,
  role text not null default 'member',
  status text not null default 'pending',
  invited_by uuid references public.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_owner_id, invite_email)
);

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.users(id) on delete set null,
  workspace_owner_id uuid references public.users(id) on delete set null,
  request_type text not null default 'general',
  name text,
  email text,
  company_name text,
  subject text not null,
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website_url text,
  industry text,
  city text,
  country text,
  address_line text,
  description text,
  status text default 'new',
  lead_score integer default 0,
  lead_temperature text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies add column if not exists address_line text;

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text,
  role text,
  email text,
  phone text,
  contact_type text,
  source_url text,
  consent_basis text,
  unsubscribed boolean default false,
  created_at timestamptz not null default now()
);

create table if not exists public.company_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  body text not null,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  source_url text not null,
  source_type text,
  found_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_scores (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  score integer not null,
  category text,
  qr_use_case text,
  reason text,
  recommended_pitch text,
  confidence integer,
  ai_model text,
  created_at timestamptz not null default now()
);

create table if not exists public.qr_demos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  title text,
  demo_url text,
  qr_code_url text,
  use_case text,
  landing_page_config jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject_template text,
  body_template text,
  niche text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  niche text,
  location text,
  status text default 'draft',
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.campaign_leads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  status text default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.email_drafts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  subject text,
  body text,
  status text default 'needs_review',
  approved_by_user boolean default false,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.email_sends (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid references public.email_drafts(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  provider_message_id text,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  bounced_at timestamptz,
  unsubscribed_at timestamptz
);

create table if not exists public.transactional_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  email_type text not null,
  recipient_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'pending',
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.unsubscribe_list (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  company_id uuid references public.companies(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, company_name, email_confirmed_at, workspace_owner_id, workspace_role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'company_name',
    new.email_confirmed_at,
    new.id,
    'owner'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.users.full_name),
    company_name = coalesce(excluded.company_name, public.users.company_name),
    email_confirmed_at = new.email_confirmed_at,
    workspace_owner_id = coalesce(public.users.workspace_owner_id, excluded.workspace_owner_id),
    workspace_role = coalesce(public.users.workspace_role, excluded.workspace_role);
  return new;
end;
$$;

create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    email,
    full_name,
    company_name,
    email_confirmed_at,
    workspace_owner_id,
    workspace_role
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'company_name',
    new.email_confirmed_at,
    new.id,
    'owner'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.users.full_name),
    company_name = coalesce(excluded.company_name, public.users.company_name),
    email_confirmed_at = excluded.email_confirmed_at,
    workspace_owner_id = coalesce(public.users.workspace_owner_id, excluded.workspace_owner_id),
    workspace_role = coalesce(public.users.workspace_role, excluded.workspace_role);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email, email_confirmed_at, raw_user_meta_data on auth.users
for each row execute procedure public.sync_auth_user_profile();

alter table public.users enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.company_notes enable row level security;
alter table public.lead_sources enable row level security;
alter table public.lead_scores enable row level security;
alter table public.qr_demos enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_drafts enable row level security;
alter table public.email_sends enable row level security;
alter table public.unsubscribe_list enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_leads enable row level security;
alter table public.transactional_emails enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;
alter table public.workspace_members enable row level security;
alter table public.support_requests enable row level security;

create or replace function public.current_workspace_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select workspace_owner_id from public.users where id = auth.uid()),
    auth.uid()
  );
$$;

create policy "users own profile select"
on public.users for select
using (auth.uid() = id);

create policy "users own profile update"
on public.users for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "users own subscriptions"
on public.subscriptions for all
using (public.current_workspace_owner_id() = user_id)
with check (public.current_workspace_owner_id() = user_id);

create policy "users own companies select"
on public.companies for select
using (public.current_workspace_owner_id() = created_by);

create policy "users own companies insert"
on public.companies for insert
with check (public.current_workspace_owner_id() = created_by);

create policy "users own companies update"
on public.companies for update
using (public.current_workspace_owner_id() = created_by)
with check (public.current_workspace_owner_id() = created_by);

create policy "users own companies delete"
on public.companies for delete
using (public.current_workspace_owner_id() = created_by);

create policy "users own contacts"
on public.contacts for all
using (
  exists (
    select 1
    from public.companies
    where companies.id = contacts.company_id
      and companies.created_by = public.current_workspace_owner_id()
  )
)
with check (
  exists (
    select 1
    from public.companies
    where companies.id = contacts.company_id
      and companies.created_by = public.current_workspace_owner_id()
  )
);

create policy "users own company notes"
on public.company_notes for all
using (
  public.current_workspace_owner_id() = created_by
  and exists (
    select 1
    from public.companies
    where companies.id = company_notes.company_id
      and companies.created_by = public.current_workspace_owner_id()
  )
)
with check (
  public.current_workspace_owner_id() = created_by
  and exists (
    select 1
    from public.companies
    where companies.id = company_notes.company_id
      and companies.created_by = public.current_workspace_owner_id()
  )
);

create policy "users own lead sources"
on public.lead_sources for all
using (
  exists (
    select 1
    from public.companies
    where companies.id = lead_sources.company_id
      and companies.created_by = public.current_workspace_owner_id()
  )
)
with check (
  exists (
    select 1
    from public.companies
    where companies.id = lead_sources.company_id
      and companies.created_by = public.current_workspace_owner_id()
  )
);

create policy "users own lead scores"
on public.lead_scores for all
using (
  exists (
    select 1
    from public.companies
    where companies.id = lead_scores.company_id
      and companies.created_by = public.current_workspace_owner_id()
  )
)
with check (
  exists (
    select 1
    from public.companies
    where companies.id = lead_scores.company_id
      and companies.created_by = public.current_workspace_owner_id()
  )
);

create policy "users own qr demos"
on public.qr_demos for all
using (
  exists (
    select 1
    from public.companies
    where companies.id = qr_demos.company_id
      and companies.created_by = public.current_workspace_owner_id()
  )
)
with check (
  exists (
    select 1
    from public.companies
    where companies.id = qr_demos.company_id
      and companies.created_by = public.current_workspace_owner_id()
  )
);

create policy "public can view qr demos"
on public.qr_demos for select
using (true);

create policy "users own email templates"
on public.email_templates for all
using (public.current_workspace_owner_id() = created_by)
with check (public.current_workspace_owner_id() = created_by);

create policy "users own email drafts"
on public.email_drafts for all
using (public.current_workspace_owner_id() = created_by)
with check (public.current_workspace_owner_id() = created_by);

create policy "users own email sends"
on public.email_sends for all
using (
  exists (
    select 1
    from public.companies
    where companies.id = email_sends.company_id
      and companies.created_by = public.current_workspace_owner_id()
  )
)
with check (
  exists (
    select 1
    from public.companies
    where companies.id = email_sends.company_id
      and companies.created_by = public.current_workspace_owner_id()
  )
);

create policy "users own unsubscribe list"
on public.unsubscribe_list for all
using (
  company_id is null
  or exists (
    select 1
    from public.companies
    where companies.id = unsubscribe_list.company_id
      and companies.created_by = public.current_workspace_owner_id()
  )
)
with check (
  company_id is null
  or exists (
    select 1
    from public.companies
    where companies.id = unsubscribe_list.company_id
      and companies.created_by = public.current_workspace_owner_id()
  )
);

create policy "users own usage counters"
on public.usage_counters for all
using (workspace_owner_id = public.current_workspace_owner_id())
with check (workspace_owner_id = public.current_workspace_owner_id());

create policy "workspace owners manage members"
on public.workspace_members for all
using (
  workspace_owner_id = auth.uid()
  or (member_user_id = auth.uid())
  or (lower(invite_email) = lower(coalesce((select email from public.users where id = auth.uid()), '')))
)
with check (workspace_owner_id = public.current_workspace_owner_id());

create policy "workspace members can create support requests"
on public.support_requests for all
using (workspace_owner_id = public.current_workspace_owner_id() or created_by = auth.uid())
with check (workspace_owner_id = public.current_workspace_owner_id() or created_by = auth.uid());

create policy "public can insert unsubscribe"
on public.unsubscribe_list for insert
with check (email is not null);

create policy "public can update unsubscribe"
on public.unsubscribe_list for update
using (email is not null)
with check (email is not null);

-- ============================================================
-- EXPANSION PHASE 1-4: Person database, people-first lists,
-- website scraping, LinkedIn support
-- ============================================================

-- Expand contacts table with person-level fields
alter table public.contacts
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists full_name_normalized text,
  add column if not exists linkedin_url text,
  add column if not exists linkedin_slug text,
  add column if not exists job_title text,
  add column if not exists seniority text,
  add column if not exists department text,
  add column if not exists location_city text,
  add column if not exists location_country text,
  add column if not exists profile_headline text,
  add column if not exists bio text,
  add column if not exists employer_name text,
  add column if not exists work_email text,
  add column if not exists direct_phone text,
  add column if not exists mobile_phone text,
  add column if not exists linkedin_connected boolean not null default false,
  add column if not exists source_type text,
  add column if not exists source_confidence integer default 0,
  add column if not exists last_verified_at timestamptz,
  add column if not exists enrichment_status text default 'pending',
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists last_checked_at timestamptz,
  add column if not exists last_changed_at timestamptz,
  add column if not exists has_recent_changes boolean not null default false,
  add column if not exists change_summary text,
  add column if not exists role_normalized text,
  add column if not exists management_level text,
  add column if not exists is_decision_maker boolean not null default false,
  add column if not exists role_confidence integer default 0;

-- Back-fill new fields from old fields
update public.contacts
set
  job_title = coalesce(job_title, role),
  work_email = coalesce(work_email, email),
  direct_phone = coalesce(direct_phone, phone)
where true;

-- Expand companies table with refresh/coverage fields
alter table public.companies
  add column if not exists last_checked_at timestamptz,
  add column if not exists last_changed_at timestamptz,
  add column if not exists has_recent_changes boolean not null default false,
  add column if not exists change_summary text,
  add column if not exists personnel_coverage_status text default 'unknown',
  add column if not exists personnel_gap_notes text,
  add column if not exists last_personnel_audit_at timestamptz;

-- Person lists
create table if not exists public.person_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.person_list_members (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.person_lists(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (list_id, contact_id)
);

create table if not exists public.person_search_runs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.users(id) on delete cascade,
  query_label text not null,
  filters jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  result_count integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Source tracking
create table if not exists public.contact_sources (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  source_kind text not null,
  source_url text,
  source_label text,
  evidence_text text,
  created_at timestamptz not null default now()
);

-- Enrichment jobs
create table if not exists public.contact_enrichment_jobs (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  provider text not null,
  job_type text not null,
  status text not null default 'queued',
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- CRM connections
create table if not exists public.crm_connections (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.users(id) on delete cascade,
  provider text not null,
  account_label text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  crm_connection_id uuid not null references public.crm_connections(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  direction text not null,
  provider_object_type text not null,
  provider_object_id text,
  status text not null default 'queued',
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Personnel role targeting
create table if not exists public.company_role_targets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  role_bucket text not null,
  role_label text not null,
  priority integer not null default 1,
  status text not null default 'missing',
  primary_contact_id uuid references public.contacts(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, role_bucket, role_label)
);

-- Directory refresh / change tracking
create table if not exists public.directory_refresh_jobs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.users(id) on delete set null,
  job_scope text not null,
  status text not null default 'queued',
  total_targets integer not null default 0,
  processed_targets integer not null default 0,
  changed_targets integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.directory_change_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  entity_type text not null,
  change_type text not null,
  field_name text not null,
  old_value text,
  new_value text,
  source_url text,
  detected_at timestamptz not null default now(),
  refresh_job_id uuid references public.directory_refresh_jobs(id) on delete set null
);

-- Indexes
create index if not exists contacts_company_id_idx on public.contacts(company_id);
create index if not exists contacts_job_title_idx on public.contacts(job_title);
create index if not exists contacts_seniority_idx on public.contacts(seniority);
create index if not exists contacts_department_idx on public.contacts(department);
create index if not exists contacts_linkedin_url_idx on public.contacts(linkedin_url);
create index if not exists contacts_work_email_idx on public.contacts(work_email);
create index if not exists contacts_has_recent_changes_idx on public.contacts(has_recent_changes);
create index if not exists contact_sources_contact_id_idx on public.contact_sources(contact_id);
create index if not exists person_list_members_list_id_idx on public.person_list_members(list_id);
create index if not exists companies_has_recent_changes_idx on public.companies(has_recent_changes);
create index if not exists company_role_targets_company_id_idx on public.company_role_targets(company_id);
create index if not exists directory_change_events_company_id_idx on public.directory_change_events(company_id);
create index if not exists directory_change_events_contact_id_idx on public.directory_change_events(contact_id);

-- RLS for new tables
alter table public.person_lists enable row level security;
alter table public.person_list_members enable row level security;
alter table public.person_search_runs enable row level security;
alter table public.contact_sources enable row level security;
alter table public.contact_enrichment_jobs enable row level security;
alter table public.crm_connections enable row level security;
alter table public.crm_sync_jobs enable row level security;
alter table public.company_role_targets enable row level security;
alter table public.directory_refresh_jobs enable row level security;
alter table public.directory_change_events enable row level security;

create policy "users own campaigns"
on public.campaigns for all
using (public.current_workspace_owner_id() = created_by)
with check (public.current_workspace_owner_id() = created_by);

create policy "users own transactional emails"
on public.transactional_emails for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users own campaign leads"
on public.campaign_leads for all
using (
  exists (
    select 1
    from public.campaigns
    where campaigns.id = campaign_leads.campaign_id
      and campaigns.created_by = public.current_workspace_owner_id()
  )
)
with check (
  exists (
    select 1
    from public.campaigns
    where campaigns.id = campaign_leads.campaign_id
      and campaigns.created_by = public.current_workspace_owner_id()
  )
);

create policy "users own person lists"
on public.person_lists for all
using (public.current_workspace_owner_id() = created_by)
with check (public.current_workspace_owner_id() = created_by);

create policy "users own person list members"
on public.person_list_members for all
using (
  exists (
    select 1
    from public.person_lists
    where person_lists.id = person_list_members.list_id
      and person_lists.created_by = public.current_workspace_owner_id()
  )
)
with check (
  exists (
    select 1
    from public.person_lists
    where person_lists.id = person_list_members.list_id
      and person_lists.created_by = public.current_workspace_owner_id()
  )
);

create policy "users own person search runs"
on public.person_search_runs for all
using (public.current_workspace_owner_id() = created_by)
with check (public.current_workspace_owner_id() = created_by);

create policy "users own contact sources"
on public.contact_sources for all
using (
  exists (
    select 1
    from public.companies
    where companies.id = contact_sources.company_id
      and companies.created_by = public.current_workspace_owner_id()
  )
)
with check (
  exists (
    select 1
    from public.companies
    where companies.id = contact_sources.company_id
      and companies.created_by = public.current_workspace_owner_id()
  )
);

create policy "users own contact enrichment jobs"
on public.contact_enrichment_jobs for all
using (
  exists (
    select 1
    from public.companies
    where companies.id = contact_enrichment_jobs.company_id
      and companies.created_by = public.current_workspace_owner_id()
  )
)
with check (
  exists (
    select 1
    from public.companies
    where companies.id = contact_enrichment_jobs.company_id
      and companies.created_by = public.current_workspace_owner_id()
  )
);

create policy "users own crm connections"
on public.crm_connections for all
using (public.current_workspace_owner_id() = created_by)
with check (public.current_workspace_owner_id() = created_by);

create policy "users own crm sync jobs"
on public.crm_sync_jobs for all
using (
  exists (
    select 1
    from public.crm_connections
    where crm_connections.id = crm_sync_jobs.crm_connection_id
      and crm_connections.created_by = public.current_workspace_owner_id()
  )
)
with check (
  exists (
    select 1
    from public.crm_connections
    where crm_connections.id = crm_sync_jobs.crm_connection_id
      and crm_connections.created_by = public.current_workspace_owner_id()
  )
);

create policy "users own company role targets"
on public.company_role_targets for all
using (
  exists (
    select 1
    from public.companies
    where companies.id = company_role_targets.company_id
      and companies.created_by = public.current_workspace_owner_id()
  )
)
with check (
  exists (
    select 1
    from public.companies
    where companies.id = company_role_targets.company_id
      and companies.created_by = public.current_workspace_owner_id()
  )
);

create policy "users own directory refresh jobs"
on public.directory_refresh_jobs for all
using (public.current_workspace_owner_id() = created_by)
with check (public.current_workspace_owner_id() = created_by);

create policy "users own directory change events"
on public.directory_change_events for all
using (
  exists (
    select 1
    from public.companies
    where companies.id = directory_change_events.company_id
      and companies.created_by = public.current_workspace_owner_id()
  )
)
with check (
  exists (
    select 1
    from public.companies
    where companies.id = directory_change_events.company_id
      and companies.created_by = public.current_workspace_owner_id()
  )
);

create unique index if not exists companies_created_by_name_city_key
on public.companies (created_by, lower(name), coalesce(lower(city), ''));

create unique index if not exists companies_created_by_website_key
on public.companies (created_by, lower(website_url))
where website_url is not null;
