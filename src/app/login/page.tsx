import { Lock, QrCode, SearchCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { signIn } from "./actions";

const errorMessages: Record<string, string> = {
  missing_credentials: "Enter both email and password.",
  invalid_credentials: "Login failed. Check your credentials in Supabase Auth.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] : null;

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex flex-col justify-between px-6 py-10 lg:px-12 lg:py-12">
        <div className="flex items-center gap-3 text-sm font-medium text-[var(--muted-foreground)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--primary-foreground)]">
            <QrCode className="h-5 w-5" />
          </div>
          Stirling Lead Finder
        </div>

        <div className="max-w-xl space-y-8">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Phase 1 foundation</p>
            <h1 className="font-serif text-5xl leading-tight text-balance">Find QR-code opportunities before you automate outreach.</h1>
            <p className="max-w-lg text-lg text-[var(--muted-foreground)]">
              Secure login first. Then an empty dashboard with the right data model under it, ready for manual lead entry in Phase 2.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <ValueCard icon={<Lock className="h-4 w-4" />} title="Supabase Auth" text="Email/password access for the internal CRM." />
            <ValueCard icon={<SearchCheck className="h-4 w-4" />} title="RLS-ready schema" text="Ownership boundaries in place before lead data starts flowing." />
            <ValueCard icon={<QrCode className="h-4 w-4" />} title="Dashboard shell" text="A clean base for search, scoring, and campaigns." />
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 lg:px-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use a Supabase Auth user to access the private dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signIn} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="email">
                  Email
                </label>
                <Input id="email" name="email" type="email" autoComplete="email" placeholder="name@stirlingqr.com" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password">
                  Password
                </label>
                <Input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
              </div>
              {errorMessage ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p> : null}
              <Button className="w-full" size="lg" type="submit">
                Enter dashboard
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function ValueCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-3xl border bg-white/70 p-4 backdrop-blur-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--muted)] text-[var(--primary)]">{icon}</div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{text}</p>
    </div>
  );
}
