# Stirling Lead Finder Manual Instructions

This guide is written for a novice coder.

The app code is built through Phase 10.

What Phase 10 added:

- Auto-score leads after search when automation is enabled
- Auto-create demo pages for hot leads
- Auto-draft emails for hot leads
- Manual approval still required before sending
- Daily send limits
- Stronger duplicate prevention
- Unsubscribe enforcement

## 1. What you need before you start

You need accounts for:

1. Supabase
2. OpenAI
3. SerpAPI
4. Resend

You also need:

1. Node.js installed on your computer
2. This project folder on your computer
3. A domain or email address you can use for sending outreach

## 2. What each service does

- Supabase:
  Stores your users, leads, contacts, notes, drafts, campaigns, and tracking data.
- OpenAI:
  Scores leads and writes email drafts.
- SerpAPI:
  Finds companies from Google-style search results.
- Resend:
  Sends approved emails.

## 3. Environment variables you must set

Create a file called `.env.local` in the project root.

Put this in it:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SERPAPI_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.2
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=
RESEND_FROM_EMAIL=
ENABLE_AUTOMATION=false
AUTOMATION_HOT_LEAD_SCORE=75
DAILY_SEND_LIMIT=25
```

What each one means:

- `NEXT_PUBLIC_SUPABASE_URL`
  Your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  Your Supabase anon/public key.
- `SERPAPI_KEY`
  Your SerpAPI key for lead search.
- `OPENAI_API_KEY`
  Your OpenAI API key.
- `OPENAI_MODEL`
  The OpenAI model to use. Leave `gpt-5.2` unless you want a different one.
- `NEXT_PUBLIC_APP_URL`
  The full URL where the app runs.
  Examples:
  `http://localhost:3000` for local use.
  `https://yourdomain.com` for production.
- `RESEND_API_KEY`
  Your Resend API key.
- `RESEND_FROM_EMAIL`
  The email address you send from.
  Example:
  `hello@yourdomain.com`
- `ENABLE_AUTOMATION`
  Set to `true` if you want Phase 10 automation turned on.
  Leave `false` if you want to do everything manually.
- `AUTOMATION_HOT_LEAD_SCORE`
  Leads at or above this score are treated as “hot”.
  Example:
  `75`
- `DAILY_SEND_LIMIT`
  Maximum number of emails the app will send in one day.
  Example:
  `25`

## 4. How to get the Supabase values

