import Link from "next/link";

type ContactPageContentProps = {
  backHref?: string;
  backLabel?: string;
  formAction?: ((formData: FormData) => Promise<void>) | undefined;
  defaultEmail?: string;
  defaultName?: string;
  defaultCompanyName?: string;
};

export function ContactPageContent({
  backHref = "/",
  backLabel = "Back home",
  formAction,
  defaultEmail = "",
  defaultName = "",
  defaultCompanyName = "",
}: ContactPageContentProps) {
  return (
    <main className="space-y-8">
      <section className="rounded-[2.25rem] border border-[#ece7de] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,248,246,0.96))] p-8 shadow-[0_20px_60px_rgba(32,24,16,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Contact</p>
            <h1 className="mt-3 font-[family:var(--font-display)] text-4xl font-semibold tracking-[-0.06em] text-slate-900">
              Contact Stirling
            </h1>
            <p className="mt-3 text-[15px] leading-7 text-slate-600">
              Reach out for account support, onboarding help, billing questions, privacy requests, or general product feedback.
            </p>
          </div>
          <Link
            className="inline-flex items-center rounded-full border border-[#e7e1d8] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            href={backHref}
          >
            {backLabel}
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-[#ece7de] bg-white/95 p-6 shadow-[0_18px_50px_rgba(30,25,20,0.045)]">
          <h2 className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-900">Support details</h2>
          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
            <p><span className="font-medium text-slate-800">Email:</span> support@stirling-market-leads.com</p>
            <p><span className="font-medium text-slate-800">Billing:</span> billing@stirling-market-leads.com</p>
            <p><span className="font-medium text-slate-800">Privacy:</span> privacy@stirling-market-leads.com</p>
            <p><span className="font-medium text-slate-800">Hours:</span> Monday to Friday, 09:00-17:00 Central European Time</p>
          </div>
          <div className="mt-6 rounded-[1.5rem] border border-blue-200 bg-blue-50/70 p-4 text-sm leading-7 text-blue-900">
            Enterprise path: onboarding help, invoice billing, procurement review, multi-seat rollout, and migration support.
          </div>
        </div>

        <div className="rounded-[2rem] border border-[#ece7de] bg-white/95 p-6 shadow-[0_18px_50px_rgba(30,25,20,0.045)]">
          <h2 className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-900">What to include</h2>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
            <li>Your account email address</li>
            <li>The workspace or company name tied to the account</li>
            <li>A short summary of the issue or request</li>
            <li>Any billing, verification, or deliverability details that help us trace the problem</li>
          </ul>
          <div className="mt-6 rounded-[1.5rem] border border-[#ece7de] bg-[#fbfaf7] p-4 text-sm leading-7 text-slate-600">
            For legal or privacy requests, include enough detail for us to verify account ownership before we disclose or change account data.
          </div>
        </div>
      </section>

      {formAction ? (
        <section className="rounded-[2rem] border border-[#ece7de] bg-white/95 p-6 shadow-[0_18px_50px_rgba(30,25,20,0.045)]">
          <h2 className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-900">Send a request</h2>
          <form action={formAction} className="mt-5 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="requestType" value="enterprise" />
            <input
              name="name"
              defaultValue={defaultName}
              placeholder="Your name"
              className="flex h-11 w-full rounded-[1rem] border border-[#ece7de] bg-[#fcfbf8] px-3 py-2 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-200"
            />
            <input
              name="email"
              defaultValue={defaultEmail}
              placeholder="you@company.com"
              type="email"
              className="flex h-11 w-full rounded-[1rem] border border-[#ece7de] bg-[#fcfbf8] px-3 py-2 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-200"
            />
            <input
              name="companyName"
              defaultValue={defaultCompanyName}
              placeholder="Company name"
              className="flex h-11 w-full rounded-[1rem] border border-[#ece7de] bg-[#fcfbf8] px-3 py-2 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-200"
            />
            <input
              name="subject"
              required
              placeholder="Subject"
              className="flex h-11 w-full rounded-[1rem] border border-[#ece7de] bg-[#fcfbf8] px-3 py-2 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-200"
            />
            <textarea
              name="message"
              required
              placeholder="Describe the request, team size, billing need, or onboarding help you want."
              className="min-h-32 rounded-[1rem] border border-[#ece7de] bg-[#fcfbf8] px-3 py-2 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-200 md:col-span-2"
            />
            <div className="md:col-span-2">
              <button className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700" type="submit">
                Send request
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  );
}
