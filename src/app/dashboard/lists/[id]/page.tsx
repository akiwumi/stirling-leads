import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePill,
  workspaceCardClass,
  workspaceSoftInsetClass,
} from "@/components/workspace-theme";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceOwnerId } from "@/lib/workspace";

import { deletePersonList, removeFromPersonList } from "../../actions";

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const workspaceOwnerId = await getWorkspaceOwnerId(supabase, user.id);

  const { data: list } = await supabase
    .from("person_lists")
    .select("*")
    .eq("id", id)
    .eq("created_by", workspaceOwnerId)
    .maybeSingle();

  if (!list) notFound();

  const { data: members } = await supabase
    .from("person_list_members")
    .select(`
      id, created_at, contact_id,
      contacts(
        id, name, job_title, role, role_normalized, seniority, department,
        work_email, email, direct_phone, phone, linkedin_url,
        is_decision_maker, has_recent_changes,
        companies(id, name, industry, city, country)
      )
    `)
    .eq("list_id", id)
    .order("created_at", { ascending: false });

  return (
    <main className="space-y-6">
      <WorkspaceHero
        eyebrow="Saved list"
        title={list.name}
        description={list.description ?? `${(members ?? []).length} ${(members ?? []).length === 1 ? "person" : "people"} in this list`}
        tone="lavender"
        actions={
          <>
            <Link
              href="/dashboard/lists"
              className="inline-flex rounded-full border border-white/80 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
            >
              ← All lists
            </Link>
            <Link
              href="/dashboard/people"
              className="inline-flex rounded-full border border-white/80 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
            >
              Add people →
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
        <div className="space-y-3">
          {(members ?? []).length === 0 ? (
            <WorkspaceEmptyState text="This list is empty. Go to the People page to add people to this list." />
          ) : (
            (members ?? []).map((member) => {
              const contact = Array.isArray(member.contacts) ? member.contacts[0] : member.contacts;
              if (!contact) return null;
              const company = Array.isArray(contact.companies) ? contact.companies[0] : contact.companies;
              const email = contact.work_email || contact.email;
              const phone = contact.direct_phone || contact.phone;
              const title = contact.job_title || contact.role;

              return (
                <div key={member.id} className={`${workspaceSoftInsetClass} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/dashboard/people/${contact.id}`} className="min-w-0 flex-1 hover:opacity-80">
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
                        {[title, company?.name ? `at ${company.name}` : null].filter(Boolean).join(" ")}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-slate-400">
                        {contact.role_normalized ? <WorkspacePill>{contact.role_normalized}</WorkspacePill> : null}
                        {email ? <span>{email}</span> : null}
                        {phone ? <span>{phone}</span> : null}
                        {contact.linkedin_url ? (
                          <a
                            href={contact.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            LinkedIn ↗
                          </a>
                        ) : null}
                      </div>
                    </Link>

                    <form action={removeFromPersonList} className="shrink-0">
                      <input type="hidden" name="listId" value={id} />
                      <input type="hidden" name="contactId" value={contact.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-[#ece7de] bg-white px-3 py-1.5 text-xs text-slate-400 transition hover:border-red-200 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <aside className="space-y-4">
          <Card className={workspaceCardClass}>
            <CardHeader>
              <CardTitle className="font-[family:var(--font-display)] text-lg tracking-[-0.03em] text-slate-800">List info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">Name</p>
                <p className="mt-1">{list.name}</p>
              </div>
              {list.description ? (
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400">Description</p>
                  <p className="mt-1 text-slate-600">{list.description}</p>
                </div>
              ) : null}
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">Members</p>
                <p className="mt-1">{(members ?? []).length}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">Created</p>
                <p className="mt-1">{formatDate(list.created_at)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className={workspaceCardClass}>
            <CardHeader>
              <CardTitle className="font-[family:var(--font-display)] text-lg tracking-[-0.03em] text-slate-800">Danger zone</CardTitle>
              <CardDescription>Permanently delete this list and all its memberships.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={deletePersonList}>
                <input type="hidden" name="listId" value={id} />
                <button
                  type="submit"
                  className="w-full rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                >
                  Delete list
                </button>
              </form>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}
