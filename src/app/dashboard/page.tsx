import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, Download, Search, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceBanner, WorkspaceHero, WorkspaceMetricCard, WorkspacePill, workspaceCardClass, workspaceInsetClass } from "@/components/workspace-theme";
import { createClient } from "@/lib/supabase/server";
import { getSeatSummary, getUsageSummaries } from "@/lib/usage-limits";
import { getWorkspaceContext } from "@/lib/workspace";

import { clearCompanies, createCompany } from "./actions";

const errorMessages: Record<string, string> = {
  clear_confirmation_required: 'Type "CLEAR" before deleting the company list.',
  company_create_failed: "Could not save the company.",
  company_name_required: "Company name is required.",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ cleared?: string; error?: string; search?: string; welcome?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getWorkspaceContext(supabase, user.id);

  const [{ data: profile }, { data: companies }, { count: companyCount }, { count: draftCount }, { count: sendCount }, usageSummaries, seatSummary] = await Promise.all([
    supabase.from("users").select("full_name, company_name, email").eq("id", user.id).maybeSingle(),
    supabase.from("companies").select("id, name, website_url, industry, city, country, status, created_at").order("created_at", { ascending: false }),
    supabase.from("companies").select("*", { count: "exact", head: true }).eq("created_by", workspace.workspaceOwnerId),
    supabase.from("email_drafts").select("*", { count: "exact", head: true }).eq("created_by", workspace.workspaceOwnerId),
    supabase.from("email_sends").select("id, companies!inner(created_by)", { count: "exact", head: true }).eq("companies.created_by", workspace.workspaceOwnerId),
    getUsageSummaries(supabase, workspace.workspaceOwnerId),
    getSeatSummary(supabase, workspace.workspaceOwnerId),
  ]);

  const displayName = profile?.full_name || user.email || "Stirling user";
  const companyName = profile?.company_name || "Stirling QR";
  const errorMessage = params.error ? errorMessages[params.error] : null;
  const recentCompanies = companies ?? [];

  return (
    <main className="space-y-8">
      <WorkspaceHero
        actions={
          <>
            <Link href="/dashboard/analytics">
              <Button className="rounded-full bg-white/85 text-slate-800 hover:bg-white" type="button" variant="outline">
                <BarChart3 className="mr-2 h-4 w-4" />
                View analytics
              </Button>
            </Link>
            <Link href="/dashboard/outreach">
              <Button className="rounded-full" type="button">
                Open outreach
              </Button>
            </Link>
          </>
        }
        description={`Signed in as ${displayName}. Search real company websites, score fit, generate demos, and move the best sectors into outreach without leaving the workspace.`}
        eyebrow="Lead command center"
        title={companyName}
        tone="lavender"
      />

      {errorMessage ? <WorkspaceBanner text={errorMessage} tone="error" /> : null}
      {params.search ? <WorkspaceBanner text={`Search saved for: ${params.search}`} tone="success" /> : null}
      {params.cleared === "done" ? <WorkspaceBanner text="Company list cleared." tone="success" /> : null}
      {params.welcome === "sent" ? <WorkspaceBanner text="Welcome email sent and your dashboard is ready." tone="success" /> : null}
      {usageSummaries.some((summary) => summary.isExceeded || summary.isNearLimit) ? (
        <WorkspaceBanner
          text={`Usage watch: ${usageSummaries.filter((summary) => summary.isExceeded || summary.isNearLimit).map((summary) => `${summary.label} ${summary.used}/${summary.limit}`).join(" · ")}. Review Billing to upgrade before work is blocked.`}
          tone="warning"
        />
      ) : null}

      <section className="grid gap-5 md:grid-cols-3">
        <DashboardCard icon={<Sparkles className="h-4 w-4" />} title="Companies" value={String(companyCount ?? 0)} description="Manual and search-imported leads now tracked in one place." />
        <DashboardCard icon={<Search className="h-4 w-4" />} title="Drafts" value={String(draftCount ?? 0)} description="Generated outreach drafts waiting for review or already sent." />
        <DashboardCard icon={<BarChart3 className="h-4 w-4" />} title="Sends" value={String(sendCount ?? 0)} description="Tracked outreach activity across campaigns and categories." />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className={workspaceCardClass}>
          <CardHeader>
            <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em]">Billing period usage</CardTitle>
            <CardDescription>Limits reset automatically when the workspace moves into the next billing or trial period.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {usageSummaries.map((summary) => (
              <div key={summary.metric} className={`${workspaceInsetClass} p-4`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-800">{summary.label}</p>
                  <WorkspacePill className={summary.isExceeded ? "border-red-200 bg-red-50 text-red-700" : summary.isNearLimit ? "border-amber-200 bg-amber-50 text-amber-700" : ""}>
                    {summary.used}/{summary.limit}
                  </WorkspacePill>
                </div>
                <p className="mt-2 text-xs text-slate-500">{summary.remaining} remaining this period</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className={workspaceCardClass}>
          <CardHeader>
            <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em]">Team seats</CardTitle>
            <CardDescription>Workspace-wide access and seat occupancy for the current plan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`${workspaceInsetClass} p-4`}>
              <p className="text-sm font-medium text-slate-800">Workspace owner</p>
              <p className="mt-1 text-sm text-slate-500">{workspace.ownerProfile?.full_name || workspace.ownerProfile?.email || "Owner"}</p>
            </div>
            <div className={`${workspaceInsetClass} p-4`}>
              <p className="text-sm font-medium text-slate-800">Occupied seats</p>
              <p className="mt-1 text-sm text-slate-500">{seatSummary.occupiedSeats} of {seatSummary.purchasedSeats}</p>
            </div>
            <Link href="/dashboard/team" className="inline-flex rounded-full border border-[#e7e1d8] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              Open team settings
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
          <div className="space-y-6">
            <Card className={workspaceCardClass}>
              <CardHeader>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em]">Add company</CardTitle>
                <CardDescription>Manual lead entry for warm opportunities you already know you want to track.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createCompany} className="grid gap-3">
                  <Input className="border-white/70 bg-white/80" name="name" placeholder="Business name" required />
                  <Input className="border-white/70 bg-white/80" name="websiteUrl" placeholder="Website URL" />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input className="border-white/70 bg-white/80" name="industry" placeholder="Industry" />
                    <Input className="border-white/70 bg-white/80" name="status" placeholder="Status" defaultValue="new" />
                    <Input className="border-white/70 bg-white/80" name="city" placeholder="City" />
                    <Input className="border-white/70 bg-white/80" name="country" placeholder="Country" />
                  </div>
                  <Textarea className="border-white/70 bg-white/80" name="description" placeholder="Short note on the business and why it may fit Stirling QR." />
                  <Button className="rounded-full" type="submit">Create company</Button>
                </form>
              </CardContent>
            </Card>

            <Card className={workspaceCardClass}>
              <CardHeader>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em]">Search leads</CardTitle>
                <CardDescription>Search by niche and location. Results are shown one by one so you can pick which companies to add — AI fills in email, website, country, and industry automatically.</CardDescription>
              </CardHeader>
              <CardContent>
                <form method="GET" action="/dashboard/search" className="grid gap-3">
                  <Input className="border-white/70 bg-white/80" name="niche" placeholder="Niche: hotels, restaurants, estate agents, venues" required />
                  <Input className="border-white/70 bg-white/80" name="location" placeholder="Location: Glasgow, Edinburgh, Paris, Stockholm" required />
                  <Button className="rounded-full" type="submit">
                    <Search className="mr-2 h-4 w-4" />
                    Search leads
                  </Button>
                </form>
                <p className="mt-3 text-sm text-slate-500">
                  Aggregator, review, and booking sites are filtered out automatically.
                </p>
              </CardContent>
            </Card>

            <Card className={workspaceCardClass}>
              <CardHeader>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em]">Manage list</CardTitle>
                <CardDescription>Export your lead list to Excel or wipe your workspace when you want a clean slate.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <a href="/dashboard/exports">
                  <Button className="rounded-full" type="button" variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export to Excel
                  </Button>
                </a>

                <form action={clearCompanies} className="space-y-3 rounded-[1.5rem] border border-red-200 bg-red-50/45 p-4">
                  <p className="text-sm text-slate-600">This deletes all companies you created, plus related contacts, notes, evidence, drafts, sends, and demos.</p>
                  <Input className="border-white/70 bg-white/85" name="confirmation" placeholder='Type "CLEAR" to confirm' />
                  <Button className="rounded-full" type="submit" variant="outline">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear company list
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <Card className={workspaceCardClass}>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em]">Companies</CardTitle>
                  <CardDescription>Lead list with status, category, location, and quick drill-down into each record.</CardDescription>
                </div>
                <Link className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-800" href="/dashboard/analytics">
                  See category performance
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <WorkspacePill>Recent leads</WorkspacePill>
                <WorkspacePill>Category analytics live</WorkspacePill>
                <WorkspacePill>Official-site filtering on</WorkspacePill>
              </div>
              {recentCompanies.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-white/80 bg-white/65 p-6 text-sm text-slate-500">
                  No companies yet. Add one manually or import them from search.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCompanies.map((company) => (
                    <Link
                      className={`block p-4 transition hover:border-white hover:bg-white ${workspaceInsetClass}`}
                      href={`/dashboard/companies/${company.id}`}
                      key={company.id}
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-medium text-slate-800">{company.name}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {[company.industry, company.city, company.country].filter(Boolean).join(" · ") || "No location yet"}
                          </p>
                          {company.website_url ? <p className="mt-2 text-sm text-slate-700">{company.website_url}</p> : null}
                        </div>
                        <WorkspacePill>
                          {company.status}
                        </WorkspacePill>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
    </main>
  );
}

function DashboardCard({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <WorkspaceMetricCard icon={icon} title={title} value={value} />
      <p className="px-1 text-sm text-slate-600">{description}</p>
    </div>
  );
}
