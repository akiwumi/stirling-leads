import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  WorkspaceHero,
  WorkspacePill,
  workspaceCardClass,
  workspaceSoftInsetClass,
} from "@/components/workspace-theme";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceOwnerId } from "@/lib/workspace";

const workbookTabs = [
  { name: "Companies", detail: "One row per company with coverage, change flags, and check timestamps." },
  { name: "People", detail: "One row per person with company context, role, LinkedIn, and contact details." },
  { name: "Company Contacts", detail: "Sorted by company, role, and person so non-technical users can scan one account fast." },
  { name: "Lists", detail: "Saved list memberships with company and person context attached to every row." },
  { name: "Updates", detail: "Detected change events with old and new values plus refresh job references." },
  { name: "CRM Sync", detail: "Outbound sync jobs with provider, status, object type, and any errors." },
];

export default async function ExportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const workspaceOwnerId = await getWorkspaceOwnerId(supabase, user.id);

  const [{ count: companyCount }, { count: contactCount }, { count: listCount }, { count: updateCount }] = await Promise.all([
    supabase.from("companies").select("*", { head: true, count: "exact" }).eq("created_by", workspaceOwnerId),
    supabase.from("contacts").select("id, companies!inner(created_by)", { head: true, count: "exact" }).eq("companies.created_by", workspaceOwnerId),
    supabase.from("person_lists").select("*", { head: true, count: "exact" }).eq("created_by", workspaceOwnerId),
    supabase.from("directory_change_events").select("id, companies!inner(created_by)", { head: true, count: "exact" }).eq("companies.created_by", workspaceOwnerId),
  ]);

  return (
    <main className="space-y-6">
      <WorkspaceHero
        eyebrow="Offline workbook"
        title="Exports"
        description="Download the lead directory as an Excel workbook that mirrors the app sections."
        tone="lavender"
        actions={
          <a
            href="/dashboard/export"
            className="inline-flex rounded-full border border-white/80 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Download workbook
          </a>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className={workspaceCardClass}>
          <CardHeader>
            <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-800">Export scope</CardTitle>
            <CardDescription>Every row keeps company context attached so the file stays useful outside the app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`${workspaceSoftInsetClass} flex items-center justify-between p-4`}>
              <span className="text-sm text-slate-500">Companies</span>
              <WorkspacePill>{companyCount ?? 0}</WorkspacePill>
            </div>
            <div className={`${workspaceSoftInsetClass} flex items-center justify-between p-4`}>
              <span className="text-sm text-slate-500">People</span>
              <WorkspacePill>{contactCount ?? 0}</WorkspacePill>
            </div>
            <div className={`${workspaceSoftInsetClass} flex items-center justify-between p-4`}>
              <span className="text-sm text-slate-500">Lists</span>
              <WorkspacePill>{listCount ?? 0}</WorkspacePill>
            </div>
            <div className={`${workspaceSoftInsetClass} flex items-center justify-between p-4`}>
              <span className="text-sm text-slate-500">Change events</span>
              <WorkspacePill>{updateCount ?? 0}</WorkspacePill>
            </div>

            <div className="rounded-[1.25rem] border border-dashed border-[#e7e1d8] bg-white/70 p-4 text-sm text-slate-500">
              Top row frozen on every tab. Filters enabled on every sheet. Human-readable headers. Wider columns for email and LinkedIn.
            </div>
          </CardContent>
        </Card>

        <Card className={workspaceCardClass}>
          <CardHeader>
            <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-800">Workbook tabs</CardTitle>
            <CardDescription>The workbook should feel like an offline version of the dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {workbookTabs.map((tab) => (
              <div key={tab.name} className={`${workspaceSoftInsetClass} p-4`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-800">{tab.name}</p>
                  <WorkspacePill>{tab.name}</WorkspacePill>
                </div>
                <p className="mt-2 text-sm text-slate-500">{tab.detail}</p>
              </div>
            ))}

            <Link href="/dashboard/updates" className="text-sm text-slate-500 transition hover:text-slate-700">
              Review recent changes before exporting →
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
