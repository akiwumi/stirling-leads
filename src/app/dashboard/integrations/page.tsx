import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  WorkspaceBanner,
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePill,
  workspaceCardClass,
  workspaceSoftInsetClass,
} from "@/components/workspace-theme";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceOwnerId } from "@/lib/workspace";

import { disconnectCrm, saveCrmConnection } from "../actions";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; disconnected?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const workspaceOwnerId = await getWorkspaceOwnerId(supabase, user.id);

  const { data: connections } = await supabase
    .from("crm_connections")
    .select("*")
    .eq("created_by", workspaceOwnerId)
    .order("created_at", { ascending: false });

  const syncQuery = supabase
    .from("crm_sync_jobs")
    .select(`
      id, direction, provider_object_type, status, error_message, created_at,
      crm_connections(provider, account_label),
      companies(name),
      contacts(name, work_email, email)
    `)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: recentSyncs } = (connections ?? []).length > 0
    ? await syncQuery.in("crm_connection_id", (connections ?? []).map((connection) => connection.id))
    : { data: [] as Array<any> };

  const hubspotConnection = (connections ?? []).find((c) => c.provider === "hubspot");

  return (
    <main className="space-y-6">
      <WorkspaceHero
        eyebrow="Integrations"
        title="CRM Integrations"
        description="Connect your CRM and push companies and contacts with one click."
        tone="lavender"
      />

      {params.connected ? <WorkspaceBanner tone="success" text="CRM connected successfully." /> : null}
      {params.disconnected ? <WorkspaceBanner tone="success" text="CRM disconnected." /> : null}
      {params.error === "missing_fields" ? <WorkspaceBanner tone="error" text="Provide both a provider and API key." /> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* HubSpot */}
        <Card className={workspaceCardClass}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-800">HubSpot</CardTitle>
                <CardDescription>Push companies and contacts to your HubSpot CRM using a Private App token.</CardDescription>
              </div>
              <WorkspacePill className={hubspotConnection ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""}>
                {hubspotConnection ? "Connected" : "Not connected"}
              </WorkspacePill>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {hubspotConnection ? (
              <>
                <div className={`${workspaceSoftInsetClass} p-4 text-sm`}>
                  <p className="text-xs uppercase tracking-widest text-slate-400">Account</p>
                  <p className="mt-1 font-medium">{hubspotConnection.account_label ?? "HubSpot workspace"}</p>
                  <p className="mt-1 text-slate-400">Connected {formatDate(hubspotConnection.created_at)}</p>
                </div>
                <form action={disconnectCrm}>
                  <input type="hidden" name="connectionId" value={hubspotConnection.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 transition hover:bg-red-100"
                  >
                    Disconnect HubSpot
                  </button>
                </form>
              </>
            ) : (
              <form action={saveCrmConnection} className="space-y-3">
                <input type="hidden" name="provider" value="hubspot" />
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-widest text-slate-400">Private App Token</label>
                  <Input name="apiKey" type="password" placeholder="pat-na1-..." required />
                  <p className="text-xs text-slate-400">
                    Create a Private App in HubSpot → Settings → Integrations → Private Apps. Required scopes: <code>crm.objects.companies.write</code>, <code>crm.objects.contacts.write</code>.
                  </p>
                </div>
                <Input name="accountLabel" placeholder="Account label (optional)" />
                <button
                  type="submit"
                  className="rounded-full bg-[#ff7a59] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#e8694a]"
                >
                  Connect HubSpot
                </button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Salesforce — coming soon */}
        <Card className={`${workspaceCardClass} opacity-60`}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-800">Salesforce</CardTitle>
                <CardDescription>Push companies and contacts to Salesforce via OAuth.</CardDescription>
              </div>
              <WorkspacePill>Coming soon</WorkspacePill>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">Salesforce OAuth integration is planned for a future release. Use HubSpot for now.</p>
          </CardContent>
        </Card>
      </div>

      {/* Sync log */}
      <Card className={workspaceCardClass}>
        <CardHeader>
          <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-800">Sync log</CardTitle>
          <CardDescription>Recent outbound pushes to your connected CRMs.</CardDescription>
        </CardHeader>
        <CardContent>
          {(recentSyncs ?? []).length === 0 ? (
            <WorkspaceEmptyState text="No sync jobs yet. Push a company or contact from their detail page." />
          ) : (
            <div className="space-y-3">
              {(recentSyncs ?? []).map((job) => {
                const conn = Array.isArray(job.crm_connections) ? job.crm_connections[0] : job.crm_connections;
                const company = Array.isArray(job.companies) ? job.companies[0] : job.companies;
                const contact = Array.isArray(job.contacts) ? job.contacts[0] : job.contacts;
                const label = company?.name ?? contact?.name ?? contact?.work_email ?? contact?.email ?? "Unknown";

                return (
                  <div key={job.id} className={`${workspaceSoftInsetClass} flex items-start justify-between gap-4 p-4`}>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium">{label}</p>
                      <p className="mt-0.5 text-slate-500">
                        {conn?.provider ?? "CRM"} · {job.provider_object_type} · {job.direction}
                      </p>
                      {job.error_message ? <p className="mt-1 text-red-600">{job.error_message}</p> : null}
                      <p className="mt-1 text-xs text-slate-400">{formatDate(job.created_at)}</p>
                    </div>
                    <WorkspacePill className={job.status === "completed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : job.status === "failed" ? "border-red-200 bg-red-50 text-red-700" : ""}>
                      {job.status}
                    </WorkspacePill>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
