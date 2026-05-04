# Stirling QR Lead Finder App — Full Build Plan

## 1. App Concept

**App name:** Stirling QR Lead Finder  
**Main purpose:** Help Stirling QR find companies that genuinely need dynamic QR codes, score those companies as leads, generate personalised outreach emails, create demo QR campaigns, and track sales progress.

This app should **not** be a spam bot. It should be an **AI-assisted sales assistant** that helps you find the right businesses, understand their QR-code use case, create a useful demo, and send controlled, compliant outreach.

---

## 2. The Business Problem

Your website, **www.stirling-qr.com**, allows people to generate dynamic QR codes, but after almost a month there have been no conversions.

This may mean one or more of the following:

1. The site is not yet getting enough qualified traffic.
2. Visitors do not immediately understand why they should pay for a dynamic QR code.
3. The product is too general and needs specific use cases.
4. The right businesses are not discovering the service.
5. The website needs a direct sales channel while SEO grows.

The app solves this by helping you actively find potential clients instead of waiting for them to discover the site.

---

## 3. Core Sales Positioning

Do not sell the product as simply:

> “Generate QR codes.”

That sounds generic and free.

Instead, sell:

> “Print one QR code once, change where it points anytime, and track how many people scan it.”

### Stronger positioning

**Stirling QR helps businesses avoid reprinting menus, posters, signs, labels, flyers, and packaging every time a link changes.**

---

## 4. Ideal Customers

The app should search for companies where dynamic QR codes solve a clear problem.

### 4.1 Restaurants, Cafés, Bars, and Food Trucks

**Use cases:**

- Digital menus
- Daily specials
- Seasonal menus
- Booking links
- Review links
- Loyalty offers
- Event promotions
- Allergy information
- Multilingual menus

**Good lead signals:**

- PDF menu on website
- Regular events
- Printed flyers or posters
- Active Instagram or Facebook promotions
- Seasonal offers
- Multiple locations

---

### 4.2 Real Estate Agents

**Use cases:**

- QR codes on For Sale signs
- Property brochures
- Viewing booking forms
- Virtual tours
- Lead capture forms
- Sold property redirect to similar listings

**Good lead signals:**

- Property listings
- Downloadable brochures
- Agents using printed signs
- Virtual tour links
- Multiple active listings

---

### 4.3 Event Organisers

**Use cases:**

- Event posters
- Ticket links
- Schedules
- Venue maps
- Speaker bios
- Last-minute updates
- Post-event galleries

**Good lead signals:**

- Upcoming events
- Ticket sales pages
- Posters or flyers
- Multiple events per year
- Venue partnerships

---

### 4.4 Gyms, Yoga Studios, Salons, Clinics

**Use cases:**

- Class schedules
- Booking links
- Price lists
- Review pages
- Waiver forms
- Promotional offers
- Membership signup

**Good lead signals:**

- Booking system
- Price list
- Class timetable
- Special offers
- Printed appointment cards

---

### 4.5 Museums, Galleries, Tourism, and Walking Tours

**Use cases:**

- Exhibit information
- Audio guides
- Multilingual content
- Donation pages
- Visitor feedback
- Tour maps

**Good lead signals:**

- Exhibitions
- Visitor pages
- Multilingual audience
- Historical/tourism material
- Physical signs or displays

---

### 4.6 Product Companies and Packaging Businesses

**Use cases:**

- Product manuals
- Authenticity checks
- Warranty registration
- Recipes
- Sustainability information
- Reorder pages
- Customer support

**Good lead signals:**

- Physical products
- Packaging
- Manuals
- Warranty pages
- Retail distribution

---

## 5. What the App Should Do

The app should support the following workflow:

```text
Choose a niche and location
↓
Search the web for suitable companies
↓
Extract company information
↓
Find public business contact details
↓
Analyse the website for QR-code opportunity signals
↓
Score the lead
↓
Generate a recommended pitch
↓
Create a demo QR campaign
↓
Draft a personalised email
↓
User approves email
↓
Email is sent
↓
Track opens, clicks, replies, unsubscribes, and conversions
```

---

## 6. Important Principle: Do Not Build a Spam Machine

The app should not blindly scrape thousands of emails and send mass emails.

Instead, it should:

