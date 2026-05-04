# Requirements: Stirling QR Lead Finder

**Defined:** 2026-05-04
**Core Value:** Find the right businesses, show them a personalised demo, send a thoughtful email — all requiring manual approval before it leaves.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign in with email and password via Supabase Auth
- [ ] **AUTH-02**: User session persists across browser refresh
- [ ] **AUTH-03**: User can sign out from any page

### Dashboard

- [ ] **DASH-01**: User can view total leads, hot leads, warm leads at a glance
- [ ] **DASH-02**: User can view emails drafted, approved, sent, opened, clicked, and replied
- [ ] **DASH-03**: User can view conversions and unsubscribes
- [ ] **DASH-04**: User can see a list of recent leads and recent email activity

### Lead Management (Manual)

- [ ] **LEAD-01**: User can manually add a company (name, website, industry, city, country)
- [ ] **LEAD-02**: User can add contacts to a company (name, role, email, phone, contact type)
- [ ] **LEAD-03**: User can view a lead detail page showing all company info, contacts, analysis, score, demos, and emails
- [ ] **LEAD-04**: User can change a lead's pipeline status (new → researched → demo created → email drafted → sent → opened → clicked → replied → converted / not interested / unsubscribed)
- [ ] **LEAD-05**: User can add notes and view an activity timeline per lead

### Lead Search

- [ ] **SRCH-01**: User can search for companies by industry, location, and search terms via a connected search API (Google Custom Search, Bing, or SerpAPI)
- [ ] **SRCH-02**: User can set a lead quantity limit and minimum score filter before searching
- [ ] **SRCH-03**: App saves discovered companies as leads without creating duplicates
- [ ] **SRCH-04**: User can see which URLs and queries produced each lead (source stored for compliance)

### Website Analysis

- [ ] **ANLZ-01**: App fetches and parses the company's website HTML to extract: business name, description, contact page, emails, phone, social links, booking links, PDF links, menu/event/product pages
- [ ] **ANLZ-02**: App identifies QR opportunity signals (PDF menus, brochures, booking pages, event pages, product manuals, price lists, review links, donation pages, printed material indicators)
- [ ] **ANLZ-03**: Extracted findings are stored in `lead_sources` with source URL

### AI Lead Scoring

- [ ] **SCOR-01**: App sends extracted website data to OpenAI and receives a score (0–100), category (hot/warm/research_more/poor_fit), QR use case, reason, recommended pitch, and confidence
- [ ] **SCOR-02**: Score and analysis are stored in `lead_scores` and the company record is updated
- [ ] **SCOR-03**: User can view the full AI score breakdown on the lead detail page

### Demo QR Campaign

- [ ] **DEMO-01**: App generates a personalised demo landing page concept for a lead using AI (headline, buttons, destination links) based on the company's industry and detected links
- [ ] **DEMO-02**: User can create and customise the demo landing page (add/remove/edit buttons and links)
- [ ] **DEMO-03**: App generates a QR code image pointing to the demo landing page
- [ ] **DEMO-04**: Demo URL and QR code are stored and accessible via a public shareable link

### Email Drafting

- [ ] **MAIL-01**: AI drafts a personalised outreach email (subject + body, under 150 words) using company analysis, QR use case, and demo link
- [ ] **MAIL-02**: Draft is stored with status `needs_review`
- [ ] **MAIL-03**: User can edit the subject and body of a draft before approving
- [ ] **MAIL-04**: User can regenerate a draft if unhappy with the AI output
- [ ] **MAIL-05**: AI can draft a follow-up email for leads that haven't replied after the first send

### Outreach Approval & Sending

- [ ] **SEND-01**: User must explicitly approve a draft before it can be sent (no auto-send)
- [ ] **SEND-02**: Before sending, app checks the suppression list and blocks send if recipient is unsubscribed
- [ ] **SEND-03**: App sends approved emails via Resend with verified sender identity and unsubscribe link
- [ ] **SEND-04**: Provider message ID and sent timestamp are stored in `email_sends`

### Compliance & Suppression

- [ ] **COMP-01**: Every contact record stores: source URL, date discovered, reason for outreach, consent/legal basis note
- [ ] **COMP-02**: Unsubscribe links in every outbound email point to a public unsubscribe page
- [ ] **COMP-03**: Clicking unsubscribe captures the email, marks the contact as unsubscribed, and adds the address to the suppression list
- [ ] **COMP-04**: Suppression list is checked before every send — suppressed addresses cannot be emailed again
- [ ] **COMP-05**: App prefers business/role emails (info@, hello@, marketing@) over personal emails

