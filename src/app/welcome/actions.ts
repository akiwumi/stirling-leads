"use server";

import { redirect } from "next/navigation";

import { isSessionUserConfirmed, syncConfirmedEmailToProfile } from "@/lib/auth-state";
import { buildWelcomeEmailContent, sendStoredTransactionalEmail } from "@/lib/transactional-email";
import { createClient } from "@/lib/supabase/server";

export async function enterDashboardFromWelcome(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, email_confirmed_at, welcome_email_sent_at, terms_accepted_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/welcome?error=missing_email");
  }

  const sessionUserConfirmed = isSessionUserConfirmed(user);

  if (sessionUserConfirmed) {
    await syncConfirmedEmailToProfile(supabase, user);
  }

  if (!profile.email_confirmed_at && !sessionUserConfirmed) {
    redirect("/welcome?error=confirm_email_first");
  }

  if (!profile.terms_accepted_at) {
    const accepted = String(formData.get("acceptTerms") ?? "");

    if (accepted !== "yes") {
      redirect("/welcome?error=accept_terms_required");
    }

    await supabase
      .from("users")
      .update({
        terms_accepted_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  }

  if (!profile.welcome_email_sent_at) {
    const recipientEmail = profile.email || user.email;

    if (!recipientEmail) {
      redirect("/welcome?error=missing_email");
    }

    const displayName =
      profile.full_name?.trim() ||
      user.user_metadata.full_name ||
      recipientEmail.split("@")[0];
    const content = buildWelcomeEmailContent(displayName);

    try {
      await sendStoredTransactionalEmail({
        userId: user.id,
        recipientEmail,
        emailType: "welcome",
        subject: content.subject,
        body: content.body,
      });

      await supabase
        .from("users")
        .update({
          welcome_email_sent_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    } catch {
      redirect("/welcome?error=welcome_email_failed");
    }
  }

  redirect("/dashboard?welcome=sent");
}
