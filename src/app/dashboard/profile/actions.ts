"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function updateProfile(formData: FormData) {
  const { supabase, user } = await requireUser();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();

  await supabase
    .from("users")
    .update({
      full_name: fullName || null,
      company_name: companyName || null,
    })
    .eq("id", user.id);

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  redirect("/dashboard/profile?saved=profile");
}

export async function updateBillingPreferences(formData: FormData) {
  const { supabase, user } = await requireUser();
  const billingCycle = String(formData.get("billingCycle") ?? "monthly");

  if (!["monthly", "annual"].includes(billingCycle)) {
    redirect("/dashboard/profile?error=invalid_billing_cycle");
  }

  await supabase
    .from("users")
    .update({
      billing_cycle: billingCycle,
    })
    .eq("id", user.id);

  revalidatePath("/dashboard/profile");
  redirect("/dashboard/profile?saved=billing");
}

export async function changePassword(formData: FormData) {
  const { supabase } = await requireUser();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!password || !confirmPassword) {
    redirect("/dashboard/profile?error=missing_password");
  }

  if (password !== confirmPassword) {
    redirect("/dashboard/profile?error=password_mismatch");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/dashboard/profile?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard/profile?saved=password");
}

export async function sendPasswordResetLink() {
  const { supabase, user } = await requireUser();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const email = user.email;

  if (!email) {
    redirect("/dashboard/profile?error=missing_email");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/confirm?next=/reset-password`,
  });

  if (error) {
    redirect(`/dashboard/profile?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard/profile?saved=reset_link");
}
