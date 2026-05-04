# Stirling QR Lead Finder

## What This Is

A private, AI-assisted sales tool for Stirling QR (www.stirling-qr.com) that helps find businesses that genuinely need dynamic QR codes, scores them as leads, generates personalised demo QR campaigns, drafts outreach emails, and tracks the sales pipeline. It is a controlled sales assistant — not an automated spam tool — designed to validate product-market fit through direct outreach while SEO grows.

## Core Value

Finding the right businesses, showing them a personalised demo, and sending a thoughtful email — all from one place — with every email requiring manual approval before it leaves.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can log in and access a secure dashboard
- [ ] User can manually add companies and contacts as leads
- [ ] User can search for potential clients by industry and location
- [ ] App analyses each company website for QR-code opportunity signals
- [ ] AI scores each lead 0–100 with category, use case, and pitch
- [ ] User can create a personalised demo QR landing page for each lead
- [ ] AI drafts a personalised outreach email per lead
- [ ] User reviews and approves emails before sending
- [ ] Approved emails are sent with unsubscribe links
- [ ] Unsubscribe requests are captured and suppression list is maintained
- [ ] CRM pipeline tracks lead status through the full sales funnel
- [ ] Dashboard shows pipeline metrics and email performance stats

### Out of Scope

- Fully automated bulk sending — legal risk, deliverability risk; manual approval enforced in v1
- OAuth / social login — email/password sufficient for a single-user tool
- Team accounts / multi-user — v1 is a personal sales tool for Eugene
- White-label QR portal — post-MVP feature
- HubSpot / CRM integrations — not needed before product-market fit is found
- Stripe subscription integration — belongs in the main Stirling QR product, not this tool
- Mobile app — web-first, mobile later

## Context

- The main product site (www.stirling-qr.com) has had zero conversions after ~one month
- Root cause is likely insufficient qualified traffic + unclear value proposition for specific niches
- This tool is the proactive outreach channel while SEO matures
- Recommended first niche: restaurants and cafés in Stockholm with PDF menus or regular promotions
- Second niche: real estate agents in Sweden; third: event organisers
- Compliance context: Eugene is based in Sweden / EU — GDPR and Swedish marketing rules apply
- Email domain (stirling-qr.com) requires SPF, DKIM, DMARC setup before sending
- Validation target: 50 emails → 5+ replies = promising niche; 2+ demo requests = promising offer; 1+ paying user = build more automation

## Constraints

- **Legal**: GDPR compliance required — store source URL, consent basis, reason per contact; prefer business emails (info@, hello@) over personal ones
- **Tech stack**: Next.js + React + Tailwind + shadcn/ui frontend; Supabase (Postgres, Auth, Edge Functions, RLS) backend; OpenAI API for AI; Resend for email sending
- **Email safety**: Manual approval before every send in v1; suppression list enforced; sender domain verified
- **Scope**: Single-user app (Eugene only) — no multi-tenancy needed in v1
- **Search**: Google Custom Search API, Bing Search, or SerpAPI for lead discovery

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Manual approval before every email | Protects sender reputation, domain, and GDPR compliance | — Pending |
| Supabase for backend | Covers auth, DB, edge functions, RLS in one platform — avoids separate server | — Pending |
| OpenAI for AI scoring and email drafting | Best-in-class for this use case; prompt templates already designed | — Pending |
| Resend for email delivery | Simple API, good deliverability, easy unsubscribe handling | — Pending |
| Start with restaurants/cafés in Stockholm | Easy to understand use case, clear QR value prop, easy demo creation | — Pending |
| Validate manually before automating lead search | Don't build automation until message and niche are proven | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-04 after initialization*
