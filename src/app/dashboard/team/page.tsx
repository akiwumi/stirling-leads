import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { WorkspaceBanner, WorkspaceHero, WorkspacePill, workspaceCardClass, workspaceSoftInsetClass } from "@/components/workspace-theme";
import { getSeatSummary } from "@/lib/usage-limits";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";

import { acceptWorkspaceInvite, inviteWorkspaceMember, revokeWorkspaceMember } from "../actions";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ invited?: string; accepted?: string; removed?: string; error?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspace = await getWorkspaceContext(supabase, user.id);
  const [seatSummary, membershipsResult, invitesResult, profileResult] = await Promise.all([
    getSeatSummary(supabase, workspace.workspaceOwnerId),
    supabase
      .from("workspace_members")
      .select("id, invite_email, role, status, member_user_id, accepted_at, created_at")
      .eq("workspace_owner_id", workspace.workspaceOwnerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("workspace_members")
      .select("id, workspace_owner_id, invite_email, role, status, created_at")
      .eq("invite_email", user.email?.toLowerCase() ?? "")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase.from("users").select("full_name, email").eq("id", workspace.workspaceOwnerId).maybeSingle(),
  ]);

  const memberships = membershipsResult.data ?? [];
  const pendingInvites = invitesResult.data ?? [];
  const ownerProfile = profileResult.data;

  return (
    <main className="space-y-6">
      <WorkspaceHero
        eyebrow="Team workspace"
        title="Team"
        description="Invite teammates, track seat occupancy, and manage who works inside the shared workspace."
        tone="lavender"
      />

      {params.invited ? <WorkspaceBanner text="Team invite created." tone="success" /> : null}
      {params.accepted ? <WorkspaceBanner text="Invite accepted. You are now inside the shared workspace." tone="success" /> : null}
      {params.removed ? <WorkspaceBanner text="Team member removed." tone="success" /> : null}
      {params.limit ? <WorkspaceBanner text="No seats available on the current plan. Upgrade in Billing to add more teammates." tone="warning" /> : null}
      {params.error === "owner_only" ? <WorkspaceBanner text="Only the workspace owner can manage seats." tone="error" /> : null}
      {params.error === "invite_email_required" ? <WorkspaceBanner text="Enter an email address before inviting a teammate." tone="error" /> : null}
      {params.error === "invite_not_found" ? <WorkspaceBanner text="That invite could not be found." tone="error" /> : null}
      {params.error === "invite_email_mismatch" ? <WorkspaceBanner text="This invite belongs to a different email address." tone="error" /> : null}

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          <Card className={workspaceCardClass}>
            <CardHeader>
              <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em]">Seat summary</CardTitle>
              <CardDescription>Seats are counted at the workspace level.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className={`${workspaceSoftInsetClass} p-4 text-sm`}>
                <p className="font-medium text-slate-800">Workspace owner</p>
                <p className="mt-1 text-slate-500">{ownerProfile?.full_name || ownerProfile?.email || "Owner"}</p>
              </div>
              <div className={`${workspaceSoftInsetClass} p-4 text-sm`}>
                <p className="font-medium text-slate-800">Occupied seats</p>
                <p className="mt-1 text-slate-500">{seatSummary.occupiedSeats} of {seatSummary.purchasedSeats}</p>
              </div>
              <div className={`${workspaceSoftInsetClass} p-4 text-sm`}>
                <p className="font-medium text-slate-800">Available seats</p>
                <p className="mt-1 text-slate-500">{seatSummary.availableSeats}</p>
              </div>
            </CardContent>
          </Card>

          {workspace.isWorkspaceOwner ? (
            <Card className={workspaceCardClass}>
              <CardHeader>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em]">Invite teammate</CardTitle>
                <CardDescription>Add an existing user immediately or create a pending invite by email.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={inviteWorkspaceMember} className="space-y-3">
                  <Input name="inviteEmail" placeholder="teammate@company.com" required type="email" />
                  <select
                    name="role"
                    defaultValue="member"
                    className="flex h-11 w-full rounded-[1rem] border border-[#ece7de] bg-[#fcfbf8] px-3 py-2 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-[#2f5bea]/20"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700" type="submit">
                    Invite teammate
                  </button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {pendingInvites.length > 0 ? (
            <Card className={workspaceCardClass}>
              <CardHeader>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em]">Pending invites for you</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className={`${workspaceSoftInsetClass} flex items-center justify-between gap-3 p-4`}>
                    <div className="text-sm">
                      <p className="font-medium text-slate-800">{invite.invite_email}</p>
                      <p className="mt-1 text-slate-500">Role: {invite.role}</p>
                    </div>
                    <form action={acceptWorkspaceInvite}>
                      <input type="hidden" name="membershipId" value={invite.id} />
                      <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700" type="submit">
                        Accept
                      </button>
                    </form>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card className={workspaceCardClass}>
          <CardHeader>
            <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em]">Workspace roster</CardTitle>
            <CardDescription>Active teammates and pending invites linked to this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`${workspaceSoftInsetClass} flex items-center justify-between gap-3 p-4`}>
              <div className="text-sm">
                <p className="font-medium text-slate-800">{ownerProfile?.full_name || ownerProfile?.email || "Owner"}</p>
                <p className="mt-1 text-slate-500">Workspace owner</p>
              </div>
              <WorkspacePill className="border-emerald-200 bg-emerald-50 text-emerald-700">owner</WorkspacePill>
            </div>

            {memberships.length === 0 ? (
              <div className={`${workspaceSoftInsetClass} p-4 text-sm text-slate-500`}>
                No teammates yet.
              </div>
            ) : (
              memberships.map((membership) => (
                <div key={membership.id} className={`${workspaceSoftInsetClass} flex items-center justify-between gap-4 p-4`}>
                  <div className="text-sm">
                    <p className="font-medium text-slate-800">{membership.invite_email}</p>
                    <p className="mt-1 text-slate-500">
                      {membership.status === "active" ? "Active teammate" : "Pending invite"} · {membership.role}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <WorkspacePill className={membership.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                      {membership.status}
                    </WorkspacePill>
                    {workspace.isWorkspaceOwner ? (
                      <form action={revokeWorkspaceMember}>
                        <input type="hidden" name="membershipId" value={membership.id} />
                        <button className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100" type="submit">
                          Remove
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
