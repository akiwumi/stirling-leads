import { redirect } from "next/navigation";

import { ContactPageContent } from "@/components/contact-page-content";
import { createClient } from "@/lib/supabase/server";

import { submitSupportRequest } from "../actions";

export default async function DashboardContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, company_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-4">
      {params.sent ? (
        <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Request sent. Stirling will follow up by email.
        </div>
      ) : null}
      {params.error === "missing_fields" ? (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Add both a subject and a message before sending the request.
        </div>
      ) : null}
      <ContactPageContent
        backHref="/dashboard"
        backLabel="Back to dashboard"
        formAction={submitSupportRequest}
        defaultEmail={profile?.email ?? user.email ?? ""}
        defaultName={profile?.full_name ?? ""}
        defaultCompanyName={profile?.company_name ?? ""}
      />
    </div>
  );
}