1. Find relevant businesses.
2. Explain why each business is a fit.
3. Store the source of the information.
4. Prefer business contact emails, not private personal emails.
5. Draft personalised outreach.
6. Require approval before sending.
7. Include unsubscribe handling.
8. Keep suppression lists.
9. Avoid repeated emails to uninterested businesses.
10. Stay compliant with GDPR and anti-spam rules.

---

## 7. Recommended Tech Stack

### 7.1 Frontend

Use:

- **Next.js** — web app framework
- **React** — user interface
- **Tailwind CSS** — styling
- **shadcn/ui** — clean UI components
- **React Hook Form** — forms
- **Zod** — form validation

### 7.2 Backend

Use:

- **Supabase Postgres** — database
- **Supabase Auth** — login system
- **Supabase Edge Functions** — backend automation
- **Supabase Storage** — optional storage for demo assets
- **Supabase Row Level Security** — protect user data

### 7.3 AI

Use:

- **OpenAI API** for:
  - lead scoring
  - website summarisation
  - use-case detection
  - email drafting
  - follow-up drafting
  - campaign suggestions

### 7.4 Search and Data Sources

Recommended options:

- Google Custom Search API
- Bing Web Search API
- SerpAPI
- Google Places API, if allowed for your intended use
- Hunter.io, Apollo, Dropcontact, Prospeo, or similar for business email enrichment
- Wappalyzer/BuiltWith for website technology detection

### 7.5 Email Sending

Use:

- **Resend** for simple email sending
- **Postmark** for reliable business email delivery
- **Brevo**, **Smartlead**, **Lemlist**, or **Instantly** if you later want sales outreach features

For the MVP, start with:

> AI drafts the email, but you manually approve before sending.

---

## 8. Main App Modules

## 8.1 Dashboard

The dashboard shows the current state of the sales pipeline.

### Dashboard metrics

- Total leads found
- Hot leads
- Warm leads
- Emails drafted
- Emails approved
- Emails sent
- Open rate
- Click rate
- Reply rate
- Demo QR pages created
- Trials started
- Conversions
- Unsubscribes

---

## 8.2 Lead Search Module

This module lets you search for potential clients.

### User inputs

- Industry/niche
- Location
- Search depth
- Lead quantity limit
- Minimum lead score
- Contact type preference

### Example search filters

```text
Industry: Restaurants
Location: Stockholm
Search target: PDF menu, booking page, event pages
Lead limit: 50
Minimum score: 70
```

### Example search queries

```text
site:.se restaurant menu pdf Stockholm
site:.se café menu pdf Stockholm
site:.se "book a table" "menu" Stockholm
site:.se "event poster" "tickets"
site:.se "property viewing" "virtual tour"
site:.se "price list" "booking" "salon"
site:.se "class schedule" "yoga studio"
```

---

## 8.3 Website Analysis Module

After finding a company website, the app analyses it.

### Data to extract

- Business name
- Website URL
- Industry
- Location
- Description
- Contact page
- Email addresses
- Phone number
- Social links
- Booking links
- Menu links
- PDF links
- Event links
- Product pages
- Existing QR-code mentions

### QR opportunity signals

The app should look for:

- PDF menus
- Downloadable brochures
- Event pages
- Product manuals
- Price lists
- Booking pages
- Review links
- Donation links
- Multiple locations
- Printed marketing material
- Outdated documents
- Existing static QR usage

---

## 8.4 AI Lead Scoring Module

The AI should score each company from 0 to 100.

### Suggested score categories

| Score | Meaning |
|---|---|
| 80–100 | Hot lead |
| 60–79 | Warm lead |
| 40–59 | Needs more research |
| 0–39 | Poor fit |

### Example scoring logic

```text
+25 has PDF menu or brochure
+20 has events or promotions
+20 has physical location
+15 has obvious printed material
+15 has booking or lead capture forms
+10 has existing QR-code usage
+10 has public business email
-20 unclear business model
-30 no obvious QR use case
-40 private/personal contact only
```

### Example AI output

```text
Company: Green Table Café
Score: 84/100
Category: Hot lead

Reason:
The company has a downloadable PDF menu, seasonal lunch offers, and a booking page. A dynamic QR code would allow them to print one code and update the destination whenever the menu, offer, or campaign changes.

Recommended pitch:
Use one QR code for menu, lunch specials, booking, reviews, and seasonal offers.
```

