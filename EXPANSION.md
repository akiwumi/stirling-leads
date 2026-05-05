# Stirling Lead Finder Expansion Plan

This document is a beginner-friendly build list for adding:

- a person-level database
- LinkedIn profile links on people records
- people-first list building
- full company personnel mapping with roles
- company-site contact scraping
- optional LinkedIn discovery/enrichment
- CRM integrations
- automated daily company/contact updates with change flags
- Excel exports organized by app-style tabs and company-contact grouping

This is a plan document. It does not change the app by itself.

## 0. Manual setup now required for the live enrichment pipeline

The app code can now run a stronger enrichment flow, but 2 external services still need real credentials in your own environment.

### Website rendering / anti-bot scraping

Recommended:

- `SCRAPER_PROVIDER=scrapingbee`
- `SCRAPER_API_KEY=...`

Why:

- many company team/contact pages are rendered with JavaScript
- many sites return incomplete HTML to normal server-side `fetch(...)`
- the app now falls back to ScrapingBee rendering when direct fetch is weak or blocked

### People enrichment / LinkedIn-style personnel discovery

Recommended:

- `PEOPLE_ENRICHMENT_PROVIDER=ninjapear`
- `PEOPLE_ENRICHMENT_API_KEY=...`

Why:

- this is the provider-backed part of the pipeline for finding likely executives and key team members
- it is safer and more reliable than trying to run brittle direct LinkedIn scraping from the app
- the app now uses the provider to enrich key roles, pull best-effort work emails, and improve company address coverage

### Environment variables to add

Add these to your real `.env.local` or hosting env:

```env
PEOPLE_ENRICHMENT_PROVIDER=ninjapear
PEOPLE_ENRICHMENT_API_KEY=your-provider-key
SCRAPER_PROVIDER=scrapingbee
SCRAPER_API_KEY=your-scraper-key
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-5.2
```

### What to test after adding keys

1. Open a company with a public website.
2. Click `Analyze website`.
3. Click `Scan team pages`.
4. Confirm:
   - `Lead details -> Address` fills in
   - people records appear with titles
   - some records include work emails when public/provider evidence exists
   - role coverage updates away from `Missing key roles` when founder / marketing / sales / operations contacts are found

### Important limitation

The app now supports a robust provider-backed enrichment pipeline, but not every company will expose:

- named staff emails
- personal phone numbers
- public LinkedIn profile URLs

So the system is now materially stronger, but it still depends on:

- what is publicly available on the company site
- what your enrichment provider can legally and reliably return

## 1. What we are building

Right now the app is mainly company-first.

You want to expand it so a user can do things like:

- find companies
- find decision-makers inside those companies
- store each person as a lead
- save their LinkedIn profile URL
- build lists like `Heads of Marketing at Series A fintech companies`

That means the app needs to become both:

- a company database
- a person database

## 2. Important warning before you build

There are 3 different data sources in your request:

1. LinkedIn
2. company websites
3. CRMs

These must not all be handled the same way.

### LinkedIn

Be careful. Direct large-scale scraping of LinkedIn can create legal, account, and reliability risk.

Safer options:

- let the user paste a LinkedIn URL manually
- let the user upload CSV exports they already have rights to use
- use a third-party enrichment/data provider with clear terms
- use a browser extension for user-assisted capture later

For Phase 1 of this expansion, I recommend:

- store LinkedIn profile URLs
- support manual paste/import
- support enrichment from company website + approved providers
- do not start with aggressive automated LinkedIn scraping

### Company websites

This is the safest source to start with.

You can scrape:

- team pages
- about pages
- leadership pages
- contact pages
- author pages
- press releases

### CRMs

Do not scrape CRMs.

Correct approach:

- connect by API
- use OAuth if supported
- import/export contacts and companies through official integrations

## 3. Recommended build order

Build this in 6 phases.

### Phase 1. Expand the database

Goal:

- support person records properly
- support LinkedIn URLs
- support richer job data
- support person-first saved lists

### Phase 2. Add person capture from company websites

Goal:

- find people from public pages
- map each person to a company
- save source URLs
- build as complete a personnel list as possible for each company

### Phase 3. Add person-first search and filtering

Goal:

- build lists around titles, seniority, department, industry, and location

