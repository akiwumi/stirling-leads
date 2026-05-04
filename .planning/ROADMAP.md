# Roadmap: Stirling QR Lead Finder

**Project:** Stirling QR Lead Finder
**Phases:** 9
**Requirements mapped:** 43 / 43 ✓
**Created:** 2026-05-04

---

## Phase Summary

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|-----------------|
| 1 | Foundation & Dashboard | Secure app with login and live dashboard | AUTH-01–03, DASH-01–04 | 3 |
| 2 | Manual Lead CRM | Add and manage leads without any automation | LEAD-01–05, COMP-05 | 3 |
| 3 | Lead Search | Find companies via search API and save them | SRCH-01–04 | 3 |
| 4 | Website Analysis | Extract QR opportunity signals from company sites | ANLZ-01–03 | 3 |
| 5 | AI Lead Scoring | Score each lead with AI and display full breakdown | SCOR-01–03 | 3 |
| 6 | Demo QR Campaigns | Create personalised demo landing pages and QR codes | DEMO-01–04 | 3 |
| 7 | Email Drafting | Draft and edit personalised outreach emails with AI | MAIL-01–05 | 3 |
| 8 | Email Sending & Compliance | Send approved emails safely with full compliance | SEND-01–04, COMP-01–04 | 4 |
| 9 | Campaigns & CRM Tracking | Organise leads into campaigns and track performance | CAMP-01–03 | 3 |

---

## Phase Details

---

### Phase 1: Foundation & Dashboard

**Goal:** A secure Next.js app where the user can log in and view a dashboard with real-time pipeline metrics.

**Requirements:** AUTH-01, AUTH-02, AUTH-03, DASH-01, DASH-02, DASH-03, DASH-04

**UI hint**: yes

**Success criteria:**
1. User can sign in with email/password and be redirected to the dashboard — session survives a browser refresh and sign-out works
2. Dashboard displays correct counts for total leads, hot leads, warm leads, emails drafted/sent/opened/replied, and conversions (zeros are fine at this stage)
3. Dashboard shows a recent leads list and recent email activity list (empty states are acceptable)

**Plans:**
- Plan A: Project scaffolding — Next.js, Tailwind, shadcn/ui, Supabase client setup, environment variables
- Plan B: Supabase database schema — create all tables (users, companies, contacts, lead_sources, lead_scores, qr_demos, email_templates, email_drafts, email_sends, unsubscribe_list, campaigns, campaign_leads), enable Row Level Security, write RLS policies
- Plan C: Auth — login page, Supabase Auth integration, session middleware, protected routes
- Plan D: Dashboard UI — metrics cards, recent leads table, recent emails table, empty states

**Dependencies:** None

---

### Phase 2: Manual Lead CRM

**Goal:** User can manually add companies and contacts, view a lead detail page, update pipeline status, and write notes — a fully functional manual CRM before any automation.

**Requirements:** LEAD-01, LEAD-02, LEAD-03, LEAD-04, LEAD-05, COMP-05

**UI hint**: yes

**Success criteria:**
1. User can add a company with all fields, add one or more contacts (preferring business emails), and see them appear in a leads list
2. Lead detail page shows company info, all contacts, pipeline status selector, and an activity timeline
3. User can move a lead through every pipeline stage and add a note that appears in the activity timeline

**Plans:**
- Plan A: Companies CRUD — add company form, companies list page, delete/edit company
- Plan B: Contacts CRUD — add contact form on lead detail, contact type and email preference enforcement (business emails preferred)
- Plan C: Lead detail page — tabbed layout with info, contacts, status, notes, activity timeline
- Plan D: Pipeline status — status selector with all 13 stages, status change logging to activity timeline

**Dependencies:** Phase 1

---

### Phase 3: Lead Search

**Goal:** User can enter a niche, location, and search terms; app queries a search API and saves discovered companies as new leads without duplicates.

**Requirements:** SRCH-01, SRCH-02, SRCH-03, SRCH-04

**UI hint**: yes

**Success criteria:**
1. User submits a search form (industry, location, limit, minimum score placeholder) and sees a list of returned company URLs and names
2. Selected results are saved to Supabase as companies with source URL stored — no duplicates created for already-known websites
3. Each saved lead shows its originating search query and source URL on the lead detail page

