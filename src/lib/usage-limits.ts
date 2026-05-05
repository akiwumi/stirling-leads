import { createClient } from "@/lib/supabase/server";

export const USAGE_METRICS = {
  LEADS_IMPORTED: "leads_imported",
  COMPANIES_ANALYZED: "companies_analyzed",
  AI_SCORES_GENERATED: "ai_scores_generated",
  OUTREACH_DRAFTS_GENERATED: "outreach_drafts_generated",
  EMAILS_SENT: "emails_sent",
  SAVED_LISTS_CREATED: "saved_lists_created",
} as const;

export type UsageMetricKey = (typeof USAGE_METRICS)[keyof typeof USAGE_METRICS];

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type UsageProfile = {
  plan_key: string | null;
  subscription_status: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  seats_included: number | null;
  seat_count: number | null;
};

export type UsageCounterRow = {
  metric_key: UsageMetricKey;
  used_count: number;
  limit_count: number;
  period_start: string;
  period_end: string;
};

export type UsageSummary = {
  metric: UsageMetricKey;
  label: string;
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  isExceeded: boolean;
  isNearLimit: boolean;
};

type PlanLimits = {
  seatsIncluded: number;
  limits: Record<UsageMetricKey, number>;
};

const PLAN_LIMITS: Record<string, PlanLimits> = {
  solo_monthly: {
    seatsIncluded: 1,
    limits: {
      leads_imported: 250,
      companies_analyzed: 150,
      ai_scores_generated: 150,
      outreach_drafts_generated: 100,
      emails_sent: 50,
      saved_lists_created: 25,
    },
  },
  solo_annual: {
    seatsIncluded: 1,
    limits: {
      leads_imported: 350,
      companies_analyzed: 220,
      ai_scores_generated: 220,
      outreach_drafts_generated: 150,
      emails_sent: 75,
      saved_lists_created: 40,
    },
  },
  team_monthly: {
    seatsIncluded: 3,
    limits: {
      leads_imported: 2000,
      companies_analyzed: 1200,
      ai_scores_generated: 1200,
      outreach_drafts_generated: 600,
      emails_sent: 300,
      saved_lists_created: 150,
    },
  },
  team_annual: {
    seatsIncluded: 3,
    limits: {
      leads_imported: 3000,
      companies_analyzed: 1800,
      ai_scores_generated: 1800,
      outreach_drafts_generated: 900,
      emails_sent: 500,
      saved_lists_created: 250,
    },
  },
};

const METRIC_LABELS: Record<UsageMetricKey, string> = {
  leads_imported: "Leads imported",
  companies_analyzed: "Companies analyzed",
  ai_scores_generated: "AI scores generated",
  outreach_drafts_generated: "Outreach drafts generated",
  emails_sent: "Emails sent",
  saved_lists_created: "Saved lists created",
};

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function addUtcDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function resolvePlanKey(profile: UsageProfile) {
  return profile.plan_key && PLAN_LIMITS[profile.plan_key] ? profile.plan_key : "solo_monthly";
}

function resolvePeriodWindow(profile: UsageProfile) {
  if (profile.current_period_start && profile.current_period_end) {
    return {
      periodStart: profile.current_period_start,
      periodEnd: profile.current_period_end,
    };
  }

  if (profile.trial_started_at && profile.trial_ends_at) {
    return {
      periodStart: profile.trial_started_at,
      periodEnd: profile.trial_ends_at,
    };
  }

  const now = new Date();
  const periodStart = startOfUtcMonth(now).toISOString();
  const periodEnd = addUtcMonths(startOfUtcMonth(now), 1).toISOString();
  return { periodStart, periodEnd };
}

export async function getUsageProfile(supabase: SupabaseServerClient, workspaceOwnerId: string) {
  const { data: profile } = await supabase
    .from("users")
    .select("plan_key, subscription_status, trial_started_at, trial_ends_at, current_period_start, current_period_end, seats_included, seat_count")
    .eq("id", workspaceOwnerId)
    .maybeSingle();

  return profile as UsageProfile | null;
}

export async function ensureUsageCounters(
  supabase: SupabaseServerClient,
  workspaceOwnerId: string,
) {
  const profile = await getUsageProfile(supabase, workspaceOwnerId);
  const resolvedProfile: UsageProfile = profile ?? {
    plan_key: "solo_monthly",
    subscription_status: "trial",
    trial_started_at: null,
    trial_ends_at: null,
    current_period_start: null,
    current_period_end: null,
    seats_included: 1,
    seat_count: 1,
  };

  const planKey = resolvePlanKey(resolvedProfile);
  const plan = PLAN_LIMITS[planKey];
  const { periodStart, periodEnd } = resolvePeriodWindow(resolvedProfile);

  const rows = (Object.keys(METRIC_LABELS) as UsageMetricKey[]).map((metricKey) => ({
    workspace_owner_id: workspaceOwnerId,
    metric_key: metricKey,
    period_start: periodStart,
    period_end: periodEnd,
    used_count: 0,
    limit_count: plan.limits[metricKey],
    updated_at: new Date().toISOString(),
  }));

  await supabase.from("usage_counters").upsert(rows, {
    onConflict: "workspace_owner_id,metric_key,period_start,period_end",
    ignoreDuplicates: true,
  });

  const { data: counters } = await supabase
    .from("usage_counters")
    .select("metric_key, used_count, limit_count, period_start, period_end")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd);

  return {
    planKey,
    plan,
    periodStart,
    periodEnd,
    counters: (counters ?? []) as UsageCounterRow[],
    profile: resolvedProfile,
  };
}