### Phase 4. Add LinkedIn profile support

Goal:

- let users store and open LinkedIn profiles from the app
- optionally enrich people from approved/manual sources

### Phase 5. Add CRM integrations

Goal:

- push contacts and companies into HubSpot or Salesforce
- import existing contacts from those systems

### Phase 6. Add review, dedupe, and compliance controls

Goal:

- reduce bad data
- avoid duplicate people
- keep source tracking and consent notes
- flag companies whose personnel map is still incomplete

### Phase 7. Add daily refresh and change detection

Goal:

- re-check saved companies and contacts every day
- update records when public data changes
- flag changed records in the directory

### Phase 8. Add structured Excel export

Goal:

- export data into workbook tabs that match the app sections
- keep contacts grouped under their companies
- make it easy to search by company, person, role, and contact detail

## 4. Exact database changes to make first

Your current schema already has a `contacts` table, but it is too light for a real person database.

You have two options:

### Option A. Reuse `contacts` and expand it

Pros:

- easier
- less code migration

Cons:

- the table name `contacts` is less clear than `people`

### Option B. Create a new `people` table

Pros:

- cleaner long-term structure

Cons:

- more migration work

For a novice, I recommend `Option A`: keep `contacts` and expand it.

## 5. SQL to run in Supabase

Run this in Supabase SQL Editor after backing up your database.

This SQL:

- expands `contacts`
- adds saved people lists
- adds list membership
- adds enrichment job tracking
- adds CRM sync tracking
- adds indexes for faster person search

```sql
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
  add column if not exists updated_at timestamptz not null default now();

update public.contacts
set
  job_title = coalesce(job_title, role),
  work_email = coalesce(work_email, email),
  direct_phone = coalesce(direct_phone, phone)
where true;

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

create index if not exists contacts_company_id_idx
  on public.contacts(company_id);

create index if not exists contacts_job_title_idx
  on public.contacts(job_title);

create index if not exists contacts_seniority_idx
  on public.contacts(seniority);

create index if not exists contacts_department_idx
  on public.contacts(department);

create index if not exists contacts_linkedin_url_idx
  on public.contacts(linkedin_url);

create index if not exists contacts_work_email_idx
  on public.contacts(work_email);

create index if not exists contact_sources_contact_id_idx
  on public.contact_sources(contact_id);

create index if not exists person_list_members_list_id_idx
  on public.person_list_members(list_id);
```

Add this second SQL block too for daily refresh tracking:

```sql
alter table public.companies
  add column if not exists last_checked_at timestamptz,
  add column if not exists last_changed_at timestamptz,
  add column if not exists has_recent_changes boolean not null default false,
  add column if not exists change_summary text,
  add column if not exists personnel_coverage_status text default 'unknown',
  add column if not exists personnel_gap_notes text,
  add column if not exists last_personnel_audit_at timestamptz;

alter table public.contacts
  add column if not exists last_checked_at timestamptz,
  add column if not exists last_changed_at timestamptz,
  add column if not exists has_recent_changes boolean not null default false,
  add column if not exists change_summary text,
  add column if not exists role_normalized text,
  add column if not exists management_level text,
  add column if not exists is_decision_maker boolean not null default false,
  add column if not exists role_confidence integer default 0;

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

create index if not exists companies_has_recent_changes_idx
  on public.companies(has_recent_changes);

create index if not exists contacts_has_recent_changes_idx
  on public.contacts(has_recent_changes);

create index if not exists company_role_targets_company_id_idx
  on public.company_role_targets(company_id);

create index if not exists directory_change_events_company_id_idx
  on public.directory_change_events(company_id);

create index if not exists directory_change_events_contact_id_idx
  on public.directory_change_events(contact_id);
```

## 6. Manual database checks after running the SQL

After you run the SQL:

1. Open Supabase
2. Go to `Table Editor`
3. Check these tables exist:
   - `contacts`
   - `person_lists`
   - `person_list_members`
   - `person_search_runs`
   - `contact_sources`
   - `contact_enrichment_jobs`
   - `crm_connections`
   - `crm_sync_jobs`
   - `company_role_targets`
   - `directory_refresh_jobs`
   - `directory_change_events`
