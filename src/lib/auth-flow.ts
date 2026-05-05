import { createClient } from "@/lib/supabase/server";
import { isSessionUserConfirmed, syncConfirmedEmailToProfile } from "@/lib/auth-state";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function getPostSignInPath(supabase: SupabaseServerClient, userId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isSessionUserConfirmed(user)) {
    await syncConfirmedEmailToProfile(supabase, user);
    return "/dashboard";
  }

  const { data: profile } = await supabase
    .from("users")
    .select("email_confirmed_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.email_confirmed_at) {
    return "/welcome";
  }

  return "/dashboard";
}