---

## 8.5 Demo QR Campaign Module

This is one of the most important features.

Instead of only emailing a pitch, the app should create a simple demo campaign for the lead.

### Example restaurant demo

A demo landing page could include buttons for:

- Menu
- Lunch special
- Book a table
- Leave a review
- Instagram

### Example real estate demo

Buttons:

- View property
- Book a viewing
- Virtual tour
- Contact agent
- Similar properties

### Example event demo

Buttons:

- Buy tickets
- View schedule
- Venue map
- Speakers
- Follow updates

### Why this matters

A demo makes the outreach feel specific and useful.

Instead of saying:

> “Would you like to buy QR codes?”

You say:

> “I made a quick example showing how one QR code could support your menu, booking page, offers, and reviews.”

---

## 8.6 Email Drafting Module

The AI should draft personalised emails using the lead analysis.

### Email rules

Emails should be:

- Short
- Specific
- Personalised
- Based on a real observation
- Clear about who you are
- Easy to ignore
- Easy to unsubscribe from
- Not misleading
- Not too salesy

### First email template

```text
Subject: Quick idea for [Business Name]

Hi [Name/Team],

I noticed that [Business Name] uses [specific finding: a PDF menu, event page, booking page, property listings, etc.].

I run Stirling QR, a dynamic QR code tool that lets businesses print one QR code and change where it points later without reprinting. It also lets you track scans, so you can see whether a flyer, poster, menu, or campaign is being used.

For [Business Name], this could be useful for [specific use case].

I made a quick example here:
[Demo link]

Would this be useful for your team?

Best,
Eugene
Stirling QR
www.stirling-qr.com

Unsubscribe: [unsubscribe link]
```

### Follow-up email template

```text
Subject: Re: Quick idea for [Business Name]

Hi [Name/Team],

Just following up on the QR demo I sent for [Business Name].

The main idea is simple: if you print a QR code on a menu, poster, flyer, sign, or product label, you should be able to update the destination later without reprinting the code.

Here is the demo again:
[Demo link]

No problem if it is not relevant.

Best,
Eugene

Unsubscribe: [unsubscribe link]
```

---

## 8.7 Outreach Approval Module

For the MVP, every email should require manual approval.

### Email statuses

- Drafted
- Needs review
- Approved
- Sent
- Opened
- Clicked
- Replied
- Bounced
- Unsubscribed
- Not interested

### Why manual approval matters

Manual approval protects:

- Your sender reputation
- Your domain
- Your brand
- Your legal compliance
- Your relationship with potential customers

---

## 8.8 CRM Pipeline Module

Create a simple sales pipeline.

### Pipeline stages

1. New lead
2. Researched
3. Demo created
4. Email drafted
5. Email sent
6. Opened
7. Clicked
8. Replied
9. Demo requested
10. Trial started
11. Converted
12. Not interested
13. Unsubscribed

---

## 8.9 Compliance Module

This is essential, especially because you are in Sweden/EU.

### Required compliance features

- Store source URL for every lead
- Store why the company is relevant
- Avoid private personal emails where possible
- Prefer company emails such as `info@`, `hello@`, `marketing@`, `events@`
- Include unsubscribe links
- Maintain a suppression list
- Do not email unsubscribed contacts again
- Store outreach history
- Limit email sending volume
- Include sender identity
- Include company address/contact information
- Avoid misleading subject lines
- Avoid scraping restricted/private sources

### Data to store for compliance

For every contact, store:

- Email address
- Company name
- Source URL
- Date discovered
- Reason for outreach
- Consent/legal basis note
- Email sent date
- Unsubscribe status

---

## 9. Supabase Database Schema

Below is a practical starter schema.

---

## 9.1 users

Stores app users.

```sql
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company_name text,
  email text,
  created_at timestamptz default now()
);
```

---

## 9.2 companies

Stores potential client companies.

