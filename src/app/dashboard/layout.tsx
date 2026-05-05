import { redirect } from "next/navigation";

import { getPostSignInPath } from "@/lib/auth-flow";
import { createClient } from "@/lib/supabase/server";

import { signOut } from "./actions";
import { WorkspaceShell } from "@/components/workspace-shell";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const nextPath = await getPostSignInPath(supabase, user.id);

  if (nextPath !== "/dashboard") {
    redirect(nextPath);
  }

  return <WorkspaceShell signOutAction={signOut}>{children}</WorkspaceShell>;
}