**Plans:**
- Plan A: Search API integration — connect SerpAPI (or Google Custom Search / Bing), build query construction logic for niche + location, return results
- Plan B: Search UI — search form with industry, location, search terms, limit, minimum score fields; results preview before saving
- Plan C: Lead deduplication and save — check existing companies by website URL before inserting; store `lead_sources` record with source URL and query

**Dependencies:** Phase 2

---

### Phase 4: Website Analysis

**Goal:** For each lead, app fetches the company website and extracts QR opportunity signals, contact details, and relevant links — stored as evidence for scoring.

**Requirements:** ANLZ-01, ANLZ-02, ANLZ-03

**Success criteria:**
1. App can fetch and parse a company website URL and extract: page title, description, email addresses, phone, social links, booking links, PDF links, menu/event/product page links
2. App identifies and flags at least 5 QR opportunity signal types (PDF menu, booking page, event page, price list, review link)
3. All findings are stored in `lead_sources` with the source URL, and are displayed on the lead detail page

**Plans:**
- Plan A: Website fetcher — server-side HTML fetch (Supabase Edge Function or Next.js API route), HTML parser, extract structured data (emails, links, PDFs, keywords)
- Plan B: QR signal detector — rule-based scoring of extracted links/keywords against opportunity signal taxonomy (menu, booking, events, products, manuals, reviews, donations, printed material)
- Plan C: Analysis UI — "Website Analysis" tab on lead detail page showing extracted data, detected signals, and raw findings

**Dependencies:** Phase 2

---

### Phase 5: AI Lead Scoring

**Goal:** AI scores each lead 0–100 using extracted website data, assigning a category, QR use case, reason, and recommended pitch.

**Requirements:** SCOR-01, SCOR-02, SCOR-03

**Success criteria:**
1. Clicking "Score Lead" sends extracted website data to OpenAI and returns a valid JSON response with score, category, qr_use_case, reason, recommended_pitch, and confidence
2. Score and analysis are stored in `lead_scores`; the company record shows updated lead_score and lead_temperature
3. Lead detail page displays the full AI breakdown — score badge, category, use case, reason, recommended pitch, confidence

**Plans:**
- Plan A: OpenAI integration — API client setup, lead scoring prompt implementation, JSON response parsing and validation
- Plan B: Score storage and company update — write to `lead_scores`, update `companies.lead_score` and `lead_temperature`
- Plan C: Score UI — score badge (colour-coded by category), full breakdown panel on lead detail page, "Score Lead" trigger button

**Dependencies:** Phase 4

---

### Phase 6: Demo QR Campaigns

**Goal:** User can generate a personalised demo QR landing page for a lead — AI suggests the structure, user customises it, a QR code is generated, and the demo is publicly accessible.

**Requirements:** DEMO-01, DEMO-02, DEMO-03, DEMO-04

**UI hint**: yes

**Success criteria:**
1. Clicking "Generate Demo" calls OpenAI with company context and returns a landing page config (headline, subheadline, buttons with labels and URLs)
2. User can add, remove, and edit buttons on the demo landing page before saving
3. A QR code image is generated pointing to the demo URL, both are stored in `qr_demos`, and the demo is accessible at a public shareable URL without login

**Plans:**
- Plan A: Demo generation AI — OpenAI prompt for landing page config, JSON parsing, initial demo creation from AI output
- Plan B: Demo editor UI — landing page builder with editable headline, button list (add/remove/edit label+URL), live preview
- Plan C: Public demo page — publicly accessible route `/demo/[id]` rendering the demo landing page with the configured buttons
- Plan D: QR code generation — integrate a QR code library (e.g., `qrcode` npm package), generate PNG, store URL in `qr_demos`

**Dependencies:** Phase 5

---

### Phase 7: Email Drafting

**Goal:** AI drafts a personalised outreach email for each lead using company analysis, QR use case, and demo link — user can edit, regenerate, or draft a follow-up.

**Requirements:** MAIL-01, MAIL-02, MAIL-03, MAIL-04, MAIL-05

**UI hint**: yes

**Success criteria:**
1. Clicking "Draft Email" produces a subject and body (under 150 words) referencing a specific observation about the company and linking to the demo — stored with status `needs_review`
2. User can edit subject and body inline and save changes; user can click "Regenerate" to produce a new AI draft
3. User can generate a follow-up email draft for a lead whose first email has been sent but not replied to

