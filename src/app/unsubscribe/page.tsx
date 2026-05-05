import { createClient } from "@/lib/supabase/server";
import { workspaceCardClass, workspaceRootStyle } from "@/components/workspace-theme";

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
    <main className="flex min-h-screen items-center justify-center px-[100px] py-12" style={workspaceRootStyle}>
      <section className={`w-full max-w-lg p-8 backdrop-blur-sm ${workspaceCardClass}`}>
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Unsubscribe</p>
        <h1 className="mt-3 font-[family:var(--font-display)] text-3xl tracking-[-0.04em] text-slate-800">Stop outreach emails</h1>
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
          <button className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-[var(--primary-foreground)] transition hover:opacity-90" type="submit">
            Unsubscribe
          </button>
        </form>
      </section>
    </main>
  );
}
