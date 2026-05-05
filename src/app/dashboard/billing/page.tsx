"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, ExternalLink, Loader2 } from "lucide-react";

import { getPricingSummary } from "@/lib/pricing";

type BillingProfile = {
  subscription_status: string | null;
  plan_key: string | null;
  billing_cycle: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  stripe_subscription_id: string | null;
  seats_included: number | null;
  seat_count: number | null;
  workspace_role: string | null;
  usage_period: {
    periodStart: string;
    periodEnd: string;
  } | null;
  seats: {
    purchasedSeats: number;
    includedSeats: number;
    occupiedSeats: number;
    availableSeats: number;
    isFull: boolean;
  } | null;
  usage: Array<{
    metric: string;
    label: string;
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
    isExceeded: boolean;
    isNearLimit: boolean;
  }>;
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  trialing: { label: "Trial", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  trial: { label: "Trial", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  active: { label: "Active", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  past_due: { label: "Past due", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  canceled: { label: "Canceled", cls: "bg-slate-100 text-slate-500 border-slate-200" },
  incomplete: { label: "Incomplete", cls: "bg-red-50 text-red-600 border-red-200" },
  unpaid: { label: "Unpaid", cls: "bg-red-50 text-red-600 border-red-200" },
};

const PLAN_LABELS: Record<string, string> = {
  solo_monthly: "Solo — Monthly",
  solo_annual: "Solo — Annual",
  team_monthly: "Team — Monthly",
  team_annual: "Team — Annual",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

async function fetchProfile(): Promise<BillingProfile | null> {
  const res = await fetch("/api/billing/profile");
  if (!res.ok) return null;
  return res.json();
}

async function openPortal() {
  const res = await fetch("/api/billing/portal", { method: "POST" });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Unable to open billing portal");
  }
  if (data.url) window.location.href = data.url;
}

async function startCheckout(planKey: string) {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan_key: planKey }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Unable to start checkout");
  }
  if (data.url) window.location.href = data.url;
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const checkoutParam = searchParams.get("checkout");
  const limitParam = searchParams.get("limit");
  const pricing = getPricingSummary();

  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile().then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, []);

  const status = profile?.subscription_status ?? "trial";
  const statusInfo = STATUS_LABELS[status] ?? { label: status, cls: "bg-slate-100 text-slate-500 border-slate-200" };
  const isSubscribed = ["active", "trialing", "past_due"].includes(status) && !!profile?.stripe_subscription_id;
  const isTrial = status === "trial" || status === "trialing";

  const handlePortal = async () => {
    setActionError(null);
    setPortalLoading(true);
    try {
      await openPortal();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to open billing portal");
      setPortalLoading(false);
    }
  };

  const handleCheckout = async (planKey: string) => {
    setActionError(null);
    setCheckoutLoading(planKey);
    try {
      await startCheckout(planKey);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to start checkout");
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Account</p>
        <h1 className="mt-2 font-[family:var(--font-display)] text-3xl font-semibold tracking-[-0.05em] text-slate-900">
          Billing
        </h1>
        <p className="mt-1 text-sm text-slate-500">Manage your subscription and payment method.</p>
      </div>

      {checkoutParam === "success" && (
        <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
          Subscription activated. Welcome to Stirling!
        </div>
      )}
      {checkoutParam === "cancelled" && (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Checkout cancelled. Your subscription was not changed.
        </div>
      )}
      {limitParam && (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Usage limit reached for <strong>{limitParam.replace(/_/g, " ")}</strong>. Upgrade or switch to Team to keep the workspace moving.
        </div>
      )}
      {actionError && (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Current plan */}
      <div className="rounded-[1.5rem] border border-[#ece7de] bg-white/90 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0edf8]">
            <CreditCard className="h-5 w-5 text-violet-600" />
          </div>
          <h2 className="font-semibold text-slate-800">Current plan</h2>
        </div>

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-xs text-slate-400">Plan</p>
                <p className="mt-0.5 font-medium text-slate-800">
                  {PLAN_LABELS[profile?.plan_key ?? ""] ?? "Stirling Solo"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Status</p>
                <span className={`mt-0.5 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusInfo.cls}`}>
                  {statusInfo.label}
                </span>
              </div>
              {profile?.billing_cycle && (
                <div>
                  <p className="text-xs text-slate-400">Billing</p>
                  <p className="mt-0.5 font-medium capitalize text-slate-800">{profile.billing_cycle}</p>
                </div>
              )}
              {!!profile?.seats_included && (
                <div>
                  <p className="text-xs text-slate-400">Seats</p>
                  <p className="mt-0.5 font-medium text-slate-800">
                    {profile.seats?.occupiedSeats ?? 1} of {profile.seat_count ?? profile.seats_included}
                  </p>
                </div>
              )}
            </div>

            {isTrial && profile?.trial_ends_at && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                Trial ends <strong>{formatDate(profile.trial_ends_at)}</strong>. Subscribe before it expires to keep full access.
              </div>
            )}

            {isSubscribed && profile?.current_period_end && (
              <p className="text-sm text-slate-500">
                {profile.cancel_at_period_end
                  ? `Access until ${formatDate(profile.current_period_end)}, then canceled.`
                  : `Renews ${formatDate(profile.current_period_end)}.`}
              </p>
            )}

            {status === "past_due" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Payment failed. Update your payment method to restore full access.
              </div>
            )}

            {isSubscribed && (
              <button
                className="inline-flex items-center gap-2 rounded-full border border-[#e7e1d8] bg-[#faf9f6] px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-white disabled:opacity-50"
                disabled={portalLoading}
                onClick={handlePortal}
              >
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                Manage subscription
              </button>
            )}
          </div>
        )}
      </div>

      {!!profile?.usage?.length && (
        <div className="rounded-[1.5rem] border border-[#ece7de] bg-white/90 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-800">Usage this billing period</h2>
              <p className="mt-1 text-sm text-slate-500">
                Resets automatically at the next billing boundary.
                {profile.usage_period ? ` Current window ends ${formatDate(profile.usage_period.periodEnd)}.` : ""}
              </p>
            </div>
            {profile.workspace_role && (
              <span className="inline-flex rounded-full border border-[#e7e1d8] bg-[#faf9f6] px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                {profile.workspace_role}
              </span>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {profile.usage.map((item) => (
              <div key={item.metric} className="rounded-[1.25rem] border border-[#ece7de] bg-[#faf9f6] p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-slate-800">{item.label}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                    item.isExceeded ? "bg-red-100 text-red-700" : item.isNearLimit ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {item.used}/{item.limit}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{item.remaining} remaining</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscribe / upgrade */}
      {!isSubscribed && (
        <div className="rounded-[1.5rem] border border-[#ece7de] bg-white/90 p-6">
          <h2 className="mb-1 font-semibold text-slate-800">Choose a plan</h2>
          <p className="mb-6 text-sm text-slate-500">
            {pricing.trialDays}-day free trial on self-serve plans. Solo and Team keep the core workflow live, while Team adds seats and shared operations.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Solo */}
            <div className="rounded-[1.25rem] border border-[#ece7de] bg-[#faf9f6] p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Solo</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{pricing.solo.monthlyPriceLabel}<span className="text-sm font-normal text-slate-400">/mo</span></p>
              <p className="mt-1 text-xs text-slate-500">Or {pricing.solo.annualPriceLabel}/yr — save {pricing.solo.annualSavingsLabel}</p>
              <ul className="mt-3 space-y-1 text-xs text-slate-600">
                <li>Full company search and lead scoring</li>
                <li>People database, lists, updates, and exports</li>
                <li>CRM push and refresh workflows</li>
                <li>1 seat</li>
              </ul>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  className="w-full rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                  disabled={checkoutLoading === "solo_monthly"}
                  onClick={() => handleCheckout("solo_monthly")}
                >
                  {checkoutLoading === "solo_monthly" ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : `Start ${pricing.trialDays}-day trial — Monthly`}
                </button>
                <button
                  className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  disabled={checkoutLoading === "solo_annual"}
                  onClick={() => handleCheckout("solo_annual")}
                >
                  {checkoutLoading === "solo_annual" ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : `Start ${pricing.trialDays}-day trial — Annual`}
                </button>
              </div>
            </div>

            {/* Team */}
            <div className="rounded-[1.25rem] border border-[#ece7de] bg-[#faf9f6] p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Team</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{pricing.team.monthlyPriceLabel}<span className="text-sm font-normal text-slate-400">/mo</span></p>
              <p className="mt-1 text-xs text-slate-500">
                Or {pricing.team.annualPriceLabel}/yr — equivalent to {pricing.team.annualMonthlyEquivalentLabel}/mo and save {pricing.team.annualSavingsLabel}
              </p>
              <ul className="mt-3 space-y-1 text-xs text-slate-600">
                <li>Everything in Solo</li>
                <li>Up to 3 team seats</li>
                <li>Shared workspace</li>
                <li>Higher usage limits</li>
              </ul>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  className="w-full rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                  disabled={checkoutLoading === "team_monthly"}
                  onClick={() => handleCheckout("team_monthly")}
                >
                  {checkoutLoading === "team_monthly" ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : `Start ${pricing.trialDays}-day trial — Monthly`}
                </button>
                <button
                  className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  disabled={checkoutLoading === "team_annual"}
                  onClick={() => handleCheckout("team_annual")}
                >
                  {checkoutLoading === "team_annual" ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : `Start ${pricing.trialDays}-day trial — Annual`}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[1.25rem] border border-[#ece7de] bg-[#faf9f6] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Enterprise</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{pricing.enterprise.pricingLabel}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {pricing.enterprise.billingLabel}. Invoice billing, manual onboarding, priority support, procurement help.
                </p>
              </div>
              <a
                href="/dashboard/contact"
                className="inline-flex rounded-full border border-[#e7e1d8] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Contact sales
              </a>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-400">{pricing.refundPolicy}</p>
        </div>
      )}
    </div>
  );
}