4. Open `contacts`
5. Make sure you can see the new columns like:
   - `linkedin_url`
   - `job_title`
   - `seniority`
   - `department`
   - `work_email`
   - `last_checked_at`
   - `has_recent_changes`
   - `role_normalized`
   - `management_level`

## 7. Row Level Security work you must do

Your schema file likely already has RLS policies further down.

You must update them so users can only see their own saved lists and sync jobs.

Add policies like these if they do not already exist:

```sql
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

create policy "person_lists_select_own"
on public.person_lists
for select
using (created_by = auth.uid());

create policy "person_lists_insert_own"
on public.person_lists
for insert
with check (created_by = auth.uid());

create policy "person_lists_update_own"
on public.person_lists
for update
using (created_by = auth.uid());

create policy "person_lists_delete_own"
on public.person_lists
for delete
using (created_by = auth.uid());

create policy "person_search_runs_select_own"
on public.person_search_runs
for select
using (created_by = auth.uid());

create policy "person_search_runs_insert_own"
on public.person_search_runs
for insert
with check (created_by = auth.uid());

create policy "crm_connections_select_own"
on public.crm_connections
for select
using (created_by = auth.uid());

create policy "crm_connections_insert_own"
on public.crm_connections
for insert
with check (created_by = auth.uid());

create policy "crm_connections_update_own"
on public.crm_connections
for update
using (created_by = auth.uid());

create policy "company_role_targets_select_authenticated"
on public.company_role_targets
for select
using (auth.uid() is not null);

create policy "directory_refresh_jobs_select_own"
on public.directory_refresh_jobs
for select
using (created_by = auth.uid());

create policy "directory_refresh_jobs_insert_own"
on public.directory_refresh_jobs
for insert
with check (created_by = auth.uid());
```

Important:

- only run these if equivalent policies do not already exist
- if you are unsure, check the existing RLS section first

## 8. What code files will need work

These are the main app areas likely to change.

### Search and person capture

- `src/lib/leads.ts`
- `src/lib/company-analysis.ts`
- `src/app/dashboard/search/page.tsx`
- `src/app/dashboard/search/SearchResultsClient.tsx`

### Company and contact detail pages

- `src/app/dashboard/companies/[id]/page.tsx`
- `src/app/dashboard/directory/page.tsx`
- `src/app/dashboard/actions.ts`

### New person-first pages you should add

- `src/app/dashboard/people/page.tsx`
- `src/app/dashboard/people/[id]/page.tsx`
- `src/app/dashboard/lists/page.tsx`
- `src/app/dashboard/lists/[id]/page.tsx`

### CRM integration code

- `src/lib/crm/hubspot.ts`
- `src/lib/crm/salesforce.ts`
- `src/app/dashboard/integrations/page.tsx`

### Daily refresh and change flag code

- `src/lib/directory-refresh.ts`
- `src/lib/change-detection.ts`
- `src/app/dashboard/directory/page.tsx`
- `src/app/dashboard/companies/[id]/page.tsx`
- `src/app/dashboard/people/[id]/page.tsx`

### Personnel coverage code

- `src/lib/personnel-mapper.ts`
- `src/lib/role-normalizer.ts`
- `src/app/dashboard/companies/[id]/page.tsx`
- `src/app/dashboard/people/page.tsx`

### Excel export code

- `src/app/dashboard/export/route.ts`
- `src/lib/export/workbook.ts`
- `src/lib/export/company-sheet.ts`
- `src/lib/export/people-sheet.ts`

## 9. Build checklist for Phase 1: person database

Do these first.

1. Run the SQL in Section 5.
2. Update TypeScript types if you have generated Supabase types.
3. Update all contact create/edit forms to use:
   - `job_title`
   - `linkedin_url`
   - `department`
   - `seniority`
   - `work_email`
4. Keep old fields temporarily:
   - `role`
   - `email`
   - `phone`
5. In the UI, show a clear person card with:
   - full name
   - company
   - title
   - normalized role
    - LinkedIn link
    - email
    - phone
    - source
   - changed/not changed status

## 10. Build checklist for Phase 2: scrape company websites for people

Start here before doing anything advanced with LinkedIn.

### What to scrape

Search these page patterns:

- `/about`
- `/team`
- `/our-team`
- `/leadership`
- `/company`
- `/contact`

