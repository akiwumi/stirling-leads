import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPostSignInPath } from "@/lib/auth-flow";
import { getPricingSummary } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { WelcomeTermsGate } from "@/app/welcome/terms-gate";

const errorMessages: Record<string, string> = {
  accept_terms_required: "You must agree to the terms and conditions before entering the dashboard.",
  confirm_email_first: "Confirm your email before opening the dashboard.",
  missing_email: "No account email found for the welcome email step.",
  welcome_email_failed: "The welcome email could not be sent. Check your Resend setup and try again.",
};

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const nextPath = await getPostSignInPath(supabase, user.id);

  if (nextPath === "/dashboard") {
    redirect(nextPath);
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, company_name, email_confirmed_at, billing_cycle, trial_ends_at, terms_accepted_at")
    .eq("id", user.id)
    .maybeSingle();

  const pricing = getPricingSummary();
  const trialEndLabel = profile?.trial_ends_at
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(profile.trial_ends_at))
    : "Not set";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f3ef_0%,#f2f0ea_100%)] px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <Card className="rounded-[2rem] border-[#ece7de] bg-white/95 shadow-[0_24px_80px_rgba(32,24,16,0.06)]">
          <CardHeader>
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Welcome</p>
            <CardTitle className="font-[family:var(--font-display)] text-4xl tracking-[-0.06em]">
              {profile?.full_name ? `Welcome, ${profile.full_name}` : "Welcome to Stirling"}
            </CardTitle>
            <CardDescription>
              {profile?.company_name || "Your workspace"} is ready. Use the dashboard link below to enter the app and trigger your welcome email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {params.error ? (
              <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {errorMessages[params.error] || "Action failed."}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] border border-[#ece7de] bg-[#fbfaf7] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Email status</p>
                <p className="mt-2 text-sm text-slate-700">
                  {profile?.email_confirmed_at ? "Verified" : "Waiting for verification"}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[#ece7de] bg-[#fbfaf7] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Billing cycle</p>
                <p className="mt-2 text-sm capitalize text-slate-700">{profile?.billing_cycle || "monthly"}</p>
              </div>
              <div className="rounded-[1.5rem] border border-[#ece7de] bg-[#fbfaf7] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Trial ends</p>
                <p className="mt-2 text-sm text-slate-700">{trialEndLabel}</p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[#ece7de] bg-[#fbfaf7] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Terms status</p>
              <p className="mt-2 text-sm text-slate-700">
                {profile?.terms_accepted_at ? "Accepted" : "Not accepted yet"}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
              Solo starts at {pricing.solo.monthlyPriceLabel}/mo or {pricing.solo.annualPriceLabel}/yr. Team starts at {pricing.team.monthlyPriceLabel}/mo. Self-serve plans include a {pricing.trialDays}-day trial. {pricing.refundPolicy}
            </div>

            <WelcomeTermsGate />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