### Campaigns

- [ ] **CAMP-01**: User can create a named campaign (e.g., "Stockholm Restaurants May 2026") with a niche and location
- [ ] **CAMP-02**: User can add leads to a campaign and track campaign-level status
- [ ] **CAMP-03**: User can view campaign performance: leads, emails sent, opens, clicks, replies, conversions

## v2 Requirements

### Email Tracking

- **TRKR-01**: Open and click tracking via email provider webhooks
- **TRKR-02**: Reply detection via email inbox integration
- **TRKR-03**: Bounce handling — mark contacts as bounced and suppress future sends

### Automation

- **AUTO-01**: Auto-score leads immediately after search completes
- **AUTO-02**: Auto-create demo pages for hot leads
- **AUTO-03**: Auto-draft emails for hot leads (still requires manual approval before sending)
- **AUTO-04**: Daily sending limits to protect deliverability
- **AUTO-05**: Scheduled follow-up drafts for non-replies after N days

### Lead Enrichment

- **ENRCH-01**: Integrate Hunter.io, Apollo, or similar for business email lookup when no public email is found
- **ENRCH-02**: Integrate Wappalyzer/BuiltWith to detect existing QR or booking tech on company websites

### Advanced CRM

- **CRM-01**: Conversion funnel visualisation
- **CRM-02**: Best-performing niche and subject line reporting
- **CRM-03**: Export leads and email history to CSV

## Out of Scope

| Feature | Reason |
|---------|--------|
| Fully automated bulk sending | Legal/deliverability risk; validate manually first |
| OAuth / social login | Email/password sufficient for single-user v1 |
| Multi-user / team accounts | Single user (Eugene) in v1 |
| Mobile app | Web-first; mobile is post-MVP |
| White-label QR portal | Future feature for Stirling QR product |
| Stripe / subscription billing | Belongs in main product, not this lead tool |
| HubSpot / external CRM sync | Not needed before PMF |
| Mass email import from purchased lists | Violates anti-spam and GDPR rules |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| DASH-01 | Phase 1 | Pending |
| DASH-02 | Phase 1 | Pending |
| DASH-03 | Phase 1 | Pending |
| DASH-04 | Phase 1 | Pending |
| LEAD-01 | Phase 2 | Pending |
| LEAD-02 | Phase 2 | Pending |
| LEAD-03 | Phase 2 | Pending |
| LEAD-04 | Phase 2 | Pending |
| LEAD-05 | Phase 2 | Pending |
| SRCH-01 | Phase 3 | Pending |
| SRCH-02 | Phase 3 | Pending |
| SRCH-03 | Phase 3 | Pending |
| SRCH-04 | Phase 3 | Pending |
| ANLZ-01 | Phase 4 | Pending |
| ANLZ-02 | Phase 4 | Pending |
| ANLZ-03 | Phase 4 | Pending |
| SCOR-01 | Phase 5 | Pending |
| SCOR-02 | Phase 5 | Pending |
| SCOR-03 | Phase 5 | Pending |
| DEMO-01 | Phase 6 | Pending |
| DEMO-02 | Phase 6 | Pending |
| DEMO-03 | Phase 6 | Pending |
| DEMO-04 | Phase 6 | Pending |
| MAIL-01 | Phase 7 | Pending |
| MAIL-02 | Phase 7 | Pending |
| MAIL-03 | Phase 7 | Pending |
| MAIL-04 | Phase 7 | Pending |
| MAIL-05 | Phase 7 | Pending |
| SEND-01 | Phase 8 | Pending |
| SEND-02 | Phase 8 | Pending |
| SEND-03 | Phase 8 | Pending |
| SEND-04 | Phase 8 | Pending |
| COMP-01 | Phase 8 | Pending |
| COMP-02 | Phase 8 | Pending |
| COMP-03 | Phase 8 | Pending |
| COMP-04 | Phase 8 | Pending |
| COMP-05 | Phase 2 | Pending |
| CAMP-01 | Phase 9 | Pending |
| CAMP-02 | Phase 9 | Pending |
| CAMP-03 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 43 total
- Mapped to phases: 43
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-04*
*Last updated: 2026-05-04 after initial definition*
