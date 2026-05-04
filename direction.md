# Direction

Exactly the phase order in the roadmap — it's already sequenced for you. Here's the reasoning behind the order:

## Phase 1 → Foundation & Dashboard

Nothing else can run without auth and the database schema. Do this first.

## Phase 2 → Manual Lead CRM

Build the ability to manually add leads *before* automating anything. This forces you to understand the data model and gives you a working tool even if later phases break.

## Phase 3 → Lead Search

Automated search only makes sense once you have somewhere to put the results. Phase 2 gives you that.

## Phase 4 → Website Analysis

Fetching and parsing sites needs companies to already exist (from Phase 2 or 3). Analysis feeds into scoring.

## Phase 5 → AI Scoring

Scoring needs the analysis data from Phase 4 as input. Don't try to score without evidence.

## Phase 6 → Demo QR Campaigns

The demo link needs to exist *before* you draft the email — you include it in the email body. So demos come before drafts.

## Phase 7 → Email Drafting

The AI email prompt references the demo link and the AI scoring pitch. Both must exist first.

## Phase 8 → Email Sending & Compliance

Sending requires: a drafted email, a suppression list, a verified sender domain, and an unsubscribe page. All of this comes together here. **This is also the phase where you need your manual setup done** (SPF/DKIM/DMARC, Resend account).

## Phase 9 → Campaigns & CRM Tracking

Grouping leads into campaigns and tracking performance only makes sense after you've actually sent some emails and have data to track.

## Key Discipline

After Phase 8 works and you've sent 50 emails manually, *check the results before building any more automation.* If the message resonates, then invest in automation. If it doesn't, the offer or niche needs to change first — and you want to know that before spending time on Phase 10+.
