import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkspaceEmptyState, WorkspaceHero, WorkspaceMetricCard, WorkspacePill, workspaceCardClass, workspaceInsetClass, workspaceSoftInsetClass } from "@/components/workspace-theme";
import { createClient } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const [{ data: companies }, { data: leadSources }, { data: sends }, { data: contacts }] = await Promise.all([
    supabase.from("companies").select("id, name, industry, status, created_at, lead_score"),
    supabase.from("lead_sources").select("company_id, source_type, created_at"),
    supabase.from("email_sends").select("id, company_id, contact_id, sent_at, replied_at, opened_at, clicked_at"),
    supabase.from("contacts").select("id, company_id, name, email"),
  ]);

  const companyById = new Map((companies ?? []).map((company) => [company.id, company]));
  const contactById = new Map((contacts ?? []).map((contact) => [contact.id, contact]));
  const sectors = new Map<
    string,
    {
      leads: number;
      qualified: number;
      searchResults: number;
      sends: number;
      replies: number;
      wins: number;
      avgScoreTotal: number;
      avgScoreCount: number;
    }
  >();

  for (const company of companies ?? []) {
    const sector = company.industry || "Unspecified";
    const current = sectors.get(sector) ?? {
      leads: 0,
      qualified: 0,
      searchResults: 0,
      sends: 0,
      replies: 0,
      wins: 0,
      avgScoreTotal: 0,
      avgScoreCount: 0,
    };
    current.leads += 1;
    if ((company.lead_score ?? 0) >= 75 || company.status === "qualified") {
      current.qualified += 1;
    }
    if (company.status === "won") {
      current.wins += 1;
    }
    if (typeof company.lead_score === "number") {
      current.avgScoreTotal += company.lead_score;
      current.avgScoreCount += 1;
    }
    sectors.set(sector, current);
  }

  for (const source of leadSources ?? []) {
    if (source.source_type !== "search_result") {
      continue;
    }

    const company = companyById.get(source.company_id);
    const sector = company?.industry || "Unspecified";
    const current = sectors.get(sector);

    if (current) {
      current.searchResults += 1;
    }
  }

  for (const send of sends ?? []) {
    const company = companyById.get(send.company_id);
    const sector = company?.industry || "Unspecified";
    const current = sectors.get(sector);

    if (!current) {
      continue;
    }

    current.sends += 1;
    if (send.replied_at) {
      current.replies += 1;
    }
  }

  const sectorRows = Array.from(sectors.entries())
    .map(([sector, value]) => ({
      sector,
      leads: value.leads,
      qualified: value.qualified,
      searchResults: value.searchResults,
      sends: value.sends,
      replies: value.replies,
      wins: value.wins,
      avgScore: value.avgScoreCount > 0 ? Math.round(value.avgScoreTotal / value.avgScoreCount) : 0,
      conversionRate: value.sends > 0 ? Math.round((value.replies / value.sends) * 100) : 0,
    }))
    .sort((a, b) => b.leads - a.leads);

  const repliedEmails = (sends ?? [])
    .filter((send) => send.replied_at)
    .map((send) => ({
      id: send.id,
      companyName: companyById.get(send.company_id)?.name || "Unknown company",
      industry: companyById.get(send.company_id)?.industry || "Unspecified",
      recipient: contactById.get(send.contact_id ?? "")?.email || contactById.get(send.contact_id ?? "")?.name || "Unknown contact",
      repliedAt: send.replied_at,
      sentAt: send.sent_at,
    }))
    .sort((a, b) => new Date(b.repliedAt ?? "").getTime() - new Date(a.repliedAt ?? "").getTime());

  const totals = {
    leads: companies?.length ?? 0,
    searchResults: (leadSources ?? []).filter((source) => source.source_type === "search_result").length,
    replies: repliedEmails.length,
    sends: sends?.length ?? 0,
  };

  return (
    <div className="space-y-8">
      <WorkspaceHero
        description="Track search intake, replies, conversion rates, and progress across each business category so you can see where actual traction is showing up."
        eyebrow="Analytics"
        title="Sector momentum and outreach performance"
      />

      <section className="grid gap-5 md:grid-cols-4">
        <MetricCard description="Total leads" value={String(totals.leads)} />
        <MetricCard description="Search results saved" value={String(totals.searchResults)} />
        <MetricCard description="Emails sent" value={String(totals.sends)} />
        <MetricCard description="Replies received" value={String(totals.replies)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className={workspaceCardClass}>
          <CardHeader>
            <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em]">Business sector conversion rates</CardTitle>
            <CardDescription>Search progress, qualified leads, replies, and wins by industry.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sectorRows.length === 0 ? (
              <WorkspaceEmptyState text="No analytics yet. Add or search for some leads first." />
            ) : (
              sectorRows.map((row) => (
                <div className={`${workspaceInsetClass} p-4`} key={row.sector}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{row.sector}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {row.searchResults} search results · {row.qualified} qualified · avg score {row.avgScore}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                      <WorkspacePill className="normal-case tracking-normal">{row.leads} leads</WorkspacePill>
                      <WorkspacePill className="normal-case tracking-normal">{row.sends} sends</WorkspacePill>
                      <WorkspacePill className="normal-case tracking-normal">{row.replies} replies</WorkspacePill>
                      <WorkspacePill className="normal-case tracking-normal">{row.conversionRate}% conversion</WorkspacePill>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className={workspaceCardClass}>
          <CardHeader>
            <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em]">Responded emails</CardTitle>
            <CardDescription>The messages that turned into replies.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {repliedEmails.length === 0 ? (
              <WorkspaceEmptyState text="No replies logged yet." />
            ) : (
              repliedEmails.map((reply) => (
                <div className={`${workspaceSoftInsetClass} p-4`} key={reply.id}>
                  <p className="font-semibold text-slate-800">{reply.companyName}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {reply.industry} · {reply.recipient}
                  </p>
                  <p className="mt-3 text-sm text-slate-600">
                    Replied {formatDate(reply.repliedAt)} · sent {reply.sentAt ? formatDate(reply.sentAt) : "unknown"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className={`p-6 ${workspaceCardClass}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-[family:var(--font-display)] text-3xl tracking-[-0.04em] text-slate-800">Progress loop</h2>
            <p className="mt-2 text-slate-600">Use this to see which categories are worth more search time and which ones already reply well.</p>
          </div>
          <Link className="inline-flex rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700" href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ description, value }: { description: string; value: string }) {
  return <WorkspaceMetricCard title={description} value={value} />;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