export async function getUsageSummaries(
  supabase: SupabaseServerClient,
  workspaceOwnerId: string,
): Promise<UsageSummary[]> {
  const { counters, plan } = await ensureUsageCounters(supabase, workspaceOwnerId);
  const counterMap = new Map(counters.map((counter) => [counter.metric_key, counter]));

  return (Object.keys(METRIC_LABELS) as UsageMetricKey[]).map((metric) => {
    const row = counterMap.get(metric);
    const limit = row?.limit_count ?? plan.limits[metric];
    const used = row?.used_count ?? 0;
    const remaining = Math.max(limit - used, 0);
    const percentUsed = limit > 0 ? Math.min(Math.round((used / limit) * 100), 999) : 0;

    return {
      metric,
      label: METRIC_LABELS[metric],
      used,
      limit,
      remaining,
      percentUsed,
      isExceeded: used >= limit,
      isNearLimit: used >= Math.ceil(limit * 0.8),
    };
  });
}

export async function assertUsageWithinLimit(
  supabase: SupabaseServerClient,
  workspaceOwnerId: string,
  metric: UsageMetricKey,
  amount = 1,
) {
  const summaries = await getUsageSummaries(supabase, workspaceOwnerId);
  const summary = summaries.find((item) => item.metric === metric);

  if (!summary) {
    return;
  }

  if (summary.used + amount > summary.limit) {
    const error = new Error(`usage_limit:${metric}`);
    error.name = "UsageLimitError";
    throw error;
  }
}

export async function incrementUsage(
  supabase: SupabaseServerClient,
  workspaceOwnerId: string,
  metric: UsageMetricKey,
  amount = 1,
) {
  const { periodStart, periodEnd } = await ensureUsageCounters(supabase, workspaceOwnerId);
  const { data: current } = await supabase
    .from("usage_counters")
    .select("used_count")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("metric_key", metric)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .maybeSingle();

  const nextCount = (current?.used_count ?? 0) + amount;

  await supabase
    .from("usage_counters")
    .update({
      used_count: nextCount,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("metric_key", metric)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd);
}

export async function getSeatSummary(
  supabase: SupabaseServerClient,
  workspaceOwnerId: string,
) {
  const profile = await getUsageProfile(supabase, workspaceOwnerId);
  const purchasedSeats = Math.max(profile?.seat_count ?? profile?.seats_included ?? 1, 1);
  const includedSeats = Math.max(profile?.seats_included ?? purchasedSeats, 1);

  const { count: activeMemberCount } = await supabase
    .from("workspace_members")
    .select("*", { count: "exact", head: true })
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("status", "active");

  const occupiedSeats = 1 + (activeMemberCount ?? 0);

  return {
    purchasedSeats,
    includedSeats,
    occupiedSeats,
    availableSeats: Math.max(purchasedSeats - occupiedSeats, 0),
    isFull: occupiedSeats >= purchasedSeats,
  };
}

export function buildUsageLimitRedirect(targetPath: string, metric: UsageMetricKey) {
  return `/dashboard/billing?limit=${encodeURIComponent(metric)}&next=${encodeURIComponent(targetPath)}`;
}

export function buildSeatLimitRedirect(targetPath: string) {
  return `/dashboard/billing?limit=team_seats&next=${encodeURIComponent(targetPath)}`;
}

export function buildUsageResetPreview(profile: UsageProfile | null) {
  const resolved = profile ?? {
    plan_key: "solo_monthly",
    subscription_status: "trial",
    trial_started_at: null,
    trial_ends_at: null,
    current_period_start: null,
    current_period_end: null,
    seats_included: 1,
    seat_count: 1,
  };
  const { periodStart, periodEnd } = resolvePeriodWindow(resolved);
  return { periodStart, periodEnd };
}

export function buildDatePresets() {
  const today = new Date();
  return {
    last24Hours: addUtcDays(startOfUtcDay(today), -1).toISOString().slice(0, 10),
    last7Days: addUtcDays(startOfUtcDay(today), -7).toISOString().slice(0, 10),
    last30Days: addUtcDays(startOfUtcDay(today), -30).toISOString().slice(0, 10),
  };
}