### What to extract

For each person found, try to capture:

- full name
- job title
- normalized role
- company name
- LinkedIn URL if linked on the page
- email if public
- phone if public
- source page URL

### Manual steps

1. Decide whether you will use:
   - built-in fetch and HTML parsing
   - a scraping service
2. Add environment variables for that service if needed.
3. Test on 5 companies first.
4. Save every source page URL in `contact_sources`.
5. Add a manual review step before bulk saving contacts.
6. For each company, compare found people against required role targets.
7. Mark the company as:
   - `complete`
   - `partial`
   - `missing_key_roles`

### Beginner note

Do not start by scraping the entire web.

Start with:

- one company
- one page
- one extraction result

Then expand.

## 11. Build checklist for Phase 3: people-first list building

This is the feature that turns the app from company finder into outbound lead builder.

### Filters to support

Add filters for:

- job title contains
- normalized role
- seniority
- department
- company industry
- company city
- company country
- lead score
- has LinkedIn URL
- has email
- recently verified

### Example saved lists the UI should support

- `Heads of Marketing at fintech companies in Stockholm`
- `Founders at restaurants with multi-location websites`
- `Sales Directors at companies with QR code use cases`

### Manual steps

1. Add a new dashboard page called `People`.
2. Add filter controls.
3. Add a `Save as list` button.
4. Save the filter JSON into `person_search_runs`.
5. Save list membership into `person_list_members`.

## 12. Build checklist for full company personnel mapping

This is the part that makes sure each company has a real contact map instead of one random person.

### What "full personnel contact list" should mean in version 1

Do not try to find every employee at large companies.

For version 1, "full" should mean:

- all clearly public decision-makers
- all clearly public team members on the company site
- all key business roles needed for outreach

### Minimum role targets per company

Create target role buckets like:

- Founder / Owner
- CEO / Managing Director
- Marketing
- Sales / Business Development
- Operations
- Customer Success / Support

Not every company will have every role.

For very small businesses, one person may cover multiple roles.

### What to store for each person

At minimum store:

- full name
- displayed job title
- normalized role
- management level
- LinkedIn URL if known
- work email if public
- phone if public
- source page URL
- confidence score

### What to store for each company

At minimum store:

- personnel coverage status
- which key roles were found
- which key roles are still missing
- when personnel coverage was last audited

### Manual steps

1. Add a role normalizer helper.
2. Convert raw titles like `Head of Growth` into normalized roles like `Marketing`.
3. Create default role targets when a company is added.
4. Match found contacts to those targets.
5. Flag unmatched required roles as missing.
6. Show a personnel coverage panel on the company page.
7. Add a manual `Mark role as covered` option for edge cases.

### Example company coverage states

- `complete`: all target roles found
- `partial`: some target roles found, some missing
- `missing_key_roles`: no clear decision-maker or no outreach-relevant role found

### UI behavior

On the company page show:

- `Personnel coverage: Complete / Partial / Missing key roles`
- list of found people and roles
- list of missing role targets
- button to refresh personnel mapping
- badge for decision-makers

## 13. Build checklist for Phase 4: LinkedIn profile support

This should start simple.

### Minimum version

Allow the user to:

- paste a LinkedIn profile URL into a contact
- click the link from the person page
- search for contacts that have LinkedIn URLs

### Better version

Add:

- LinkedIn URL validation
- normalized LinkedIn slug parsing
- duplicate detection by LinkedIn slug

### Manual steps

1. Add a LinkedIn field to the contact form.
2. Validate that it looks like:
   - `https://www.linkedin.com/in/...`
3. Save it to `contacts.linkedin_url`.
4. Parse the slug into `contacts.linkedin_slug`.
5. Show an `Open LinkedIn` button on the person page.

### Important warning

Do not promise users a fully automatic LinkedIn scraper until you are confident about:

- legality
- account safety
- data quality
- rate limits

## 14. Build checklist for Phase 5: CRM integrations

Do not scrape CRMs.

Use official APIs.

### Best first CRM

Start with HubSpot.

Why:

- common for small businesses
- decent API
- easier than Salesforce for a first integration

### First integration features

Build only these first:

1. Connect HubSpot account
2. Push one company to HubSpot
3. Push one contact to HubSpot
4. Store sync status
5. Show success or error in the UI

