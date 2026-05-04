import { createClient } from "@/lib/supabase/server";

async function unsubscribe(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const companyId = String(formData.get("companyId") ?? "").trim() || null;

  if (!email) {
    return;
  }

  await supabase.from("unsubscribe_list").upsert(
    {
      email,
      company_id: companyId,
      reason: "user_unsubscribed",
    },
    { onConflict: "email" },
  );
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; email?: string }>;
}) {
  const query = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f7f7f2_0%,#ece8da_100%)] px-6 py-12">
      <section className="w-full max-w-lg rounded-[2rem] border bg-white/85 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur-sm">
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Unsubscribe</p>
        <h1 className="mt-3 text-3xl font-semibold">Stop outreach emails</h1>
        <p className="mt-3 text-[var(--muted-foreground)]">
          Submit your email once and Stirling Lead Finder will keep it on the suppression list.
        </p>

        <form action={unsubscribe} className="mt-8 space-y-4">
          <input name="companyId" type="hidden" value={query.company ?? ""} />
          <label className="block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            className="flex h-11 w-full rounded-xl border bg-[var(--input)] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            defaultValue={query.email ?? ""}
            id="email"
            name="email"
            required
            type="email"
          />
          <button className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)]" type="submit">
            Unsubscribe
          </button>
        </form>
      </section>
    </main>
  );
}
