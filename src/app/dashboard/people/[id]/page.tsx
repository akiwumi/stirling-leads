import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  WorkspaceBanner,
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePill,
  workspaceCardClass,
  workspaceSelectClass,
  workspaceSoftInsetClass,
} from "@/components/workspace-theme";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceOwnerId } from "@/lib/workspace";

import { addToPersonList, pushContactToCrm, updateContact } from "../../actions";

export default async function PersonDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string; crm?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const workspaceOwnerId = await getWorkspaceOwnerId(supabase, user.id);

  const { data: contact } = await supabase
    .from("contacts")
    .select(`
      *,
      companies(id, name, industry, city, country, website_url, created_by)
    `)
    .eq("id", id)
    .maybeSingle();

  if (!contact) notFound();

  const company = Array.isArray(contact.companies) ? contact.companies[0] : contact.companies;

  if (company?.created_by !== workspaceOwnerId) redirect("/dashboard/people");

  const [{ data: sources }, { data: lists }, { data: listMemberships }, { data: changeEvents }] = await Promise.all([
    supabase.from("contact_sources").select("*").eq("contact_id", id).order("created_at", { ascending: false }),
    supabase.from("person_lists").select("id, name").eq("created_by", workspaceOwnerId).order("name", { ascending: true }),
    supabase.from("person_list_members").select("list_id, person_lists(name)").eq("contact_id", id),
    supabase
      .from("directory_change_events")
      .select("*")
      .eq("contact_id", id)
      .order("detected_at", { ascending: false })
      .limit(10),
  ]);

  const memberListIds = new Set((listMemberships ?? []).map((m) => m.list_id));
  const email = contact.work_email || contact.email;
  const phone = contact.direct_phone || contact.phone;
  const title = contact.job_title || contact.role;

  return (
    <main className="space-y-8">
      <WorkspaceHero
        eyebrow="Person profile"
        title={contact.name || email || "Unnamed person"}
        description={[title, company?.name ? `at ${company.name}` : null, company?.city, company?.country].filter(Boolean).join(" · ")}
        tone="lavender"
        actions={
          <>
            <Link
              href="/dashboard/people"
              className="inline-flex rounded-full border border-white/80 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
            >
              ← All people
            </Link>
            {company ? (
              <Link
                href={`/dashboard/companies/${company.id}`}
                className="inline-flex rounded-full border border-white/80 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
              >
                Open company →
              </Link>
            ) : null}
            {contact.linkedin_url ? (
              <a
                href={contact.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full border border-white/80 bg-[#0077b5] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#005f8e]"
              >
                Open LinkedIn ↗
              </a>
            ) : null}
            <form action={pushContactToCrm}>
              <input type="hidden" name="contactId" value={contact.id} />
              <input type="hidden" name="companyId" value={company?.id ?? ""} />
              <input type="hidden" name="provider" value="hubspot" />
              <button
                type="submit"
                className="inline-flex rounded-full border border-white/80 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
              >
                Push to HubSpot
              </button>
            </form>
          </>
        }
      />

      {query.error ? <WorkspaceBanner tone="error" text="Something went wrong. Please try again." /> : null}
      {query.saved ? <WorkspaceBanner tone="success" text="Added to list." /> : null}
      {query.crm === "synced" ? <WorkspaceBanner tone="success" text="Pushed to HubSpot." /> : null}
      {query.crm === "error" ? <WorkspaceBanner tone="error" text="HubSpot push failed. Check your connection in Integrations." /> : null}

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          {/* Contact details */}
          <Card className={workspaceCardClass}>
            <CardHeader>
              <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-800">Contact details</CardTitle>
              <CardDescription>Role, contact info, LinkedIn profile, and source.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <Info label="Job title" value={title} />
              <Info label="Normalized role" value={contact.role_normalized} />
              <Info label="Department" value={contact.department} />
              <Info label="Seniority" value={contact.seniority?.replace(/_/g, " ") ?? null} />
              <Info label="Work email" value={email} link={email ? `mailto:${email}` : undefined} />
              <Info label="Direct phone" value={phone} link={phone ? `tel:${phone}` : undefined} />
              <Info label="LinkedIn" value={contact.linkedin_slug ? `linkedin.com/in/${contact.linkedin_slug}` : contact.linkedin_url} link={contact.linkedin_url ?? undefined} />
              <Info label="Source" value={contact.source_type?.replace(/_/g, " ") ?? null} />
              <Info label="Company" value={company?.name ?? null} link={company ? `/dashboard/companies/${company.id}` : undefined} />
              <Info label="Industry" value={company?.industry ?? null} />
              <Info label="Location" value={[company?.city, company?.country].filter(Boolean).join(", ") || null} />
              <div className="flex gap-2">
                {contact.is_decision_maker ? <WorkspacePill className="border-blue-200 bg-blue-50 text-blue-700">Decision maker</WorkspacePill> : null}
                {contact.has_recent_changes ? <WorkspacePill className="border-amber-200 bg-amber-50 text-amber-700">Recently changed</WorkspacePill> : null}
              </div>
            </CardContent>
          </Card>

          {/* Edit form */}
          <Card className={workspaceCardClass}>
            <CardHeader>
              <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-800">Edit person</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateContact} className="grid gap-3 md:grid-cols-2">
                <input type="hidden" name="contactId" value={contact.id} />
                <input type="hidden" name="companyId" value={company?.id ?? ""} />
                <Input name="name" defaultValue={contact.name ?? ""} placeholder="Full name" />
                <Input name="jobTitle" defaultValue={title ?? ""} placeholder="Job title" />
                <Input name="email" defaultValue={email ?? ""} placeholder="Work email" type="email" />
                <Input name="phone" defaultValue={phone ?? ""} placeholder="Direct phone" />
                <Input name="linkedinUrl" defaultValue={contact.linkedin_url ?? ""} placeholder="LinkedIn URL" />
                <select name="seniority" defaultValue={contact.seniority ?? ""} className={workspaceSelectClass}>
                  <option value="">Seniority</option>
                  <option value="c_suite">C-Suite</option>
                  <option value="vp">VP / Director</option>
                  <option value="manager">Manager / Head</option>
                  <option value="individual">Individual Contributor</option>
                </select>
                <select name="department" defaultValue={contact.department ?? ""} className={workspaceSelectClass}>
                  <option value="">Department</option>
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
                <Input name="consentBasis" defaultValue={contact.consent_basis ?? ""} placeholder="Consent basis" />
                <div className="md:col-span-2">
                  <Button type="submit">Save changes</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Change history */}
          {(changeEvents ?? []).length > 0 ? (
            <Card className={workspaceCardClass}>
              <CardHeader>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-800">Change history</CardTitle>
                <CardDescription>Fields that changed during the last refresh.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(changeEvents ?? []).map((event) => (
                  <div key={event.id} className={`${workspaceSoftInsetClass} p-4 text-sm`}>
                    <p className="font-medium">{event.field_name.replace(/_/g, " ")}</p>
                    <p className="mt-1 text-slate-500">
                      {event.old_value ? <span className="line-through text-slate-400">{event.old_value}</span> : "Empty"} → {event.new_value || "Removed"}
                    </p>
                    <p className="mt-1.5 text-xs text-slate-400">{formatDate(event.detected_at)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          {/* Lists */}
          <Card className={workspaceCardClass}>
            <CardHeader>
              <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-800">Lists</CardTitle>
              <CardDescription>Save this person to a curated list.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(listMemberships ?? []).length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-widest text-slate-400">Member of</p>
                  {(listMemberships ?? []).map((m) => {
                    const listName = Array.isArray(m.person_lists) ? m.person_lists[0]?.name : (m.person_lists as { name: string } | null)?.name;
                    return (
                      <Link
                        key={m.list_id}
                        href={`/dashboard/lists/${m.list_id}`}
                        className={`block p-3 text-sm transition hover:bg-white ${workspaceSoftInsetClass}`}
                      >
                        {listName ?? "Unnamed list"}
                      </Link>
                    );
                  })}
                </div>
              ) : null}

              {(lists ?? []).filter((l) => !memberListIds.has(l.id)).length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-widest text-slate-400">Add to list</p>
                  {(lists ?? [])
                    .filter((l) => !memberListIds.has(l.id))
                    .map((list) => (
                      <form key={list.id} action={addToPersonList}>
                        <input type="hidden" name="listId" value={list.id} />
                        <input type="hidden" name="contactId" value={contact.id} />
                        <button
                          type="submit"
                          className={`w-full p-3 text-left text-sm transition hover:bg-white ${workspaceSoftInsetClass}`}
                        >
                          + {list.name}
                        </button>
                      </form>
                    ))}
                </div>
              ) : null}

              {(lists ?? []).length === 0 ? (
                <WorkspaceEmptyState text="No lists yet. Create one on the People page." />
              ) : null}

              <Link
                href="/dashboard/lists"
                className="block text-center text-xs text-slate-400 hover:text-slate-600"
              >
                Manage all lists →
              </Link>
            </CardContent>
          </Card>

          {/* Source evidence */}
          {(sources ?? []).length > 0 ? (
            <Card className={workspaceCardClass}>
              <CardHeader>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-800">Sources</CardTitle>
                <CardDescription>Where this person was found.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(sources ?? []).map((source) => (
                  <div key={source.id} className={`${workspaceSoftInsetClass} p-4 text-sm`}>
                    <p className="font-medium">{source.source_label ?? source.source_kind.replace(/_/g, " ")}</p>
                    {source.evidence_text ? <p className="mt-1 text-slate-500">{source.evidence_text}</p> : null}
                    {source.source_url ? (
                      <a
                        href={source.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block truncate text-xs text-blue-500 hover:underline"
                      >
                        {source.source_url}
                      </a>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-400">{formatDate(source.created_at)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {/* Last checked */}
          {contact.last_checked_at ? (
            <div className={`${workspaceSoftInsetClass} p-4 text-sm`}>
              <p className="text-xs uppercase tracking-widest text-slate-400">Last checked</p>
              <p className="mt-1">{formatDate(contact.last_checked_at)}</p>
              {contact.change_summary ? <p className="mt-2 text-slate-500">{contact.change_summary}</p> : null}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Info({
  label,
  value,
  link,
}: {
  label: string;
  value: string | null | undefined;
  link?: string;
}) {
  return (
    <div className={`p-4 ${workspaceSoftInsetClass}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{label}</p>
      {link && value ? (
        <a
          href={link}
          target={link.startsWith("http") ? "_blank" : undefined}
          rel={link.startsWith("http") ? "noreferrer" : undefined}
          className="mt-1 block break-all text-blue-600 hover:underline"
        >
          {value}
        </a>
      ) : (
        <p className="mt-1 break-all">{value || "Not set"}</p>
      )}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
