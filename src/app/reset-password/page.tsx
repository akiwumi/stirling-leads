import Link from "next/link";

import { completePasswordReset, requestPasswordReset } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const errorMessages: Record<string, string> = {
  missing_email: "Enter your email to receive the reset link.",
  missing_password: "Enter and confirm the new password.",
  password_mismatch: "The passwords do not match.",
  invalid_confirmation_link: "This reset link is invalid or expired.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] || decodeURIComponent(params.error) : null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f3ef_0%,#f2f0ea_100%)] px-4 py-10">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
        <Card className="rounded-[2rem] border-[#ece7de] bg-white/95">
          <CardHeader>
            <CardTitle className="font-[family:var(--font-display)] text-3xl tracking-[-0.05em]">Reset password</CardTitle>
            <CardDescription>Send yourself a recovery email.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {params.sent === "1" ? (
              <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                Recovery email sent. Open the link in your inbox to set a new password.
              </div>
            ) : null}
            {errorMessage ? (
              <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}
            <form action={requestPasswordReset} className="space-y-3">
              <Input name="email" placeholder="you@company.com" required type="email" />
              <Button className="w-full" type="submit">
                Send reset email
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-[#ece7de] bg-white/95">
          <CardHeader>
            <CardTitle className="font-[family:var(--font-display)] text-3xl tracking-[-0.05em]">Set a new password</CardTitle>
            <CardDescription>Use this after opening the recovery link.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={completePasswordReset} className="space-y-3">
              <Input name="password" placeholder="New password" required type="password" />
              <Input name="confirmPassword" placeholder="Confirm new password" required type="password" />
              <Button className="w-full" type="submit">
                Save new password
              </Button>
            </form>
            <p className="text-sm text-slate-500">
              Back to <Link className="font-medium text-slate-800 underline-offset-4 hover:underline" href="/login">sign in</Link>.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
