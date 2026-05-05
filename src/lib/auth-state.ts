import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export function isSessionUserConfirmed(user: { email_confirmed_at?: string | null } | null | undefined) {
  return Boolean(user?.email_confirmed_at);
}

export async function syncConfirmedEmailToProfile(
  supabase: SupabaseServerClient,
  user: { id: string; email_confirmed_at?: string | null } | null | undefined,
) {
  if (!user?.id || !user.email_confirmed_at) {
    return;
  }

  await supabase
    .from("users")
    .update({
      email_confirmed_at: user.email_confirmed_at,
    })
    .eq("id", user.id)
    .is("email_confirmed_at", null);
}
