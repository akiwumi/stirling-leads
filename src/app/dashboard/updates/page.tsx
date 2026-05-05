import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { buildDatePresets } from "@/lib/usage-limits";
import { getWorkspaceOwnerId } from "@/lib/workspace";

type SearchParams = {
  entity_type?: string;
  change_type?: string;
  since?: string;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const changeTypeBadge: Record<string, string> = {
  added: "bg-emerald-50 text-emerald-700 border-emerald-200",
  updated: "bg-blue-50 text-blue-700 border-blue-200",
  removed: "bg-red-50 text-red-700 border-red-200",
};

const entityBadge: Record<string, string> = {
  company: "bg-violet-50 text-violet-700 border-violet-200",
  contact: "bg-amber-50 text-amber-700 border-amber-200",
};

export default async function UpdatesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const workspaceOwnerId = await getWorkspaceOwnerId(supabase, user.id);
  const datePresets = buildDatePresets();

  // Build query for change events scoped to this user's companies
  let query = supabase
    .from("directory_change_events")
    .select(`
      id,
      entity_type,
      change_type,
      field_name,
      old_value,
      new_value,
      source_url,
      detected_at,
      refresh_job_id,
      companies ( id, name ),
      contacts ( id, name )
    `)
    .order("detected_at", { ascending: false })
    .limit(200);

  if (params.entity_type) {
    query = query.eq("entity_type", params.entity_type);
  }
  if (params.change_type) {
    query = query.eq("change_type", params.change_type);
  }
  if (params.since) {
    query = query.gte("detected_at", new Date(params.since).toISOString());
  }

  const { data: events } = await query;

  // Filter to only events belonging to this user's companies
  const { data: userCompanyIds } = await supabase
    .from("companies")
    .select("id")
    .eq("created_by", workspaceOwnerId);

  const ownedIds = new Set((userCompanyIds ?? []).map((c) => c.id));

  function oneJoin<T>(val: unknown): T | null {
    if (!val) return null;
    if (Array.isArray(val)) return (val[0] as T) ?? null;
    return val as T;
  }

  const filtered = (events ?? []).filter((e) => {
    const company = oneJoin<{ id: string }>(e.companies);
    return company ? ownedIds.has(company.id) : false;
  });

  // Recent refresh jobs
  const { data: jobs } = await supabase
    .from("directory_refresh_jobs")
    .select("id, status, total_targets, processed_targets, changed_targets, started_at, completed_at")
    .eq("created_by", workspaceOwnerId)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Directory</p>
        <h1 className="mt-2 font-[family:var(--font-display)] text-3xl font-semibold tracking-[-0.05em] text-slate-900">
          Updates
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Changes detected during daily refresh runs across your saved companies and contacts.
        </p>
      </div>

      {/* Refresh jobs summary */}
      {(jobs ?? []).length > 0 && (
        <div className="rounded-[1.5rem] border border-[#ece7de] bg-white/90 p-6">
          <h2 className="text-sm font-semibold text-slate-700">Recent refresh runs</h2>
          <div className="mt-3 space-y-2">
            {(jobs ?? []).map((job) => (
              <div className="flex items-center gap-3 rounded-xl border border-[#ece7de] bg-[#faf9f6] px-4 py-3 text-sm" key={job.id}>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    job.status === "completed"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {job.status}
                </span>
                <span className="text-slate-600">
                  {job.processed_targets ?? 0} / {job.total_targets ?? 0} companies — {job.changed_targets ?? 0} changed
                </span>
                <span className="ml-auto text-slate-400">{formatDate(job.started_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-[1.5rem] border border-[#ece7de] bg-white/90 p-6">
        <form className="flex flex-wrap gap-3" method="GET">
          <select
            className="rounded-full border border-[#e7e1d8] bg-white px-4 py-2 text-sm text-slate-700"
            defaultValue={params.entity_type ?? ""}
            name="entity_type"
          >
            <option value="">All entities</option>
            <option value="company">Company</option>
            <option value="contact">Contact</option>
          </select>
          <select
            className="rounded-full border border-[#e7e1d8] bg-white px-4 py-2 text-sm text-slate-700"
            defaultValue={params.change_type ?? ""}
            name="change_type"
          >
            <option value="">All change types</option>
            <option value="added">Added</option>
            <option value="updated">Updated</option>
            <option value="removed">Removed</option>
          </select>
          <select
            className="rounded-full border border-[#e7e1d8] bg-white px-4 py-2 text-sm text-slate-700"
            defaultValue={params.since ?? ""}
            name="since"
          >
            <option value="">All time</option>
            <option value={datePresets.last24Hours}>Last 24 hours</option>
            <option value={datePresets.last7Days}>Last 7 days</option>
            <option value={datePresets.last30Days}>Last 30 days</option>
          </select>
          <button
            className="rounded-full border border-[#e7e1d8] bg-white px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
            type="submit"
          >
            Filter
          </button>
          {(params.entity_type || params.change_type || params.since) && (
            <Link
              className="rounded-full border border-[#e7e1d8] bg-white px-4 py-2 text-sm text-slate-400 transition hover:bg-slate-50"
              href="/dashboard/updates"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Events list */}
      <div className="rounded-[1.5rem] border border-[#ece7de] bg-white/90 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Change events
            <span className="ml-2 text-slate-400">({filtered.length})</span>
          </h2>
          <Link
            className="rounded-full border border-[#e7e1d8] bg-[#faf9f6] px-4 py-2 text-xs text-slate-600 transition hover:bg-white"
            href="/dashboard/exports"
          >
            Export to Excel
          </Link>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#e7e1d8] p-8 text-center text-sm text-slate-400">
            No change events found. Run a refresh from a company page or wait for the daily job.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((event) => {
              const company = oneJoin<{ id: string; name: string }>(event.companies);
              const contact = oneJoin<{ id: string; name: string }>(event.contacts);
              const fieldLabel = (event.field_name ?? "").replace(/_/g, " ");

              return (
                <div
                  className="flex flex-col gap-2 rounded-xl border border-[#ece7de] bg-[#faf9f6] px-4 py-3 sm:flex-row sm:items-start"
                  key={event.id}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${entityBadge[event.entity_type] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}
                    >
                      {event.entity_type}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${changeTypeBadge[event.change_type] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}
                    >
                      {event.change_type}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-800">
                      <span className="font-medium capitalize">{fieldLabel}</span>
                      {event.change_type === "updated" && (
                        <>
                          {" "}
                          <span className="text-slate-400">from</span>{" "}
                          <span className="text-red-600 line-through">{event.old_value || "—"}</span>{" "}
                          <span className="text-slate-400">to</span>{" "}
                          <span className="text-emerald-700">{event.new_value || "—"}</span>
                        </>
                      )}
                      {event.change_type === "added" && event.new_value && (
                        <>
                          {" "}
                          <span className="text-slate-400">→</span>{" "}
                          <span className="text-emerald-700">{event.new_value}</span>
                        </>
                      )}
                      {event.change_type === "removed" && event.old_value && (
                        <>
                          {" "}
                          <span className="text-slate-400">was</span>{" "}
                          <span className="text-red-600 line-through">{event.old_value}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {company && (
                        <Link className="font-medium text-slate-700 hover:underline" href={`/dashboard/companies/${company.id}`}>
                          {company.name}
                        </Link>
                      )}
                      {contact && (
                        <>
                          <span>·</span>
                          <Link className="text-slate-600 hover:underline" href={`/dashboard/people/${contact.id}`}>
                            {contact.name}
                          </Link>
                        </>
                      )}
                      {event.source_url && (
                        <>
                          <span>·</span>
                          <a
                            className="max-w-[200px] truncate text-slate-400 hover:text-slate-600"
                            href={event.source_url}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            {event.source_url}
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-xs text-slate-400 sm:ml-auto">
                    {formatDate(event.detected_at)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