```sql
create table companies (
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
  created_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## 9.3 contacts

Stores contact people or company contact addresses.

```sql
create table contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text,
  role text,
  email text,
  phone text,
  contact_type text,
  source_url text,
  consent_basis text,
  unsubscribed boolean default false,
  created_at timestamptz default now()
);
```

---

## 9.4 lead_sources

Stores where the app found each lead.

```sql
create table lead_sources (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  source_url text not null,
  source_type text,
  found_text text,
  created_at timestamptz default now()
);
```

---

## 9.5 lead_scores

Stores AI scoring results.

```sql
create table lead_scores (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  score integer not null,
  category text,
  qr_use_case text,
  reason text,
  confidence integer,
  ai_model text,
  created_at timestamptz default now()
);
```

---

## 9.6 qr_demos

Stores demo QR campaigns created for potential clients.

```sql
create table qr_demos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  title text,
  demo_url text,
  qr_code_url text,
  use_case text,
  landing_page_config jsonb,
  created_at timestamptz default now()
);
```

---

## 9.7 email_templates

Stores reusable email templates.

```sql
create table email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject_template text,
  body_template text,
  niche text,
  created_by uuid references users(id),
  created_at timestamptz default now()
);
```

---

## 9.8 email_drafts

Stores AI-generated emails before approval.

```sql
create table email_drafts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  subject text,
  body text,
  status text default 'needs_review',
  approved_by_user boolean default false,
  created_by uuid references users(id),
  created_at timestamptz default now()
);
```

---

## 9.9 email_sends

Stores sent email events.

```sql
create table email_sends (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid references email_drafts(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  provider_message_id text,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  bounced_at timestamptz,
  unsubscribed_at timestamptz
);
```

---

## 9.10 unsubscribe_list

Stores contacts who must never be emailed again.

```sql
create table unsubscribe_list (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  company_id uuid references companies(id) on delete set null,
  reason text,
  created_at timestamptz default now()
);
```

---

## 9.11 campaigns

Stores outreach campaigns.

```sql
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  niche text,
  location text,
  status text default 'draft',
  created_by uuid references users(id),
  created_at timestamptz default now()
);
```

---

## 9.12 campaign_leads

Connects companies to campaigns.

```sql
create table campaign_leads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  status text default 'new',
  created_at timestamptz default now()
);
```

---

## 10. Row Level Security

Enable Row Level Security on all tables.

For the first version, every row should belong to a user through `created_by` where relevant.

Example:

```sql
alter table companies enable row level security;

create policy "Users can view their own companies"
on companies for select
using (auth.uid() = created_by);

create policy "Users can insert their own companies"
on companies for insert
with check (auth.uid() = created_by);
```

Repeat similar policies for:

- companies
- contacts
- campaigns
- email_drafts
- qr_demos
- lead_scores

---

## 11. AI Prompts

## 11.1 Lead Scoring Prompt

```text
You are a B2B sales research assistant for Stirling QR, a dynamic QR code platform.

Analyse the company below and decide whether it is a good potential customer.

Company name: {{company_name}}
Website: {{website_url}}
Industry: {{industry}}
Location: {{location}}
Extracted website text: {{website_text}}
Detected links: {{links}}
Detected PDFs: {{pdfs}}

Score the lead from 0 to 100.

Look for signs that the company would benefit from dynamic QR codes, including:
- printed material
- menus
- brochures
- product packaging
- events
- booking pages
- property listings
- physical locations
- promotions
- manuals
- review pages
- donation pages
- frequently changing information

Return JSON only:
{
  "score": number,
  "category": "hot" | "warm" | "research_more" | "poor_fit",
  "qr_use_case": "string",
  "reason": "string",
  "recommended_pitch": "string",
  "confidence": number
}
```

---

## 11.2 Email Draft Prompt

```text
You are writing a short, personalised B2B outreach email for Stirling QR.

Stirling QR lets businesses create dynamic QR codes. A dynamic QR code can be printed once and later redirected to a different link without reprinting. It can also track scans.

Write a friendly, concise email to this company.

Company: {{company_name}}
Industry: {{industry}}
Specific observation: {{specific_observation}}
QR use case: {{qr_use_case}}
Demo link: {{demo_link}}
Recipient: {{recipient}}

Rules:
- Keep it under 150 words.
- Do not sound spammy.
- Mention the specific observation.
- Explain the benefit clearly.
- Include the demo link.
- Ask one simple question.
- Include a polite opt-out line.
- Do not make false claims.

Return:
Subject:
Body:
```

---

## 11.3 Demo Landing Page Prompt

```text
Create a demo QR landing page concept for the following business.

