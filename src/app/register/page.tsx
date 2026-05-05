import Link from "next/link";
import { redirect } from "next/navigation";

import { register } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getPostSignInPath } from "@/lib/auth-flow";
import { getPricingSummary } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

const errorMessages: Record<string, string> = {
  missing_fields: "Fill in every field before creating the account.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ check_email?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const nextPath = await getPostSignInPath(supabase, user.id);
    redirect(nextPath);
  }

  const pricing = getPricingSummary();
  const errorMessage = params.error ? errorMessages[params.error] || decodeURIComponent(params.error) : null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f3ef_0%,#f2f0ea_100%)] px-4 py-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-[#ece7de] bg-white/90 p-8 shadow-[0_24px_80px_rgba(32,24,16,0.06)]">
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Create account</p>
          <h1 className="mt-3 font-[family:var(--font-display)] text-4xl font-semibold tracking-[-0.06em] text-slate-900">
            Start your {pricing.trialDays}-day trial
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600">
            Full feature access on every subscription model. Verify your email, enter the welcome page, then open the dashboard.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Card className="rounded-[1.5rem] border-[#ece7de] bg-[#fbfaf7]">
              <CardHeader>
                <CardTitle>Solo</CardTitle>
                <CardDescription>{pricing.solo.monthlyPriceLabel} per month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-600">
                <p>Core search, people, CRM sync, refresh, and export workflow.</p>
                <p>{pricing.trialDays}-day free trial included.</p>
              </CardContent>
            </Card>
            <Card className="rounded-[1.5rem] border-[#ece7de] bg-[#fbfaf7]">
              <CardHeader>
                <CardTitle>Team</CardTitle>
                <CardDescription>{pricing.team.monthlyPriceLabel} per month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-600">
                <p>Up to 3 seats with shared workspace and higher workflow limits.</p>
                <p>Annual option: {pricing.team.annualPriceLabel} per year.</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
            {pricing.refundPolicy}
          </div>
        </section>

        <Card className="rounded-[2rem] border-[#ece7de] bg-white/95 p-2 shadow-[0_24px_80px_rgba(32,24,16,0.06)]">
          <CardHeader>
            <CardTitle className="font-[family:var(--font-display)] text-3xl tracking-[-0.05em]">Register</CardTitle>
            <CardDescription>Create your workspace and send the verification email.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {params.check_email === "1" ? (
              <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                Verification email sent. Open it, confirm your address, then continue to the welcome page.
              </div>
            ) : null}
            {errorMessage ? (
              <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <form action={register} className="space-y-3">
              <Input name="fullName" placeholder="Full name" required />
              <Input name="companyName" placeholder="Company name" required />
              <Input name="email" placeholder="you@company.com" required type="email" />
              <Input name="password" placeholder="Create a password" required type="password" />
              <Button className="w-full" type="submit">
                Create account
              </Button>
            </form>

            <p className="text-sm text-slate-500">
              Already registered? <Link className="font-medium text-slate-800 underline-offset-4 hover:underline" href="/login">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
