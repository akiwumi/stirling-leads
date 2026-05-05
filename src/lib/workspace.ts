import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type WorkspaceContext = {
  workspaceOwnerId: string;
  isWorkspaceOwner: boolean;
  workspaceRole: string;
  ownerProfile: {
    id: string;
    full_name: string | null;
    company_name: string | null;
    email: string | null;
    plan_key: string | null;
    subscription_status: string | null;
    seats_included: number | null;
    seat_count: number | null;
  } | null;
  userProfile: {
    workspace_owner_id: string | null;
    workspace_role: string | null;
  } | null;
};

export async function getWorkspaceContext(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<WorkspaceContext> {
  const { data: userProfile } = await supabase
    .from("users")
    .select("workspace_owner_id, workspace_role")
    .eq("id", userId)
    .maybeSingle();

  const workspaceOwnerId = userProfile?.workspace_owner_id ?? userId;

  const { data: ownerProfile } = await supabase
    .from("users")
    .select("id, full_name, company_name, email, plan_key, subscription_status, seats_included, seat_count")
    .eq("id", workspaceOwnerId)
    .maybeSingle();

  return {
    workspaceOwnerId,
    isWorkspaceOwner: workspaceOwnerId === userId,
    workspaceRole: userProfile?.workspace_role ?? (workspaceOwnerId === userId ? "owner" : "member"),
    ownerProfile,
    userProfile,
  };
}

export async function getWorkspaceOwnerId(supabase: SupabaseServerClient, userId: string) {
  const context = await getWorkspaceContext(supabase, userId);
  return context.workspaceOwnerId;
}