Company: {{company_name}}
Industry: {{industry}}
Website: {{website_url}}
QR use case: {{qr_use_case}}
Known links: {{known_links}}

Return JSON:
{
  "headline": "string",
  "subheadline": "string",
  "buttons": [
    { "label": "string", "url": "string", "purpose": "string" }
  ],
  "explanation": "string"
}
```

---

## 12. App Pages

## 12.1 Login Page

Purpose:

- Allow user to sign in
- Use Supabase Auth

Fields:

- Email
- Password

---

## 12.2 Dashboard Page

Purpose:

- Show overview of leads and campaigns

Sections:

- Lead stats
- Campaign stats
- Recent leads
- Recent emails
- Hot leads
- Conversion funnel

---

## 12.3 Lead Search Page

Purpose:

- Start new searches for leads

Fields:

- Industry
- Location
- Search terms
- Lead limit
- Minimum score

Actions:

- Search leads
- Save leads
- Score leads

---

## 12.4 Lead Detail Page

Purpose:

- Review one company

Sections:

- Company information
- Website analysis
- Contact details
- Lead score
- QR opportunity
- Demo QR campaign
- Email drafts
- Activity history

---

## 12.5 Campaigns Page

Purpose:

- Manage campaigns

Sections:

- Campaign list
- Campaign status
- Number of leads
- Emails sent
- Replies
- Conversions

---

## 12.6 Email Review Page

Purpose:

- Review AI-generated emails before sending

Actions:

- Edit subject
- Edit body
- Approve
- Send
- Reject
- Regenerate

---

## 12.7 Demo QR Builder Page

Purpose:

- Create a mini landing page and QR code for each lead

Fields:

- Demo title
- Landing page headline
- Buttons
- Destination links
- QR preview

---

## 12.8 Unsubscribe Page

Purpose:

- Allow recipients to unsubscribe

Flow:

1. Recipient clicks unsubscribe link.
2. App confirms email.
3. Email is added to suppression list.
4. Contact is marked unsubscribed.
5. Future emails to that address are blocked.

---

## 13. Development Phases

# Phase 1 — Foundation

## Goal

Set up the basic app, database, authentication, and dashboard.

## Tasks

1. Create a new Next.js project.
2. Install Tailwind CSS.
3. Install shadcn/ui.
4. Create a Supabase project.
5. Add Supabase environment variables.
6. Set up Supabase Auth.
7. Create database tables.
8. Enable Row Level Security.
9. Build login page.
10. Build dashboard layout.

## Output

At the end of Phase 1, you should have a secure web app where you can log in and view an empty dashboard.

---

# Phase 2 — Manual Lead Entry

## Goal

Allow yourself to manually add companies and contacts.

## Tasks

1. Build companies table UI.
2. Build add company form.
3. Build contact form.
4. Build lead detail page.
5. Add status fields.
6. Add notes/activity history.

## Output

You can manually add leads and manage them in a simple CRM.

---

# Phase 3 — Lead Search

## Goal

Add search functionality to find companies.

## Tasks

1. Add search form.
2. Connect to Google Custom Search, Bing Search, or SerpAPI.
3. Store returned URLs.
4. Extract company names and websites.
5. Save leads into Supabase.
6. Avoid duplicate companies.

## Output

You can search for companies by niche and location and save them as leads.

---

# Phase 4 — Website Analysis

## Goal

Analyse each company website for QR-code opportunities.

## Tasks

1. Fetch website HTML.
2. Extract page title and meta description.
3. Find contact page links.
4. Find PDF links.
5. Find menu, booking, event, product, or listing pages.
6. Extract public email addresses.
7. Store findings in `lead_sources`.

## Output

Each lead has website evidence showing why it may need Stirling QR.

---

# Phase 5 — AI Lead Scoring

## Goal

Use AI to score each lead.

## Tasks

1. Create OpenAI API integration.
2. Send extracted company data to the lead scoring prompt.
3. Parse JSON response.
4. Store score in `lead_scores`.
5. Update company lead score.
6. Display score on lead detail page.

## Output

Each company receives a lead score, QR use case, and recommended pitch.

---

# Phase 6 — Demo QR Campaigns

## Goal

Create demo QR landing pages for strong leads.

## Tasks

1. Build demo QR landing page table.
2. Create demo landing page generator.
3. Add buttons and destination links.
4. Generate QR code image.
5. Store demo URL.
6. Display demo preview.

## Output

You can create a personalised demo QR campaign for each lead.

---

# Phase 7 — Email Drafting

## Goal

Generate personalised outreach emails.

## Tasks

1. Create email template table.
2. Add AI email draft generation.
3. Save drafts in `email_drafts`.
4. Build email review screen.
5. Allow editing before approval.
6. Add approval status.

## Output

The app can draft useful, personalised emails, but does not send without approval.

---

# Phase 8 — Email Sending

## Goal

Send approved emails safely.

## Tasks

1. Connect Resend or Postmark.
2. Add sender identity.
3. Add unsubscribe link.
4. Check suppression list before sending.
5. Send only approved emails.
6. Store provider message ID.
7. Log sent date.

## Output

You can send approved outreach emails and track them.

---

# Phase 9 — Tracking and CRM

## Goal

Track lead status and outreach results.

## Tasks

1. Add status pipeline.
2. Track opens/clicks if provider supports it.
3. Track replies manually or through email integration.
4. Add activity timeline.
5. Add campaign performance dashboard.

## Output

You can see which campaigns, niches, and messages perform best.

---

# Phase 10 — Automation

## Goal

Carefully automate parts of the workflow.

## Tasks

1. Auto-score leads after search.
2. Auto-create demo pages for hot leads.
3. Auto-draft emails for hot leads.
4. Keep manual approval before sending.
5. Add daily sending limits.
6. Add duplicate prevention.
7. Add unsubscribe enforcement.

## Output

The app becomes a controlled sales engine, not a spam tool.

---

## 14. Manual Steps You Must Do

Some steps cannot be fully automated.

### 14.1 Business Strategy

You must decide:

- Which niche to target first
- Which countries to target
- What pricing offer to use
- Whether to offer free trials
- Whether to create demos manually at first

### 14.2 Email Domain Setup

You must set up:

- SPF
- DKIM
- DMARC
- Verified sender domain
- Branded email address
- Reply inbox

Recommended sender examples:

```text
hello@stirling-qr.com
sales@stirling-qr.com
eugene@stirling-qr.com
```

### 14.3 Compliance Review

You should review:

- GDPR rules
- Swedish marketing rules
- Email provider acceptable use policy
- CAN-SPAM rules if emailing the US
- Unsubscribe requirements

### 14.4 Sales Copy Testing

You must test:

- Subject lines
- Niches
- Use cases
- Demo links
- Pricing offer
- Follow-up timing

---

## 15. MVP Build Order for a Novice Coder

If you are building this step by step, follow this exact order.

### Step 1

Create the Next.js app.

```bash
npx create-next-app@latest stirling-lead-finder
```

Choose:

```text
TypeScript: Yes
ESLint: Yes
Tailwind CSS: Yes
App Router: Yes
src directory: Yes
Import alias: Yes
```

---

### Step 2

Install shadcn/ui.

```bash
npx shadcn@latest init
```

Add useful components:

```bash
npx shadcn@latest add button card input textarea table badge dialog form select tabs
```

---

### Step 3

Install Supabase.

```bash
npm install @supabase/supabase-js @supabase/ssr
```

---

### Step 4

Create `.env.local`.

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
RESEND_API_KEY=your_resend_key
```

