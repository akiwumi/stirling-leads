# Stirling Lead Finder — Campaign Workflow

## Phase 1 — Set Up Your Campaign Shell
**Location:** `/dashboard/outreach`

Before touching any leads, create the structures that will hold your campaign together.

1. **Create a template** — Give it a name (e.g. "Restaurants – QR menu pitch"), add subject guidance and body positioning notes. These are hints to the AI draft generator, not the final email.
2. **Create a campaign** — Name it by niche + location (e.g. "Glasgow Restaurants May 2026"), add niche and location fields, leave status as `draft`.

---

## Phase 2 — Build Your Lead List
**Location:** `/dashboard` → "Search leads" card

3. Enter a **niche** (e.g. `restaurants`) and **location** (e.g. `Glasgow`). Hit Search.
4. On the Search page, review the filtered results — aggregators and booking sites are already removed.
5. Select the companies you want, click **Done** — they're added to your directory with website, country, and industry auto-filled.
6. Repeat for different niches/locations to fill the campaign (e.g. `hotels · Glasgow`, `cafes · Glasgow`).

> You can also manually add warm leads from the "Add company" card on the dashboard.

---

## Phase 3 — Qualify Each Lead
**Location:** `/dashboard/companies/[id]`

For each lead in your list:

7. Click into a company → **"Analyze website"** — crawls the site, extracts emails, finds menu/booking/event pages, saves evidence.
8. **"Score with AI"** — requires website analysis first. Returns a score (0–100), confidence, QR use case, and recommended pitch.
9. Update the company **status** to `qualified` if the score looks good (≥75 is the analytics threshold).
10. **"Generate demo QR"** — creates a branded QR landing page demo specific to this business. You'll get a URL and QR image to include in outreach.

---

## Phase 4 — Add Contacts
**Location:** `/dashboard/companies/[id]` → "Contacts" card

11. Add the contact extracted from website analysis (the email should already be in "Website evidence"). Fill: name, role, email, contact type (`owner` / `general` / `manager`), consent basis.
12. A contact with an email address is **required** before generating a draft.

---

## Phase 5 — Generate Outreach Drafts
**Location:** `/dashboard/companies/[id]` → "Outreach" card

13. Select the **contact**, select the **campaign** you created in Phase 1, optionally select a **template**.
14. Click **"Generate outreach draft"** — AI uses the company's website evidence, AI score, and template hints to write a personalised email.
15. Repeat for every qualified lead in the campaign.

---

## Phase 6 — Review & Approve
**Location:** `/dashboard/outreach` → Draft review queue → `/dashboard/outreach/drafts/[id]`

16. Open each draft — edit subject and body as needed, then click **"Approve draft"**.
17. The draft status moves to `approved`. It won't send until explicitly triggered.

---

## Phase 7 — Send
**Location:** `/dashboard/outreach/drafts/[id]`

18. Click **"Send approved draft"** — fires via Resend API, logs a send record, marks status as sent.
19. A daily send limit is enforced (set via `DAILY_SEND_LIMIT` env var) to protect deliverability.

> **Requires:** `RESEND_API_KEY` and `RESEND_FROM_EMAIL` set in environment.

---

## Phase 8 — Log Engagement
**Location:** `/dashboard/outreach/drafts/[id]` → "Tracking" card

20. When you get a reply, come back to the draft and click **"Mark replied"**, **"Mark opened"**, etc. These are manually logged.
21. Unsubscribes are handled via `/unsubscribe` — that contact gets suppressed from future sends.

---

## Phase 9 — Analyse & Iterate
**Location:** `/dashboard/analytics`

22. Review **sector conversion rates** — which industry has the highest reply %, average AI score, and wins.
23. **Responded emails** panel shows every lead that replied — study the pattern (niche, pitch, score).
24. Use this to decide: double down on sectors with traction, drop templates that aren't converting, update status of won/lost leads back on the company profile.

---

## The Flywheel

```
Search leads → Analyze websites → AI score → Add contacts
       ↓
Generate drafts (with template + campaign)
       ↓
Review → Approve → Send
       ↓
Log opens / clicks / replies → Analytics
       ↓
Double down on what's working → Repeat
```

---

## Prerequisites Checklist

| Env var | Used for |
|---|---|
| `SERPAPI_KEY` | Lead search |
| `OPENAI_API_KEY` | AI scoring + draft generation |
| `RESEND_API_KEY` | Sending emails |
| `RESEND_FROM_EMAIL` | Sender address |

**Dependency order to remember:**
- Run **Analyze website** before **Score with AI** — scoring requires saved evidence
- Every lead that gets a draft must have a **contact with an email address**
- Draft must be **approved** before **Send approved draft** will fire