### Manual setup steps

1. Create a HubSpot developer account.
2. Create a private app or OAuth app.
3. Add the required scopes.
4. Save client ID and client secret in environment variables.
5. Add an integrations page in the dashboard.

## 15. Data cleaning rules you should add

Before bulk list building, add these rules:

### Duplicate rules

Treat contacts as possible duplicates when they share:

- same LinkedIn slug
- same work email
- same full name + same company

### Role quality rules

Normalize titles into role buckets like:

- Marketing
- Sales
- Operations
- Executive
- Support

This makes company personnel coverage measurable.

### Verification rules

Mark person data as lower confidence when:

- extracted from weak page content
- missing company match
- title looks guessed

### Source rules

Always store:

- where the person came from
- when the data was captured
- what text supported the extraction

## 16. Build checklist for daily updates and change flags

This should refresh saved directory records automatically once per day.

### What the daily job should do

For each saved company:

- re-check key public pages
- compare current values to stored values
- update fields if they changed
- log each change event
- flag the record if a change happened
- re-audit personnel coverage
- detect if key roles were added, removed, or changed

For each saved contact:

- re-check source pages or approved enrichment source
- compare title, LinkedIn URL, email, phone, and company match
- update fields if they changed
- log each change event
- flag the record if a change happened
- re-run role normalization if the title changed

### Fields worth checking daily

For companies:

- company name
- website URL
- industry
- city
- country
- description
- personnel coverage status
- personnel gap notes

For contacts:

- full name
- job title
- normalized role
- department
- seniority
- LinkedIn URL
- work email
- direct phone
- employer name

### Manual steps

1. Create a refresh service file such as `src/lib/directory-refresh.ts`.
2. Add a compare helper such as `src/lib/change-detection.ts`.
3. Create a daily scheduled job.
4. For each record, fetch fresh source data.
5. Compare old values to new values field by field.
6. If nothing changed:
   - set `last_checked_at`
   - leave `has_recent_changes` as false
7. If something changed:
   - update the record
   - set `last_checked_at`
   - set `last_changed_at`
   - set `has_recent_changes = true`
   - write a readable `change_summary`
   - insert rows into `directory_change_events`
   - if role coverage changed, update `personnel_coverage_status`

### Example change summary values

- `Job title changed from Marketing Manager to Head of Marketing`
- `LinkedIn URL added`
- `Company description updated`
- `Work email removed from source page`
- `Head of Marketing added to personnel map`
- `Founder role still missing after refresh`

### How the UI should show it

In the directory table add:

- `Last checked`
- `Last changed`
- `Changed` badge
- `Change summary`
- `Personnel coverage`

On company and person detail pages add:

- recent change timeline
- last refresh time
- manual `Refresh now` button
- missing roles panel on company pages

### Important beginner note

Do not start with live updates every minute.

Start with:

- one daily refresh job
- a small batch size
- a simple compare of text fields

Then improve it later.

## 17. Suggested UI changes

Keep this simple for a novice build.

### Add a new left-nav section

- `People`
- `Lists`
- `Integrations`
- `Updates`
- `Exports`

### On the company page

Show:

- people found at this company
- each person’s title
- each person’s normalized role
- LinkedIn link
- email
- source pages
- missing role targets
- personnel coverage badge

### On the person page

Show:

- name
- company
- title
- normalized role
- LinkedIn profile link
- email
- phone
- source history
- list memberships
- recent changes
- last checked date

## 18. Build checklist for Excel export layout

The Excel export should feel like an offline version of the app.

### Main export rule

The workbook tabs should reflect the main app sections so a non-technical user can understand the file quickly.

### Recommended workbook tabs

Create tabs like:

- `Companies`
- `People`
- `Company Contacts`
- `Lists`
- `Updates`
- `CRM Sync`

If the workbook gets too large, keep these tabs and avoid making one tab per company.

### What each tab should contain

#### `Companies`

One row per company.

Include columns like:

- Company ID
- Company Name
- Website
- Industry
- City
- Country
- Lead Score
- Personnel Coverage Status
- Missing Roles
- Last Checked
- Last Changed
- Change Summary

#### `People`

One row per person.

Include columns like:

