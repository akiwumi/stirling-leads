import Link from "next/link";
import { ArrowRight, BarChart3, MailOpen, Sparkles, TrendingUp } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signIn } from "@/app/login/actions";

const errorMessages: Record<string, string> = {
  missing_credentials: "Enter both email and password.",
  invalid_credentials: "Login failed. Check your credentials in Supabase Auth.",
};

export function LandingExperience({
  error,
  isLoggedIn,
}: {
  error?: string;
  isLoggedIn: boolean;
}) {
  const errorMessage = error ? errorMessages[error] : null;

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-6 lg:px-8 lg:py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-12 h-56 w-56 rounded-full bg-pink-200/45 blur-3xl" />
        <div className="absolute right-[10%] top-28 h-72 w-72 rounded-full bg-lilac-200/55 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-mint-200/45 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col rounded-[2rem] border border-white/70 bg-white/55 p-5 shadow-[0_28px_90px_rgba(160,144,190,0.18)] backdrop-blur-xl lg:p-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <BrandMark />
          <div className="flex flex-wrap gap-3">
            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button size="lg">Open workspace</Button>
              </Link>
            ) : (
              <a href="#login">
                <Button size="lg">Jump to login</Button>
              </a>
            )}
          </div>
        </header>

        <section className="mt-10 grid flex-1 gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-4 py-2 text-xs uppercase tracking-[0.28em] text-slate-600">
              <Sparkles className="h-3.5 w-3.5" />
              Lead search, scoring, outreach
            </div>

            <div className="max-w-3xl space-y-5">
              <h1 className="font-[family:var(--font-display)] text-5xl leading-[0.92] tracking-[-0.06em] text-slate-800 sm:text-6xl lg:text-7xl">
                Find the right leads.
                <br />
                Start better conversations.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Stirling helps you find real businesses, spot strong QR-code opportunities, and send outreach with more context.
                The result is a cleaner pipeline, more replies, and a steadier path from first contact to converted lead.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FeatureCard icon={<TrendingUp className="h-4 w-4" />} title="Conversion signals" text="See which business categories reply, book meetings, and move closer to becoming customers." />
              <FeatureCard icon={<BarChart3 className="h-4 w-4" />} title="Focused prospecting" text="Track lead flow by niche so you can spend time on the segments that actually convert." />
              <FeatureCard icon={<MailOpen className="h-4 w-4" />} title="Outreach that lands" text="Keep drafts, replies, and follow-up history in one place so good leads do not go cold." />
            </div>

            <Card className="border-white/70 bg-white/72">
              <CardHeader>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em]">Built to help leads convert</CardTitle>
                <CardDescription>Every step is designed to make outreach more relevant and easier to measure.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <StatPill eyebrow="Search" title="Real business filtering" text="Cut past directories, booking portals, and aggregator pages so your list starts with better-fit prospects." />
                <StatPill eyebrow="Scoring" title="Opportunity visibility" text="Review each company for QR-code gaps and prioritize the leads most likely to see value quickly." />
                <StatPill eyebrow="Outreach" title="Drafts with context" text="Move from site analysis to tailored email drafts without losing the details that make outreach feel relevant." />
                <StatPill eyebrow="Analytics" title="Conversion feedback" text="Track sends, replies, and wins by industry so each campaign teaches you where to focus next." />
              </CardContent>
            </Card>
          </div>

          <div id="login" className="flex items-start lg:justify-end">
            <Card className="w-full max-w-xl border-white/80 bg-white/78">
              <CardHeader>
                <CardTitle className="font-[family:var(--font-display)] text-3xl tracking-[-0.04em]">
                  {isLoggedIn ? "Welcome back" : "Sign in to the workspace"}
                </CardTitle>
                <CardDescription>
                  {isLoggedIn
                    ? "Your session stays active until you choose to log out."
                    : "Sign in to review leads, score opportunities, and manage outreach in one workspace."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {isLoggedIn ? (
                  <div className="space-y-4">
                    <div className="rounded-[1.5rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(245,244,255,0.85))] p-5 text-sm text-slate-600">
                      You are already signed in. Use the button below to go straight to your dashboard and analytics.
                    </div>
                    <Link href="/dashboard">
                      <Button className="w-full" size="lg">
                        Continue to dashboard
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <form action={signIn} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700" htmlFor="email">
                        Email
                      </label>
                      <Input id="email" name="email" placeholder="name@yourcompany.com" required type="email" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700" htmlFor="password">
                        Password
                      </label>
                      <Input id="password" name="password" placeholder="••••••••" required type="password" />
                    </div>
                    {errorMessage ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p> : null}
                    <Button className="w-full" size="lg" type="submit">
                      Enter dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-[1.6rem] border border-white/75 bg-white/70 p-5 shadow-[0_18px_40px_rgba(180,168,198,0.14)]">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ffe1ee_0%,#e9dcff_55%,#dcf5ee_100%)] text-slate-700">
        {icon}
      </div>
      <p className="text-base font-semibold text-slate-800">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function StatPill({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(246,243,255,0.7))] p-4">
      <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">{eyebrow}</p>
      <p className="mt-2 font-semibold text-slate-800">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}
