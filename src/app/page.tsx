import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/landing-page";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <LandingPage error={params.error} isLoggedIn={Boolean(user)} />;
}
