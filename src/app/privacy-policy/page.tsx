import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f3ef_0%,#f2f0ea_100%)] px-4 py-10">
      <main className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-[2.25rem] border border-[#ece7de] bg-white/95 p-8 shadow-[0_20px_60px_rgba(32,24,16,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Legal</p>
              <h1 className="mt-3 font-[family:var(--font-display)] text-4xl font-semibold tracking-[-0.06em] text-slate-900">
                Privacy Policy and Terms & Conditions
              </h1>
              <p className="mt-3 text-[15px] leading-7 text-slate-600">
                This page covers how Stirling handles personal data, account use, billing language, and the core terms users must accept before entering the dashboard.
              </p>
            </div>
            <Link
              className="inline-flex items-center rounded-full border border-[#e7e1d8] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              href="/"
            >
              Back home
            </Link>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#ece7de] bg-white/95 p-8 shadow-[0_18px_50px_rgba(30,25,20,0.045)]">
          <h2 className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-900">Privacy Policy</h2>
          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
            <p>Stirling stores account details, workspace records, contact lists, campaigns, generated drafts, send history, and operational email logs needed to provide the service.</p>
            <p>We use your account email address for verification, password recovery, onboarding, billing communications, and essential transactional notices related to your workspace.</p>
            <p>Lead and outreach data entered into the platform remains tied to the signed-in account and is protected through account-scoped access rules in the application database.</p>
            <p>If you contact us about privacy, account correction, or data deletion, we may need to verify account ownership before acting on the request.</p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#ece7de] bg-white/95 p-8 shadow-[0_18px_50px_rgba(30,25,20,0.045)]" id="terms">
          <h2 className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-900">Terms and Conditions</h2>
          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
            <p>By entering the dashboard, you confirm that you are authorized to create and send outreach from your account and that you will comply with applicable marketing, privacy, and anti-spam laws in your jurisdiction.</p>
            <p>Stirling currently offers Solo and Team self-serve plans, with Stripe handling checkout, billing changes, proration, and the customer billing portal.</p>
            <p>Solo starts at $42 per month or $408 per year. Team starts at $149 per month or $1,428 per year. Enterprise uses a custom annual contract.</p>
            <p>Self-serve plans include a 2-day free trial. No refunds are offered after the trial.</p>
            <p>You are responsible for maintaining valid sender domains, inboxes, API credentials, and lawful use of contact data uploaded to or generated within the service.</p>
            <p>We may store transactional emails, including welcome emails and password-recovery related actions, to support account history and operational troubleshooting.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
