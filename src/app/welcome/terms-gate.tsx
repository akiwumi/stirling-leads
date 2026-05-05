"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { enterDashboardFromWelcome } from "@/app/welcome/actions";

export function WelcomeTermsGate() {
  const [accepted, setAccepted] = useState(false);

  return (
    <form action={enterDashboardFromWelcome} className="space-y-4">
      <div className="rounded-[1.5rem] border border-[#ece7de] bg-[#fbfaf7] p-4 text-sm leading-7 text-slate-600">
        <label className="flex items-start gap-3">
          <input
            checked={accepted}
            className="mt-1 h-4 w-4 rounded border border-[#d9d1c5]"
            name="acceptTerms"
            onChange={(event) => setAccepted(event.target.checked)}
            type="checkbox"
            value="yes"
          />
          <span>
            I agree to the <Link className="font-medium text-slate-800 underline-offset-4 hover:underline" href="/privacy-policy#terms">Terms and Conditions</Link> and the <Link className="font-medium text-slate-800 underline-offset-4 hover:underline" href="/privacy-policy">Privacy Policy</Link>.
          </span>
        </label>
      </div>

      <Button disabled={!accepted} type="submit">
        Open dashboard
      </Button>
    </form>
  );
}