1. Go to [Supabase](https://supabase.com)
2. Create a project
3. Open the project dashboard
4. In the left menu, open `Project Settings`
5. Open `API`
6. Copy:
   - `Project URL`
   - `anon public` key
7. Paste them into `.env.local`

## 5. How to run the SQL in Supabase

1. In Supabase, open your project
2. In the left menu, click `SQL Editor`
3. Click `New query`
4. Copy the full SQL block from section `16. Exact SQL to run`
5. Paste it into the query editor
6. Click `Run`

Important:

- If you already ran an older version of the SQL, running this updated version is still the correct thing to do.
- This SQL uses `create table if not exists` in many places, so it is designed to be re-run safely.

## 6. How to create a login user

1. In Supabase, open `Authentication`
2. Click `Users`
3. Click `Add user`
4. Choose email and password
5. Create a user you can sign in with

Example:

- Email: `you@example.com`
- Password: choose your own secure password

## 7. How to get the OpenAI API key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in
3. Open API keys
4. Create a new secret key
5. Copy it
6. Put it in `.env.local` as `OPENAI_API_KEY`

## 8. How to get the SerpAPI key

1. Go to [SerpAPI](https://serpapi.com/)
2. Create an account
3. Find your API key in the dashboard
4. Put it in `.env.local` as `SERPAPI_KEY`

## 9. How to set up Resend

1. Go to [Resend](https://resend.com/)
2. Create an account
3. Add your sending domain
4. Follow Resend’s DNS instructions
5. Wait until the domain is verified
6. Create an API key
7. Put the API key into `.env.local` as `RESEND_API_KEY`
8. Choose your sender email and put it into `.env.local` as `RESEND_FROM_EMAIL`

Examples of sender emails:

- `hello@yourdomain.com`
- `sales@yourdomain.com`
- `you@yourdomain.com`

## 10. Email domain setup you still must do manually

You must set up:

- SPF
- DKIM
- DMARC
- A verified sender domain
- A branded sender email
- A reply inbox you actually monitor

If you skip this, email sending may fail or go to spam.

## 11. Compliance checks you must do manually

Before sending real outreach, review:

1. GDPR rules
2. Swedish marketing rules
3. Resend acceptable use policy
4. CAN-SPAM rules if sending to the US
5. Unsubscribe requirements

The app includes unsubscribe handling, but legal responsibility is still yours.

## 12. How to install dependencies

Open a terminal in the project folder and run:

```bash
npm install
```

## 13. How to start the app locally

Open a terminal in the project folder and run:

```bash
npm run dev
```

Then open this in your browser:

```text
http://localhost:3000
```

## 14. How to use the app, step by step

### 14.1 Sign in

1. Open the app
2. Sign in with the Supabase user you created

### 14.2 Add a company manually

1. Go to the dashboard
2. Use `Add company`
3. Fill in the business name
4. Add the website if you know it
5. Save

### 14.3 Add a contact

1. Open the company page
2. Use the `Contacts` form
3. Add a person with an email address

Important:

- Email drafting and sending work best when the contact has a real email address.

### 14.4 Search for leads

1. On the dashboard, use `Search leads`
2. Enter a niche
3. Enter a location
4. Submit

If `ENABLE_AUTOMATION=false`:

- The app saves leads and search evidence only.

If `ENABLE_AUTOMATION=true`:

- The app also tries to:
  - analyze websites
  - score leads
  - create demo pages for hot leads
  - auto-draft emails for hot leads if a usable contact exists

### 14.5 Score a lead manually

1. Open a company page
2. Click `Analyze website`
3. Click `Score with AI`

### 14.6 Generate a demo

1. Open a company page
2. Click `Generate demo QR`

### 14.7 Generate an email draft

1. Open a company page
2. Go to `Outreach`
3. Choose a contact
4. Optionally choose a campaign
5. Optionally choose a template
6. Click `Generate outreach draft`

### 14.8 Review and approve a draft

1. Open `Outreach`
2. Open the draft
3. Edit the subject/body if needed
4. Click `Approve draft`

### 14.9 Send an approved draft

1. Open the draft review page
2. Click `Send approved draft`

Safety rules already built in:

- Draft must be approved first
- Contact must not be unsubscribed
- Email must not be on the suppression list
- The draft must not already have been sent
- The daily send limit must not be exceeded

### 14.10 Track responses

On the draft review page, you can manually mark:

- opened
- clicked
- replied
- bounced

## 15. Recommended beginner settings

If you are just starting, use these values:

```env
ENABLE_AUTOMATION=false
AUTOMATION_HOT_LEAD_SCORE=75
DAILY_SEND_LIMIT=5
```

Why:

- Keeping automation off at first makes debugging easier.
- A send limit of `5` is safer while you learn.

Later, when you trust the app more, you can try:

```env
ENABLE_AUTOMATION=true
AUTOMATION_HOT_LEAD_SCORE=75
DAILY_SEND_LIMIT=25
```

## 16. Exact SQL to run

Copy everything below and run it in Supabase SQL Editor.

```sql
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
  description text,
  status text default 'new',
  lead_score integer default 0,
  lead_temperature text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
```

## 17. Final beginner advice

Start slow.

Suggested first test:

1. Set `ENABLE_AUTOMATION=false`
2. Add one company manually
3. Add one contact manually
4. Analyze the website manually
5. Score manually
6. Generate one demo manually
7. Generate one email draft manually
8. Approve it
9. Send it to yourself first

Only turn on automation after that works.