- Contact ID
- Company ID
- Company Name
- Full Name
- Job Title
- Normalized Role
- Management Level
- Decision Maker
- LinkedIn URL
- Work Email
- Direct Phone
- Source URL
- Last Checked
- Last Changed

#### `Company Contacts`

This is the most important search sheet.

Use one row per contact, but sort the sheet by:

1. Company Name
2. Normalized Role
3. Full Name

Include columns like:

- Company Name
- Personnel Coverage Status
- Contact Full Name
- Job Title
- Normalized Role
- Department
- Decision Maker
- LinkedIn URL
- Work Email
- Direct Phone
- Mobile Phone
- Source Label
- Source URL
- Change Summary

This makes it easy to search inside one company and see:

- who works there
- what role they hold
- how to contact them

#### `Lists`

One row per saved list member.

Include:

- List Name
- Company Name
- Contact Name
- Job Title
- Normalized Role
- LinkedIn URL
- Work Email

#### `Updates`

One row per change event.

Include:

- Detected At
- Entity Type
- Company Name
- Contact Name
- Field Name
- Old Value
- New Value
- Source URL
- Refresh Job ID

#### `CRM Sync`

One row per sync job.

Include:

- Provider
- Company Name
- Contact Name
- Direction
- Object Type
- Status
- Error Message
- Created At

### Manual steps

1. Keep the current export route but expand it into workbook builders.
2. Query companies and contacts together so company names are always attached to contact rows.
3. Sort exported contacts by company name first.
4. Freeze the top row in every tab.
5. Make header names human-readable.
6. Set column widths so emails and LinkedIn URLs are readable.
7. Add workbook filters to every tab.
8. Test export with:
   - one company with one contact
   - one company with many contacts
   - many companies with mixed role coverage

### Important structure rule

Do not export contacts in a way that separates them from their company context.

Every contact row must include:

- company name
- displayed job title
- normalized role
- contact details

That makes the spreadsheet searchable even when a user does not open the app.

### Nice-to-have improvements later

Later you can add:

- color highlighting for changed rows
- color highlighting for missing key roles
- a summary tab with totals
- one optional workbook tab per selected company for very small exports

## 19. Environment variables you may need later

Do not add all of these at once unless you are using them.

```env
HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=
HUBSPOT_REDIRECT_URI=
SALESFORCE_CLIENT_ID=
SALESFORCE_CLIENT_SECRET=
SALESFORCE_REDIRECT_URI=
PEOPLE_ENRICHMENT_PROVIDER=
PEOPLE_ENRICHMENT_API_KEY=
SCRAPER_API_KEY=
```

## 20. Recommended beginner implementation order

If you want the safest path, build in this order:

1. Run the SQL
2. Add LinkedIn URL field to existing contacts
3. Add a `People` page
4. Add people filters
5. Add saved lists
6. Add website person extraction
7. Add personnel coverage tracking by role
8. Add daily refresh and change flags
9. Improve Excel export layout
10. Add dedupe rules
11. Add HubSpot integration
12. Only then consider more advanced LinkedIn automation

## 21. What not to do first

Avoid these early mistakes:

- scraping LinkedIn aggressively on day one
- building Salesforce before HubSpot
- importing thousands of unverified contacts
- skipping source tracking
- saving people without company links
- mixing private personal emails with business outreach carelessly
- running huge daily refresh batches before testing on a few records
- claiming a company is "fully mapped" when key roles are still missing
- exporting contacts into flat sheets with no company grouping

## 22. Definition of done for the first usable version

The first useful version is done when a user can:

1. open a company
2. add or import people under that company
3. save each person’s LinkedIn URL
4. filter people by title and company attributes
5. see a personnel coverage panel for each company
6. save a people list
7. open that list later
8. see which companies or contacts changed during the latest refresh
9. export Excel files with app-style tabs and company-grouped contacts
10. export or sync selected people to a CRM

## 23. My recommendation for your next coding task

Do not try to build everything in one go.

Best next build step:

- expand the `contacts` table
- add LinkedIn URL support
- add a simple `People` dashboard page

That is the smallest change that moves the app toward a real Lusha-style person database.

## 24. Pricing and billing framework

Build pricing for individuals first.

Add corporate plans only after the solo workflow converts and retains.

### Positioning

