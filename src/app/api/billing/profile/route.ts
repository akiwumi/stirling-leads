import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { buildUsageResetPreview, getSeatSummary, getUsageSummaries } from "@/lib/usage-limits";
import { getWorkspaceContext } from "@/lib/workspace";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await getWorkspaceContext(supabase, user.id);

  const { data } = await supabase
    .from("users")
    .select("subscription_status, plan_key, billing_cycle, trial_started_at, trial_ends_at, current_period_start, current_period_end, cancel_at_period_end, stripe_subscription_id, seats_included, seat_count")
    .eq("id", workspace.workspaceOwnerId)
    .single();

  const [usage, seats] = await Promise.all([
    getUsageSummaries(supabase, workspace.workspaceOwnerId),
    getSeatSummary(supabase, workspace.workspaceOwnerId),
  ]);

  return NextResponse.json({
    ...(data ?? {}),
    usage,
    seats,
    workspace_role: workspace.workspaceRole,
    workspace_owner_id: workspace.workspaceOwnerId,
    usage_period: buildUsageResetPreview(data ?? null),
  });
}
