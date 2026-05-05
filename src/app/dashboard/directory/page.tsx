import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, ExternalLink, Mail, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WorkspaceEmptyState, WorkspaceHero, WorkspacePill, workspaceCardClass, workspaceSelectClass } from "@/components/workspace-theme";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceOwnerId } from "@/lib/workspace";

import { DeleteCompanyButton } from "./DeleteCompanyButton";

type FilterParams = {
  industry?: string;
  status?: string;
  country?: string;
  mail_sent?: string;
};

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<FilterParams>;
}) {
  const filters = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspaceOwnerId = await getWorkspaceOwnerId(supabase, user.id);

  // Fetch filter options from ALL companies (not affected by active filters)
  const { data: allForFilters } = await supabase
    .from("companies")
    .select("industry, country")
    .eq("created_by", workspaceOwnerId);

  const allIndustries = [...new Set((allForFilters ?? []).map((c) => c.industry).filter(Boolean))].sort() as string[];
  const allCountries = [...new Set((allForFilters ?? []).map((c) => c.country).filter(Boolean))].sort() as string[];
  const statuses = ["new", "researching", "qualified", "contacted", "won", "lost"];

  // Fetch companies with active filters applied
  let companiesQuery = supabase
    .from("companies")
    .select("id, name, website_url, industry, city, country, status, lead_score, lead_temperature, created_at")
    .eq("created_by", workspaceOwnerId)
    .order("created_at", { ascending: false });

  if (filters.industry) companiesQuery = companiesQuery.eq("industry", filters.industry);
  if (filters.status) companiesQuery = companiesQuery.eq("status", filters.status);
  if (filters.country) companiesQuery = companiesQuery.eq("country", filters.country);

  const { data: companies } = await companiesQuery;

  // Fetch primary contacts and email send data for all matching companies
  const companyIds = (companies ?? []).map((c) => c.id);

  const [{ data: contacts }, { data: sends }] = await Promise.all([
    companyIds.length > 0
      ? supabase
          .from("contacts")
          .select("company_id, email, name")
          .in("company_id", companyIds)
          .not("email", "is", null)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    companyIds.length > 0
      ? supabase
          .from("email_sends")
          .select("company_id, sent_at, replied_at, opened_at")
          .in("company_id", companyIds)
          .order("sent_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  // Build lookup maps
  const primaryEmailByCompany = new Map<string, string>();
  for (const contact of contacts ?? []) {
    if (!primaryEmailByCompany.has(contact.company_id) && contact.email) {
      primaryEmailByCompany.set(contact.company_id, contact.email);
    }
  }

  const sendByCompany = new Map<string, { sent: boolean; replied: boolean; opened: boolean }>();
  for (const send of sends ?? []) {
    if (!sendByCompany.has(send.company_id)) {
      sendByCompany.set(send.company_id, {
        sent: !!send.sent_at,
        replied: !!send.replied_at,
        opened: !!send.opened_at,
      });
    }
  }

  const allCompanies = companies ?? [];
  const activeFilterCount = [filters.industry, filters.status, filters.country, filters.mail_sent].filter(Boolean).length;

  // Apply mail_sent filter in memory (requires join data)
  const displayedCompanies = filters.mail_sent
    ? allCompanies.filter((company) => {
        const send = sendByCompany.get(company.id);
        if (filters.mail_sent === "yes") return send?.sent;
        if (filters.mail_sent === "no") return !send?.sent;
        if (filters.mail_sent === "replied") return send?.replied;
        return true;
      })
    : allCompanies;

  return (
    <main className="space-y-6">
      <WorkspaceHero
        eyebrow="Lead directory"
        title="All companies"
        description="Every company added manually or via search, enriched automatically with AI. Click any row to open the full profile."
        tone="lavender"
        actions={
          <Link href="/dashboard/search">
            <Button className="rounded-full" type="button">
              <Search className="mr-2 h-4 w-4" />
              Search new leads
            </Button>
          </Link>
        }
      />

      {/* Filters */}
      <form method="GET" className="flex flex-wrap items-end gap-3 rounded-[2rem] border border-[#ece7de] bg-white/96 p-5 shadow-[0_18px_50px_rgba(30,25,20,0.045)]">
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-[0.18em] text-slate-400">Industry</label>
          <select name="industry" defaultValue={filters.industry ?? ""} className={`${workspaceSelectClass} min-w-44`}>
            <option value="">All industries</option>
            {allIndustries.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-[0.18em] text-slate-400">Status</label>
          <select name="status" defaultValue={filters.status ?? ""} className={`${workspaceSelectClass} min-w-40`}>
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-[0.18em] text-slate-400">Country</label>
          <select name="country" defaultValue={filters.country ?? ""} className={`${workspaceSelectClass} min-w-44`}>
            <option value="">All countries</option>
            {allCountries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-[0.18em] text-slate-400">Mail sent</label>
          <select name="mail_sent" defaultValue={filters.mail_sent ?? ""} className={`${workspaceSelectClass} min-w-36`}>
            <option value="">Any</option>
            <option value="yes">Sent</option>
            <option value="no">Not sent</option>
            <option value="replied">Replied</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="rounded-full h-11" variant="outline">
            Apply filters
            {activeFilterCount > 0 ? <span className="ml-2 rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-white">{activeFilterCount}</span> : null}
          </Button>
          {activeFilterCount > 0 ? (
            <Link href="/dashboard/directory">
              <Button type="button" className="rounded-full h-11" variant="outline">Clear</Button>
            </Link>
          ) : null}
        </div>
      </form>

      {/* Directory table */}
      <div className={workspaceCardClass}>
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-[family:var(--font-display)] text-2xl font-semibold tracking-[-0.04em] text-slate-900">
                {displayedCompanies.length} {displayedCompanies.length === 1 ? "company" : "companies"}
              </h2>
              {activeFilterCount > 0 ? (
                <p className="mt-1 text-sm text-slate-500">
                  Filtered — <Link className="underline underline-offset-2 hover:text-slate-800" href="/dashboard/directory">show all</Link>
                </p>
              ) : null}
            </div>
            <Link href="/dashboard">
              <Button variant="outline" className="rounded-full" type="button">
                <Plus className="mr-2 h-4 w-4" />
                Add company
              </Button>
            </Link>
          </div>

          {displayedCompanies.length === 0 ? (
            <WorkspaceEmptyState text="No companies match the current filters. Try clearing them or add your first lead." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#ece7de]">
                    <th className="pb-3 pr-4 text-left text-xs uppercase tracking-[0.18em] text-slate-400 font-normal">Company</th>
                    <th className="pb-3 pr-4 text-left text-xs uppercase tracking-[0.18em] text-slate-400 font-normal">Email</th>
                    <th className="pb-3 pr-4 text-left text-xs uppercase tracking-[0.18em] text-slate-400 font-normal">Website</th>
                    <th className="pb-3 pr-4 text-left text-xs uppercase tracking-[0.18em] text-slate-400 font-normal">Country</th>
                    <th className="pb-3 pr-4 text-left text-xs uppercase tracking-[0.18em] text-slate-400 font-normal">Industry</th>
                    <th className="pb-3 pr-4 text-left text-xs uppercase tracking-[0.18em] text-slate-400 font-normal">Date added</th>
                    <th className="pb-3 pr-4 text-left text-xs uppercase tracking-[0.18em] text-slate-400 font-normal">Mail sent</th>
                    <th className="pb-3 pr-4 text-left text-xs uppercase tracking-[0.18em] text-slate-400 font-normal">Reply</th>
                    <th className="pb-3 text-left text-xs uppercase tracking-[0.18em] text-slate-400 font-normal"></th>
                  </tr>
                </thead>
                <tbody>
                  {displayedCompanies.map((company) => {
                    const email = primaryEmailByCompany.get(company.id);
                    const send = sendByCompany.get(company.id);
                    return (
                      <tr key={company.id} className="group border-b border-[#f0ebe3] last:border-0 transition-colors hover:bg-[#faf9f6]">
                        <td className="py-3 pr-4">
                          <Link href={`/dashboard/companies/${company.id}`} className="block">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f0ebe3] text-slate-500">
                                <Building2 className="h-3.5 w-3.5" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 group-hover:text-slate-700">{company.name}</p>
                                {company.city ? <p className="text-xs text-slate-400">{company.city}</p> : null}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="py-3 pr-4">
                          {email ? (
                            <a href={`mailto:${email}`} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900">
                              <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                              <span className="truncate max-w-[180px]">{email}</span>
                            </a>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {company.website_url ? (
                            <a
                              href={company.website_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 truncate max-w-[160px]"
                            >
                              <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
                              <span className="truncate">{new URL(company.website_url).hostname.replace(/^www\./, "")}</span>
                            </a>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-slate-600">{company.country || <span className="text-slate-300">—</span>}</td>
                        <td className="py-3 pr-4">
                          {company.industry ? (
                            <WorkspacePill>{company.industry}</WorkspacePill>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-slate-500 text-xs whitespace-nowrap">{formatDate(company.created_at)}</td>
                        <td className="py-3 pr-4">
                          <MailSentBadge sent={send?.sent ?? false} opened={send?.opened ?? false} />
                        </td>
                        <td className="py-3 pr-4">
                          <ReplyBadge replied={send?.replied ?? false} sent={send?.sent ?? false} />
                        </td>
                        <td className="py-3">
                          <DeleteCompanyButton companyId={company.id} companyName={company.name} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function MailSentBadge({ sent, opened }: { sent: boolean; opened: boolean }) {
  if (!sent) return <span className="rounded-full border border-[#ede7de] bg-[#fcfbf8] px-2.5 py-0.5 text-xs text-slate-400">Not sent</span>;
  if (opened) return <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-700">Opened</span>;
  return <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700">Sent</span>;
}

function ReplyBadge({ replied, sent }: { replied: boolean; sent: boolean }) {
  if (!sent) return <span className="text-slate-300">—</span>;
  if (replied) return <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs text-violet-700">Replied</span>;
  return <span className="rounded-full border border-[#ede7de] bg-[#fcfbf8] px-2.5 py-0.5 text-xs text-slate-400">No reply</span>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}