Do not sell Stirling as "cheap lead software."

Sell it as:

- one workspace for finding, scoring, drafting, and tracking outreach
- built for solo operators first
- simple enough to start alone
- expandable to team billing later

### Competitor anchor

Use the cheapest visible mainstream competitor entry pricing as the floor.

As of May 5, 2026:

- Instantly Growth monthly: `$47/month`
- Instantly Growth annual equivalent: `$37.6/month`

Target rule:

- set Stirling self-serve monthly at about 10% below the cheapest comparable monthly competitor
- set Stirling annual monthly-equivalent at about 10% below the cheapest comparable annual competitor

That gives this starting point:

- Solo monthly: `$42/month`
- Solo annual: `$408/year`
- annual equivalent: `$34/month`
- trial: `2 days`

This keeps Stirling below the cheapest competitor while still pricing it like a real revenue tool.

### Recommended plan ladder

#### Plan 1. Solo

Who it is for:

- one founder
- one freelancer
- one outbound operator
- one agency owner testing a niche

Price:

- `$42/month`
- `$408/year`
- `2-day free trial`

Include:

- full core workflow
- company search
- lead scoring
- outreach draft generation
- campaign tracking
- CSV export

Limit by usage, not by random feature removal.

Good limit types:

- monthly lead imports
- monthly AI scoring runs
- monthly outreach draft generations
- monthly send volume
- saved lists

#### Plan 2. Team

Add this after Solo works.

Who it is for:

- small agencies
- outbound teams
- SDR pods
- multi-user founder-led teams

Price:

- `$149/month`
- `$1,428/year`

Structure:

- includes up to `3 seats`
- charge for extra seats later only if needed
- higher workflow limits
- shared workspace
- shared billing owner
- team activity visibility

#### Plan 3. Enterprise

Do not overbuild this early.

Use:

- custom annual contract
- invoice billing
- manual onboarding
- priority support
- optional procurement docs

### Billing structure recommendation

Offer both monthly and annual.

Do not go annual-only yet.

Reason:

- solo buyers want low-friction entry
- annual-only reduces conversion before Stirling has strong proof
- annual can still be the default selected option in the UI

Upgrade and downgrade rules:

1. Allow upgrades anytime.
2. Apply upgrade immediately with Stripe proration.
3. Allow downgrades anytime.
4. Schedule downgrades for the next billing cycle.
5. For annual plans, do not promise cash refunds.
6. For annual to monthly switches, apply the change at renewal unless you later build manual support logic.

### Trial rule

Use a `2-day` trial, not `3-day`.

Reason:

- enough time to test core workflow
- less dead trial inventory
- faster revenue signal

### Packaging rule

Keep core features mostly the same across paid plans.

Differentiate mainly on:

- usage limits
- automation volume
- collaboration
- support level

Avoid this early:

- hiding search on lower plans
- hiding exports on lower plans
- hiding core scoring on lower plans

If the product feels crippled, self-serve conversion drops.

## 25. Easiest subscription platform

Use `Stripe`.

Best easy stack:

- Stripe Checkout
- Stripe Billing
- Stripe Customer Portal
- Stripe webhooks

Reason:

- fastest path
- easiest docs
- clean support for monthly and annual prices
- built-in trials
- built-in proration
- built-in customer billing portal
- works well with Next.js and Supabase

Do not start with:

- Paddle
- Chargebee
- Recurly
- custom card storage

Those add complexity too early.

## 26. Manual implementation needed for billing

This is the exact manual work to plan before coding.

### Stripe dashboard setup

Create:

- one `Solo Monthly` price
- one `Solo Annual` price
- one `Team Monthly` price
- one `Team Annual` price

Set:

- `2-day` trial on self-serve plans
- annual discount baked into annual price
- tax settings if needed
- portal settings for cancel and payment-method updates

Enable in the Stripe Customer Portal:

- switch monthly to annual
- switch annual to monthly
- payment-method update
- invoice history
- cancel at period end

### Database fields

Your schema already has early billing fields.

Add or confirm these fields on `users` or a dedicated `subscriptions` table:

- `stripe_customer_id`
- `stripe_subscription_id`
- `stripe_price_id`
- `plan_key`
- `billing_cycle`
- `subscription_status`
- `trial_started_at`
- `trial_ends_at`
- `current_period_start`
- `current_period_end`
- `cancel_at_period_end`
- `seats_included`
- `seat_count`

