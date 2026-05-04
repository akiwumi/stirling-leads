# Stirling Lead Finder

Phase 1 foundation for the Stirling QR lead-finder app.

## What is included

- Next.js App Router scaffold
- Tailwind CSS setup
- shadcn-style component structure
- Supabase server-side auth flow
- Protected dashboard with manual CRM and search intake
- SQL schema and RLS policies for the documented data model

## Setup

1. Copy `.env.example` to `.env.local`.
2. Fill in your Supabase project URL and anon key.
3. Add `SERPAPI_KEY` if you want Phase 3 lead search.
4. Add `OPENAI_API_KEY` if you want Phase 5 lead scoring. Override `OPENAI_MODEL` if needed.
5. Set `NEXT_PUBLIC_APP_URL` so generated QR codes and unsubscribe links point at the right host.
6. Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` if you want live Phase 8 sending.
7. Optional Phase 10 automation vars: `ENABLE_AUTOMATION=true`, `AUTOMATION_HOT_LEAD_SCORE=75`, `DAILY_SEND_LIMIT=25`.
8. Run the SQL in `supabase/schema.sql` in Supabase SQL Editor.
9. In Supabase Auth, create at least one email/password user.
10. Install dependencies with `npm install`.
11. Start the app with `npm run dev`.

## Current success state

You can sign in, add companies manually, open a lead detail page, add contacts and notes, import leads from SerpAPI search, analyze a website for QR evidence, score a lead with OpenAI, generate a demo QR landing page, draft outreach emails, approve and send them through Resend, track campaign performance, and optionally automate hot-lead scoring/demo/draft creation with daily send limits.