**Plans:**
- Plan A: Email draft AI — OpenAI email drafting prompt, follow-up prompt, JSON response parsing, draft storage in `email_drafts`
- Plan B: Email review UI — draft editor with editable subject/body, character/word count, regenerate button, approve button
- Plan C: Follow-up flow — detect leads with sent-but-no-reply status, surface them for follow-up, generate follow-up draft using second prompt template

**Dependencies:** Phase 6

---

### Phase 8: Email Sending & Compliance

**Goal:** Approved emails are sent via Resend with verified sender identity, unsubscribe links, and full compliance record-keeping. Suppression list enforced on every send.

**Requirements:** SEND-01, SEND-02, SEND-03, SEND-04, COMP-01, COMP-02, COMP-03, COMP-04

**Success criteria:**
1. "Send" button is only enabled when draft status is `approved`; clicking Send checks the suppression list first and blocks if the recipient is suppressed
2. Email is sent via Resend with correct from-address, subject, HTML body with unsubscribe link; provider message ID and sent timestamp stored in `email_sends`
3. Clicking the unsubscribe link marks the contact as unsubscribed, adds the address to `unsubscribe_list`, and prevents future sends to that address
4. Every contact record stores source URL, date discovered, reason for outreach, and consent/legal basis note — visible on lead detail

**Plans:**
- Plan A: Resend integration — API client, send email function, from-address and reply-to config, store provider_message_id
- Plan B: Suppression check — pre-send query against `unsubscribe_list`, block and surface reason if suppressed
- Plan C: Unsubscribe flow — public `/unsubscribe` route accepting signed token, confirms email, writes to suppression list, marks contact record
- Plan D: Compliance fields — ensure all contact creation forms capture source URL, reason, consent basis; display compliance panel on lead detail

**Dependencies:** Phase 7

---

### Phase 9: Campaigns & CRM Tracking

**Goal:** User can group leads into named campaigns, track campaign-level performance, and see funnel metrics — completing the CRM loop.

**Requirements:** CAMP-01, CAMP-02, CAMP-03

**UI hint**: yes

**Success criteria:**
1. User can create a campaign with a name, niche, and location, and add leads to it from the leads list
2. Campaigns list page shows each campaign with lead count, emails sent, opens, clicks, replies, and conversions
3. Dashboard funnel metrics update to reflect campaign data — user can drill into a campaign to see its leads and email activity

**Plans:**
- Plan A: Campaign CRUD — create/edit/delete campaigns, add/remove leads from campaign via `campaign_leads`
- Plan B: Campaigns list UI — campaigns page with performance metrics per campaign, status indicator
- Plan C: Campaign detail page — list of leads in campaign with their pipeline status, email activity, and conversion tracking
- Plan D: Dashboard integration — link dashboard funnel metrics to campaign data; hot leads section filterable by campaign

**Dependencies:** Phase 8

---

## Dependency Graph

```
Phase 1 (Foundation)
  └── Phase 2 (Manual CRM)
        └── Phase 3 (Lead Search)
              └── Phase 4 (Website Analysis)
                    └── Phase 5 (AI Scoring)
                          └── Phase 6 (Demo QR)
                                └── Phase 7 (Email Drafting)
                                      └── Phase 8 (Sending & Compliance)
                                            └── Phase 9 (Campaigns & CRM)
```

Each phase builds on the previous. No parallel tracks in v1 — the pipeline must be validated end-to-end before adding breadth.

---

## Manual Setup Required (Outside App Build)

These cannot be built — they must be done by Eugene:

1. **Email domain**: Set up SPF, DKIM, DMARC on stirling-qr.com; verify sender domain in Resend
2. **Compliance review**: Review GDPR, Swedish marketing law, and Resend AUP before first send
3. **API keys**: Create accounts and get keys for OpenAI, Resend, and a search API (SerpAPI recommended)
4. **Supabase project**: Create project, copy URL and anon key, enable Auth
5. **First niche decision**: Choose Stockholm restaurants/cafés as first target

---
*Roadmap created: 2026-05-04*
*Last updated: 2026-05-04 after initial creation*