Never expose the service role key in frontend code.

---

### Step 5

Create the database tables in Supabase.

Use the schema from this document.

---

### Step 6

Build login.

Use Supabase Auth with email/password or magic link.

---

### Step 7

Build manual company entry.

Before adding AI or search, make sure you can:

- Add a company
- Add a contact
- View lead details
- Change lead status

---

### Step 8

Add AI lead scoring.

Do this before web search automation. You can paste website text manually at first.

---

### Step 9

Add email drafting.

Generate email drafts, but do not send them yet.

---

### Step 10

Add email sending.

Only send approved drafts.

---

### Step 11

Add lead search.

Only after the manual CRM and AI scoring work correctly.

---

## 16. First Niche Recommendation

Start with one niche only.

Recommended first test:

> Restaurants and cafés in Stockholm with PDF menus or regular promotions.

Why:

- Easy to understand
- Easy to find
- Clear QR use case
- Many have outdated PDFs or changing menus
- Easy to create demos

Second test:

> Real estate agents in Sweden.

Why:

- Printed signs and brochures are common
- QR codes can capture buyer leads
- Dynamic redirects are useful after a property is sold

Third test:

> Event organisers and venues.

Why:

- Posters and schedules change
- QR codes are already common
- Dynamic links are useful before, during, and after events

