import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/server";

import { createCompany, searchCompanies, signOut } from "./actions";

const errorMessages: Record<string, string> = {
  company_create_failed: "Could not save the company.",
  company_name_required: "Company name is required.",
  missing_serpapi_key: "Add SERPAPI_KEY to your environment before using lead search.",
  search_failed: "Search provider request failed.",
  search_fields_required: "Enter both niche and location.",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; search?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: companies }, { count: companyCount }, { count: draftCount }, { count: sendCount }] = await Promise.all([
    supabase.from("users").select("full_name, company_name, email").eq("id", user.id).maybeSingle(),
    supabase.from("companies").select("id, name, website_url, industry, city, country, status, created_at").order("created_at", { ascending: false }),
    supabase.from("companies").select("*", { count: "exact", head: true }),
    supabase.from("email_drafts").select("*", { count: "exact", head: true }),
    supabase.from("email_sends").select("*", { count: "exact", head: true }),
  ]);

  const displayName = profile?.full_name || user.email || "Stirling user";
  const companyName = profile?.company_name || "Stirling QR";
  const errorMessage = params.error ? errorMessages[params.error] : null;

  return (
    <main className="min-h-screen px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 rounded-[2rem] border bg-white/80 p-6 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Lead CRM</p>
            <h1 className="mt-2 text-3xl font-semibold">{companyName}</h1>
            <p className="mt-2 text-[var(--muted-foreground)]">Signed in as {displayName}. Lead discovery, scoring, demos, drafting, sending, and tracking now live in one workflow.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/outreach">
              <Button variant="outline">Open outreach</Button>
            </Link>
            <form action={signOut}>
              <Button variant="outline" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </header>

        {errorMessage ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}
        {params.search ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Search saved for: {params.search}</p> : null}

        <section className="grid gap-5 md:grid-cols-3">
          <DashboardCard title="Companies" value={String(companyCount ?? 0)} description="Manual and search-imported leads." />
          <DashboardCard title="Drafts" value={String(draftCount ?? 0)} description="Generated outreach drafts awaiting review or already sent." />
          <DashboardCard title="Sends" value={String(sendCount ?? 0)} description="Tracked outreach events across campaigns." />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add company</CardTitle>
                <CardDescription>Manual lead entry for the CRM workflow in Phase 2.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createCompany} className="grid gap-3">
                  <Input name="name" placeholder="Business name" required />
                  <Input name="websiteUrl" placeholder="Website URL" />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input name="industry" placeholder="Industry" />
                    <Input name="status" placeholder="Status" defaultValue="new" />
                    <Input name="city" placeholder="City" />
                    <Input name="country" placeholder="Country" defaultValue="Sweden" />
                  </div>
                  <Textarea name="description" placeholder="Short note on the business and why it may fit Stirling QR." />
                  <Button type="submit">Create company</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Search leads</CardTitle>
                <CardDescription>Phase 3 search intake via SerpAPI. Saves URLs into `lead_sources` and skips duplicate websites.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={searchCompanies} className="grid gap-3">
                  <Input name="niche" placeholder="Niche: restaurants, estate agents, venues" required />
                  <Input name="location" placeholder="Location: Stirling, Glasgow, Stockholm" required />
                  <Button type="submit">Search and save leads</Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Companies</CardTitle>
              <CardDescription>Lead list with status and quick drill-down into each record.</CardDescription>
            </CardHeader>
            <CardContent>
              {(companies ?? []).length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-sm text-[var(--muted-foreground)]">
                  No companies yet. Add one manually or import them from search.
                </div>
              ) : (
                <div className="space-y-3">
                  {(companies ?? []).map((company) => (
                    <Link
                      className="block rounded-2xl border p-4 transition hover:border-[var(--primary)] hover:bg-white"
                      href={`/dashboard/companies/${company.id}`}
                      key={company.id}
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                            {[company.industry, company.city, company.country].filter(Boolean).join(" · ") || "No location yet"}
                          </p>
                          {company.website_url ? <p className="mt-2 text-sm text-[var(--primary)]">{company.website_url}</p> : null}
                        </div>
                        <span className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                          {company.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function DashboardCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-4xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[var(--muted-foreground)]">{description}</p>
      </CardContent>
    </Card>
  );
}
