import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  workspaceCardClass,
  workspaceSoftInsetClass,
} from "@/components/workspace-theme";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceOwnerId } from "@/lib/workspace";

import { createPersonList } from "../actions";

export default async function ListsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const workspaceOwnerId = await getWorkspaceOwnerId(supabase, user.id);

  const { data: lists } = await supabase
    .from("person_lists")
    .select(`
      id, name, description, created_at,
      person_list_members(count)
    `)
    .eq("created_by", workspaceOwnerId)
    .order("created_at", { ascending: false });

  return (
    <main className="space-y-6">
      <WorkspaceHero
        eyebrow="Saved lists"
        title="Lists"
        description="Curated groups of people for outreach, follow-up, or export."
        tone="lavender"
        actions={
          <Link
            href="/dashboard/people"
            className="inline-flex rounded-full border border-white/80 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
          >
            ← People
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
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
                className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Create list
              </button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {(lists ?? []).length === 0 ? (
            <WorkspaceEmptyState text="No lists yet. Create one and add people from the People page." />
          ) : (
            (lists ?? []).map((list) => {
              const memberCount = Array.isArray(list.person_list_members)
                ? (list.person_list_members[0] as { count: number } | undefined)?.count ?? 0
                : 0;
              return (
                <Link
                  key={list.id}
                  href={`/dashboard/lists/${list.id}`}
                  className={`block p-5 transition hover:border-white hover:bg-white ${workspaceSoftInsetClass}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-800">{list.name}</p>
                      {list.description ? <p className="mt-1 text-sm text-slate-500">{list.description}</p> : null}
                      <p className="mt-2 text-xs text-slate-400">
                        {memberCount} {memberCount === 1 ? "person" : "people"} · {formatDate(list.created_at)}
                      </p>
                    </div>
                    <span className="rounded-full border border-[#ede7de] bg-[#fcfbf8] px-3 py-1 text-xs text-slate-500">
                      {memberCount}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}
