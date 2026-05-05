import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function getPostSignInPath(supabase: SupabaseServerClient, userId: string) {
  const { data: profile } = await supabase
    .from("users")
    .select("email_confirmed_at, terms_accepted_at, welcome_email_sent_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.email_confirmed_at || !profile.terms_accepted_at || !profile.welcome_email_sent_at) {
    return "/welcome";
  }

  return "/dashboard";
}
