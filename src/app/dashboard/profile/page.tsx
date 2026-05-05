import { redirect } from "next/navigation";

import { changePassword, sendPasswordResetLink, updateBillingPreferences, updateProfile } from "@/app/dashboard/profile/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { WorkspaceBanner, WorkspaceHero, workspaceCardClass, workspaceInsetClass } from "@/components/workspace-theme";
import { getPricingSummary } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

const saveMessages: Record<string, string> = {
  profile: "Profile updated.",
  billing: "Billing preference saved.",
  password: "Password updated.",
  reset_link: "Password reset email sent.",
};

const errorMessages: Record<string, string> = {
  invalid_billing_cycle: "Choose either monthly or annual billing.",
  missing_password: "Enter and confirm the password.",
  password_mismatch: "The new passwords do not match.",
  missing_email: "No email found for this account.",
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: emails }] = await Promise.all([
    supabase
      .from("users")
      .select(
        "full_name, company_name, email, plan_name, billing_cycle, subscription_status, monthly_price_cents, annual_price_cents, trial_started_at, trial_ends_at, email_confirmed_at, refund_policy, welcome_email_sent_at, terms_accepted_at",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("transactional_emails")
      .select("id, email_type, recipient_email, subject, status, sent_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const pricing = getPricingSummary();
  const success = params.saved ? saveMessages[params.saved] : null;
  const error = params.error ? errorMessages[params.error] || decodeURIComponent(params.error) : null;

  return (
    <main className="space-y-8">
      <WorkspaceHero
        eyebrow="User profile"
        title={profile?.full_name || user.email || "Your account"}
        description="Manage profile details, subscription preference, trial timing, password controls, and stored transactional emails."
        tone="pearl"
      />

      {success ? <WorkspaceBanner text={success} tone="success" /> : null}
      {error ? <WorkspaceBanner text={error} tone="error" /> : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className={workspaceCardClass}>
          <CardHeader>
            <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em]">Profile details</CardTitle>
            <CardDescription>Core identity and account information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={updateProfile} className="space-y-3">
              <Input defaultValue={profile?.full_name || ""} name="fullName" placeholder="Full name" />
              <Input defaultValue={profile?.company_name || ""} name="companyName" placeholder="Company name" />
              <Input defaultValue={profile?.email || user.email || ""} disabled name="email" placeholder="Email" type="email" />
              <Button type="submit">Save profile</Button>
            </form>

            <div className={`${workspaceInsetClass} grid gap-3 p-4 text-sm text-slate-600`}>
              <p>Email verified: {profile?.email_confirmed_at ? "yes" : "no"}</p>
              <p>Welcome email sent: {profile?.welcome_email_sent_at ? "yes" : "no"}</p>
              <p>Terms accepted: {profile?.terms_accepted_at ? "yes" : "no"}</p>
              <p>Plan: {profile?.plan_name || "Stirling Solo"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={workspaceCardClass}>
          <CardHeader>
            <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em]">Billing</CardTitle>
            <CardDescription>Solo and Team keep the core workflow live. Enterprise is handled separately through sales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={updateBillingPreferences} className="space-y-3">
              <label className="block text-sm font-medium text-slate-700" htmlFor="billingCycle">
                Billing cycle
              </label>
              <select
                className="flex h-11 w-full rounded-[1rem] border border-[#ece7de] bg-[#fcfbf8] px-3 py-2 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-[#2f5bea]/20"
                defaultValue={profile?.billing_cycle || "monthly"}
                id="billingCycle"
                name="billingCycle"
              >
                <option value="monthly">Monthly — {pricing.solo.monthlyPriceLabel} per month</option>
                <option value="annual">Annual — {pricing.solo.annualPriceLabel} per year</option>
              </select>
              <Button type="submit">Save billing preference</Button>
            </form>

            <div className={`${workspaceInsetClass} grid gap-2 p-4 text-sm text-slate-600`}>
              <p>Status: <span className="capitalize">{profile?.subscription_status || "trial"}</span></p>
              <p>Trial started: {profile?.trial_started_at ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(profile.trial_started_at)) : "Not set"}</p>
              <p>Trial ends: {profile?.trial_ends_at ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(profile.trial_ends_at)) : "Not set"}</p>
              <p>Monthly price: {pricing.solo.monthlyPriceLabel}</p>
              <p>Annual price: {pricing.solo.annualPriceLabel}</p>
              <p>Annual monthly equivalent: {pricing.solo.annualMonthlyEquivalentLabel}</p>
              <p>No refunds: {profile?.refund_policy || pricing.refundPolicy}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={workspaceCardClass}>
          <CardHeader>
            <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em]">Security</CardTitle>
            <CardDescription>Change the current password or send yourself a reset link.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={changePassword} className="space-y-3">
              <Input name="password" placeholder="New password" type="password" />
              <Input name="confirmPassword" placeholder="Confirm new password" type="password" />
              <Button type="submit">Change password</Button>
            </form>

            <form action={sendPasswordResetLink}>
              <Button type="submit" variant="outline">
                Send password reset email
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className={workspaceCardClass}>
          <CardHeader>
            <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em]">Transactional emails</CardTitle>
            <CardDescription>Stored welcome and system emails linked to this user.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {emails && emails.length > 0 ? (
              emails.map((email) => (
                <div key={email.id} className={`${workspaceInsetClass} p-4 text-sm text-slate-600`}>
                  <p className="font-medium text-slate-800">{email.subject}</p>
                  <p className="mt-1 capitalize">Type: {email.email_type} · Status: {email.status}</p>
                  <p className="mt-1">To: {email.recipient_email}</p>
                  <p className="mt-1">
                    Created: {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(email.created_at))}
                  </p>
                </div>
              ))
            ) : (
              <div className={`${workspaceInsetClass} p-4 text-sm text-slate-500`}>
                No transactional emails stored yet.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
