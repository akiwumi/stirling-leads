create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company_name text,
  email text,
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
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

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

create policy "users own profile select"
on public.users for select
using (auth.uid() = id);

create policy "users own profile update"
on public.users for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "users own companies select"
on public.companies for select
using (auth.uid() = created_by);

create policy "users own companies insert"
on public.companies for insert
with check (auth.uid() = created_by);

create policy "users own companies update"
on public.companies for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

create policy "users own companies delete"
on public.companies for delete
using (auth.uid() = created_by);

create policy "users own contacts"
on public.contacts for all
using (
  exists (
    select 1
    from public.companies
    where companies.id = contacts.company_id
      and companies.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.companies
    where companies.id = contacts.company_id
      and companies.created_by = auth.uid()
  )
);

create policy "users own company notes"
on public.company_notes for all
using (
  auth.uid() = created_by
  and exists (
    select 1
    from public.companies
    where companies.id = company_notes.company_id
      and companies.created_by = auth.uid()
  )
)
with check (
  auth.uid() = created_by
  and exists (
    select 1
    from public.companies
    where companies.id = company_notes.company_id
      and companies.created_by = auth.uid()
  )
);

create policy "users own lead sources"
on public.lead_sources for all
using (
  exists (
    select 1
    from public.companies
    where companies.id = lead_sources.company_id
      and companies.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.companies
    where companies.id = lead_sources.company_id
      and companies.created_by = auth.uid()
  )
);

create policy "users own lead scores"
on public.lead_scores for all
using (
  exists (
    select 1
    from public.companies
    where companies.id = lead_scores.company_id
      and companies.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.companies
    where companies.id = lead_scores.company_id
      and companies.created_by = auth.uid()
  )
);

create policy "users own qr demos"
on public.qr_demos for all
using (
  exists (
    select 1
    from public.companies
    where companies.id = qr_demos.company_id
      and companies.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.companies
    where companies.id = qr_demos.company_id
      and companies.created_by = auth.uid()
  )
);

create policy "public can view qr demos"
on public.qr_demos for select
using (true);

create policy "users own email templates"
on public.email_templates for all
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

create policy "users own email drafts"
on public.email_drafts for all
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

create policy "users own email sends"
on public.email_sends for all
using (
  exists (
    select 1
    from public.companies
    where companies.id = email_sends.company_id
      and companies.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.companies
    where companies.id = email_sends.company_id
      and companies.created_by = auth.uid()
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
      and companies.created_by = auth.uid()
  )
)
with check (
  company_id is null
  or exists (
    select 1
    from public.companies
    where companies.id = unsubscribe_list.company_id
      and companies.created_by = auth.uid()
  )
);

create policy "public can insert unsubscribe"
on public.unsubscribe_list for insert
with check (email is not null);

create policy "public can update unsubscribe"
on public.unsubscribe_list for update
using (email is not null)
with check (email is not null);

create policy "users own campaigns"
on public.campaigns for all
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

create policy "users own campaign leads"
on public.campaign_leads for all
using (
  exists (
    select 1
    from public.campaigns
    where campaigns.id = campaign_leads.campaign_id
      and campaigns.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.campaigns
    where campaigns.id = campaign_leads.campaign_id
      and campaigns.created_by = auth.uid()
  )
);

create unique index if not exists companies_created_by_name_city_key
on public.companies (created_by, lower(name), coalesce(lower(city), ''));

create unique index if not exists companies_created_by_website_key
on public.companies (created_by, lower(website_url))
where website_url is not null;