---

## 17. Validation Plan Before Full Automation

Before building heavy automation, validate the sales process manually.

### Test campaign

1. Pick 50 restaurants/cafés in Stockholm.
2. Find public business emails.
3. Identify one specific QR use case for each.
4. Create 10 personalised demo pages.
5. Send 50 personalised emails.
6. Track opens, clicks, replies, and conversions.
7. Improve the pitch.
8. Repeat with another niche.

### Success criteria

If 50 emails produce:

- 5+ replies, the niche is promising.
- 2+ demos requested, the offer is promising.
- 1+ paying user, build more automation.

If there are no replies, improve the offer before building more features.

---

## 18. Pricing Ideas to Test

Possible offers:

### Offer 1 — Simple Monthly

```text
€9/month for 10 dynamic QR codes
```

### Offer 2 — Small Business Pack

```text
€19/month for 50 dynamic QR codes, scan analytics, and branded landing pages
```

### Offer 3 — Restaurant Pack

```text
€15/month for menu QR, booking QR, reviews QR, and offers QR
```

### Offer 4 — Real Estate Pack

```text
€29/month for property QR campaigns, viewing links, and lead tracking
```

### Offer 5 — Done-for-You Setup

```text
€49 one-time setup + €9/month
```

This may be easiest to sell because many small businesses do not want to set things up themselves.

---

## 19. Key Risks

### 19.1 Legal Risk

Cold outreach can create legal issues if done badly.

Reduce risk by:

- Contacting only relevant businesses
- Using public business contact details
- Including unsubscribe links
- Keeping records
- Avoiding repeated emails

---

### 19.2 Email Deliverability Risk

Sending too many emails too quickly can hurt your domain.

Reduce risk by:

- Starting with low volume
- Setting SPF, DKIM, and DMARC
- Using a dedicated sending domain or subdomain
- Keeping emails personalised
- Avoiding spam words
- Not buying random email lists

---

### 19.3 Product Positioning Risk

QR code generators are common.

Reduce risk by:

- Selling specific business outcomes
- Creating niche landing pages
- Offering demo QR campaigns
- Focusing on dynamic redirects and scan analytics

---

## 20. Future Features

After the MVP works, consider adding:

- AI website audit for QR opportunities
- Automatic niche campaign creation
- Landing page templates by industry
- QR coupon campaigns
- QR lottery campaigns
- QR wallet passes
- QR scan heatmaps
- Team accounts
- White-label QR portals
- CRM integration
- HubSpot integration
- Stripe subscription integration
- Multi-language outreach
- Swedish, English, German, and French email templates

---

## 21. Suggested Folder Structure

```text
stirling-lead-finder/
  src/
    app/
      dashboard/
      leads/
      leads/[id]/
      campaigns/
      emails/
      demos/
      unsubscribe/
      login/
    components/
      dashboard/
      leads/
      campaigns/
      emails/
      demos/
      ui/
    lib/
      supabase/
      openai/
      email/
      search/
      scoring/
      compliance/
    types/
      database.ts
      lead.ts
      campaign.ts
      email.ts
    utils/
      dedupe.ts
      extractEmails.ts
      scoreLead.ts
      generateDemo.ts
```

---

## 22. Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
RESEND_API_KEY=
SEARCH_API_KEY=
APP_URL=https://your-app-url.com
UNSUBSCRIBE_SECRET=
```

---

## 23. Final Recommendation

Build this app, but keep the first version simple.

The first version should be:

> A private AI-assisted lead research and outreach tool for Stirling QR.

Do not start with full automation.

Start with:

1. Manual lead entry
2. AI scoring
3. Demo QR page creation
4. AI email drafting
5. Manual approval
6. Controlled sending
7. CRM tracking

Only automate lead search and bulk outreach after the message and niche have been validated.

The strongest sales hook is:

> “I made a quick demo showing how one printed QR code could support your menu, booking page, review link, and latest offers — without reprinting anything.”

That is much more powerful than saying:

> “Do you need a QR code generator?”

---

# End of Build Plan