Recommended direction:

- keep user profile fields for quick reads
- add a dedicated `subscriptions` table for Stripe sync truth

### App routes to add later

Plan for these server routes:

- `POST /api/billing/checkout`
- `POST /api/billing/portal`
- `POST /api/stripe/webhook`

Purpose:

- checkout route creates Stripe Checkout session
- portal route opens Stripe billing portal
- webhook route syncs Stripe state into Supabase

### Stripe events to handle

At minimum sync these:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Webhook behavior:

- update billing state in Supabase
- keep app access in sync with Stripe
- never trust client-side billing state alone

### Access rules inside the app

Define access from subscription state.

Example:

- `trialing` -> full Solo access until `trial_ends_at`
- `active` -> paid access
- `past_due` -> soft warning, then restrict later
- `canceled` with period still active -> keep access until period end
- `incomplete` or `unpaid` -> restrict paid actions

### Usage-limit model

Do not gate on vague feature flags first.

Track concrete counters per billing period:

- leads imported
- companies analyzed
- AI scores generated
- outreach drafts generated
- emails sent
- saved lists created

This gives you a clean later upgrade path without rewriting pricing.

### Manual product copy changes needed later

Update:

- landing page pricing section
- register page plan cards
- privacy policy billing text
- welcome page trial text
- pricing constants in code
- Supabase schema trial default

Current mismatches to fix when build starts:

- current trial says `3 days`
- current monthly price says `$7`
- current annual price says `$70`
- current copy says all subscriptions have the same feature access

## 27. Numbered build phases for pricing and subscriptions

Use this order.

### Phase 1. Lock the offer

Decide and document:

1. Solo plan price
2. Team plan price
3. annual discount
4. `2-day` trial
5. upgrade and downgrade rules
6. exact usage limits per plan

Output:

- final pricing table
- final billing policy copy

### Phase 2. Prepare Stripe

Manual work:

1. create Stripe products
2. create monthly and annual prices
3. enable Customer Portal
4. configure trial settings
5. capture webhook secret

Output:

- Stripe product IDs
- Stripe price IDs
- portal config ready

### Phase 3. Prepare Supabase billing state

Manual work:

1. add Stripe fields
2. add or confirm subscription table
3. define RLS for subscription reads
4. add migration for `2-day` trial default

Output:

- migration SQL
- billing data model

### Phase 4. Build checkout flow

Manual work:

1. create checkout session route
2. connect Solo monthly and annual buttons
3. connect Team monthly and annual buttons
4. send signed-in user email to Stripe

Output:

- working hosted checkout

### Phase 5. Build webhook sync

Manual work:

1. receive Stripe webhook
2. verify webhook signature
3. upsert subscription state into Supabase
4. update trial and billing dates
5. handle cancel-at-period-end

Output:

- Stripe becomes source of truth

### Phase 6. Build in-app billing management

Manual work:

1. add billing page
2. add open-portal button
3. show plan name
4. show billing cycle
5. show renewal date
6. show trial end

Output:

- user can self-manage subscription

### Phase 7. Enforce plan limits

Manual work:

1. add usage counters
2. reset counters each billing period
3. block over-limit actions gracefully
4. show upgrade prompts

Output:

- real monetization guardrails

### Phase 8. Add the corporate layer

Only after Solo converts.

Manual work:

1. add Team workspace ownership
2. add invited members
3. add shared billing owner
4. add seat count storage
5. raise limits for team plan

Output:

- true multi-user paid layer

### Phase 9. Add enterprise sales handling

Manual work:

1. add contact sales path
2. support invoice billing manually
3. define onboarding checklist
4. define support SLA outside app first

Output:

- lightweight enterprise motion

## 28. Recommendation

Start with one serious self-serve plan and one future team layer.

If you want the simplest commercial launch:

1. launch `Solo` first at `$42/month` or `$408/year`
2. set trial to `2 days`
3. use Stripe Checkout plus Customer Portal
4. build usage tracking from day one
5. add `Team` only after Solo retention looks real

That is the easiest path with the least billing complexity and the cleanest future upgrade path.
