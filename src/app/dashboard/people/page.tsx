import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  WorkspaceBanner,
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePill,
  workspaceCardClass,
  workspaceInsetClass,
  workspaceSelectClass,
  workspaceSoftInsetClass,
} from "@/components/workspace-theme";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceOwnerId } from "@/lib/workspace";

import { createPersonList, mergeDuplicateContact, savePersonSearchAsList } from "../actions";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{
    title?: string;
    seniority?: string;
    department?: string;
    industry?: string;
    city?: string;
    country?: string;
    min_score?: string;
    has_linkedin?: string;
    has_email?: string;
    is_decision_maker?: string;
    recently_verified?: string;
    merged?: string;
    show_dupes?: string;
  }>;
}) {
  const filters = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const workspaceOwnerId = await getWorkspaceOwnerId(supabase, user.id);

  let query = supabase
    .from("contacts")
    .select(`
      id, name, job_title, role, role_normalized, seniority, department,
      work_email, email, direct_phone, phone, linkedin_url, linkedin_slug,
      is_decision_maker, source_type, source_confidence, has_recent_changes, change_summary,
      last_checked_at, created_at,
      companies!inner(id, name, industry, city, country, lead_score, created_by)
    `)
    .eq("companies.created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(400);

  if (filters.title) {
    query = query.ilike("job_title", `%${filters.title}%`);
  }
  if (filters.seniority) {
    query = query.eq("seniority", filters.seniority);
  }
  if (filters.department) {
    query = query.eq("department", filters.department);
  }
  if (filters.is_decision_maker === "1") {
    query = query.eq("is_decision_maker", true);
  }

  const { data: rawContacts } = await query;
  const contacts = (rawContacts ?? []).filter((contact) => {
    const company = Array.isArray(contact.companies) ? contact.companies[0] : contact.companies;
    const hasLinkedin = Boolean(contact.linkedin_url);
    const hasEmail = Boolean(contact.work_email || contact.email);
    const recentlyVerified = Boolean(
      contact.last_checked_at && new Date(contact.last_checked_at).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000,
    );
    const score = Number(company?.lead_score ?? 0);

    if (filters.has_linkedin === "1" && !hasLinkedin) return false;
    if (filters.has_email === "1" && !hasEmail) return false;
    if (filters.industry && !company?.industry?.toLowerCase().includes(filters.industry.toLowerCase())) return false;
    if (filters.city && !company?.city?.toLowerCase().includes(filters.city.toLowerCase())) return false;
    if (filters.country && !company?.country?.toLowerCase().includes(filters.country.toLowerCase())) return false;
    if (filters.min_score && score < Number(filters.min_score)) return false;
    if (filters.recently_verified === "1" && !recentlyVerified) return false;
    return true;
  });

  const { data: lists } = await supabase
    .from("person_lists")
    .select("id, name")
    .eq("created_by", workspaceOwnerId)
    .order("created_at", { ascending: false });

  // Dedupe detection — find contacts sharing work_email or linkedin_slug
  const { data: allContactsForDupe } = await supabase
    .from("contacts")
    .select("id, name, work_email, email, linkedin_slug, company_id, job_title, role, companies!inner(created_by)")
    .eq("companies.created_by", workspaceOwnerId);

  const dupeGroups: Array<{ key: string; type: string; contacts: typeof allContactsForDupe }> = [];
  if (allContactsForDupe) {
    const emailMap = new Map<string, typeof allContactsForDupe>();
    const slugMap = new Map<string, typeof allContactsForDupe>();
    for (const c of allContactsForDupe) {
      const em = c.work_email || c.email;
      if (em) {
        const arr = emailMap.get(em) ?? [];
        arr.push(c);
        emailMap.set(em, arr);
      }
      if (c.linkedin_slug) {
        const arr = slugMap.get(c.linkedin_slug) ?? [];
        arr.push(c);
        slugMap.set(c.linkedin_slug, arr);
      }
    }
    for (const [key, contacts] of emailMap.entries()) {
      if (contacts.length > 1) dupeGroups.push({ key, type: "email", contacts });
    }
    for (const [key, contacts] of slugMap.entries()) {
      if (contacts.length > 1) dupeGroups.push({ key, type: "linkedin", contacts });
    }
  }

  const activeFilters = Object.entries(filters).filter(([k, v]) => Boolean(v) && k !== "show_dupes" && k !== "merged");
  const currentFilterPayload = JSON.stringify(Object.fromEntries(activeFilters.map(([key, value]) => [key, value as string])));
  const currentContactIds = JSON.stringify((contacts ?? []).map((contact) => contact.id));

  return (
    <main className="space-y-6">
      <WorkspaceHero
        eyebrow="People database"
        title="People"
        description="Find decision-makers across all your saved companies. Filter by title, role, department, or contact details."
        tone="lavender"
        actions={
          <Link
            href="/dashboard/lists"
            className="inline-flex rounded-full border border-white/80 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
          >
            Saved lists →
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Filter sidebar */}
        <aside className="space-y-4">
          <Card className={workspaceCardClass}>
            <CardHeader>
              <CardTitle className="font-[family:var(--font-display)] text-lg tracking-[-0.03em] text-slate-800">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <form method="GET" className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-widest text-slate-400">Job title</label>
                  <input
                    name="title"
                    defaultValue={filters.title ?? ""}
                    placeholder="e.g. Head of Marketing"
                    className="flex h-10 w-full rounded-[1rem] border border-[#ece7de] bg-[#fcfbf8] px-3 py-2 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-widest text-slate-400">Seniority</label>
                  <select name="seniority" defaultValue={filters.seniority ?? ""} className={workspaceSelectClass}>
                    <option value="">Any seniority</option>
                    <option value="c_suite">C-Suite</option>
                    <option value="vp">VP / Director</option>
                    <option value="manager">Manager / Head</option>
                    <option value="individual">Individual Contributor</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-widest text-slate-400">Department</label>
                  <select name="department" defaultValue={filters.department ?? ""} className={workspaceSelectClass}>
                    <option value="">Any department</option>
                    <option value="Executive">Executive</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Operations">Operations</option>
                    <option value="Finance">Finance</option>
                    <option value="Customer Success">Customer Success</option>
                    <option value="Product">Product</option>
                    <option value="Design">Design</option>
                    <option value="HR">HR</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-widest text-slate-400">Industry</label>
                  <input
                    name="industry"
                    defaultValue={filters.industry ?? ""}
                    placeholder="e.g. Fintech"
                    className="flex h-10 w-full rounded-[1rem] border border-[#ece7de] bg-[#fcfbf8] px-3 py-2 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-widest text-slate-400">Company city</label>
                  <input
                    name="city"
                    defaultValue={filters.city ?? ""}
                    placeholder="e.g. Stockholm"
                    className="flex h-10 w-full rounded-[1rem] border border-[#ece7de] bg-[#fcfbf8] px-3 py-2 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-widest text-slate-400">Country</label>
                  <input
                    name="country"
                    defaultValue={filters.country ?? ""}
                    placeholder="e.g. Sweden"
                    className="flex h-10 w-full rounded-[1rem] border border-[#ece7de] bg-[#fcfbf8] px-3 py-2 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-widest text-slate-400">Minimum lead score</label>
                  <input
                    name="min_score"
                    defaultValue={filters.min_score ?? ""}
                    placeholder="e.g. 70"
                    type="number"
                    min="0"
                    max="100"
                    className="flex h-10 w-full rounded-[1rem] border border-[#ece7de] bg-[#fcfbf8] px-3 py-2 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-200"
                  />
                </div>

                <div className={`${workspaceInsetClass} space-y-2 p-3`}>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" name="has_linkedin" value="1" defaultChecked={filters.has_linkedin === "1"} className="rounded" />
                    Has LinkedIn URL
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" name="has_email" value="1" defaultChecked={filters.has_email === "1"} className="rounded" />
                    Has email
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" name="is_decision_maker" value="1" defaultChecked={filters.is_decision_maker === "1"} className="rounded" />
                    Decision-makers only
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" name="recently_verified" value="1" defaultChecked={filters.recently_verified === "1"} className="rounded" />
                    Verified in last 30 days
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  Apply filters
                </button>
                {activeFilters.length > 0 ? (
                  <Link
                    href="/dashboard/people"
                    className="block text-center text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear all filters
                  </Link>
                ) : null}
              </form>
            </CardContent>
          </Card>

          <Card className={workspaceCardClass}>
            <CardHeader>
              <CardTitle className="font-[family:var(--font-display)] text-lg tracking-[-0.03em] text-slate-800">New list</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createPersonList} className="space-y-3">
                <input
                  name="name"
                  required
                  placeholder="List name"
                  className="flex h-10 w-full rounded-[1rem] border border-[#ece7de] bg-[#fcfbf8] px-3 py-2 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-200"
                />
                <input
                  name="description"
                  placeholder="Description (optional)"
                  className="flex h-10 w-full rounded-[1rem] border border-[#ece7de] bg-[#fcfbf8] px-3 py-2 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-200"
                />
                <button
                  type="submit"
                  className="w-full rounded-full border border-[#ece7de] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Create list
                </button>
              </form>

              {(contacts ?? []).length > 0 ? (
                <form action={savePersonSearchAsList} className="mt-4 space-y-3">
                  <input type="hidden" name="filters" value={currentFilterPayload} />
                  <input type="hidden" name="contactIds" value={currentContactIds} />
                  <input
                    name="name"
                    required
                    placeholder="Filtered list name"
                    className="flex h-10 w-full rounded-[1rem] border border-[#ece7de] bg-[#fcfbf8] px-3 py-2 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-200"
                  />
                  <input
                    name="description"
                    placeholder="Save current filters + members"
                    className="flex h-10 w-full rounded-[1rem] border border-[#ece7de] bg-[#fcfbf8] px-3 py-2 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-200"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                  >
                    Save current results as list
                  </button>
                </form>
              ) : null}

              {(lists ?? []).length > 0 ? (
                <div className="mt-4 space-y-1.5">
                  {(lists ?? []).map((list) => (
                    <Link
                      key={list.id}
                      href={`/dashboard/lists/${list.id}`}
                      className="block rounded-[1rem] px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                    >
                      {list.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </aside>

        {/* Results */}
        <div className="space-y-4">
          {filters.merged === "done" ? (
            <WorkspaceBanner tone="success" text="Contacts merged. Duplicate removed." />
          ) : null}

          {dupeGroups.length > 0 ? (
            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/80 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-amber-900">
                  {dupeGroups.length} potential {dupeGroups.length === 1 ? "duplicate" : "duplicates"} detected
                </p>
                <Link
                  href={filters.show_dupes === "1" ? "/dashboard/people" : "/dashboard/people?show_dupes=1"}
                  className="text-xs font-medium text-amber-700 underline"
                >
                  {filters.show_dupes === "1" ? "Hide" : "Review"}
                </Link>
              </div>
              {filters.show_dupes === "1" ? (
                <div className="mt-3 space-y-3">
                  {dupeGroups.map((group) => (
                    <div key={group.key} className="rounded-[1.25rem] border border-amber-200 bg-white p-3">
                      <p className="text-xs text-amber-700 mb-2">
                        Duplicate {group.type === "email" ? "email" : "LinkedIn slug"}: <strong>{group.key}</strong>
                      </p>
                      <div className="space-y-2">
                        {(group.contacts ?? []).map((c, i) => (
                          <div key={c.id} className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-slate-800">{c.name || c.work_email || c.email}</p>
                              <p className="text-xs text-slate-500">{c.job_title || c.role}</p>
                            </div>
                            {i > 0 ? (
                              <form action={mergeDuplicateContact}>
                                <input type="hidden" name="keepId" value={(group.contacts ?? [])[0].id} />
                                <input type="hidden" name="mergeId" value={c.id} />
                                <button
                                  type="submit"
                                  className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs text-amber-800 hover:bg-amber-200"
                                >
                                  Merge into above
                                </button>
                              </form>
                            ) : (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-700">Keep</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {(contacts ?? []).length} {(contacts ?? []).length === 1 ? "person" : "people"}
              {activeFilters.length > 0 ? " · filtered" : ""}
            </p>
          </div>

          {(contacts ?? []).length === 0 ? (
            <WorkspaceEmptyState text="No people match your filters. Add contacts through company pages or use Scan team pages." />
          ) : (
            <div className="space-y-3">
              {(contacts ?? []).map((contact) => {
                const company = Array.isArray(contact.companies) ? contact.companies[0] : contact.companies;
                const email = contact.work_email || contact.email;
                const phone = contact.direct_phone || contact.phone;
                const title = contact.job_title || contact.role;
                return (
                  <Link
                    key={contact.id}
                    href={`/dashboard/people/${contact.id}`}
                    className={`block p-4 transition hover:border-white hover:bg-white ${workspaceSoftInsetClass}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-800">{contact.name || email || "Unnamed"}</p>
                          {contact.is_decision_maker ? (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700">DM</span>
                          ) : null}
                          {contact.has_recent_changes ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">Changed</span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {[title, company?.name].filter(Boolean).join(" at ")}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-slate-400">
                          {contact.role_normalized ? <WorkspacePill>{contact.role_normalized}</WorkspacePill> : null}
                          {contact.seniority ? <span>{contact.seniority.replace(/_/g, " ")}</span> : null}
                          {email ? <span>{email}</span> : null}
                          {phone ? <span>{phone}</span> : null}
                          {contact.linkedin_url ? <span className="text-blue-500">LinkedIn</span> : null}
                          {company?.industry ? <span>{company.industry}</span> : null}
                          {company?.city ? <span>{company.city}</span> : null}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
