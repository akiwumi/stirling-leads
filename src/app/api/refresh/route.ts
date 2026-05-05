import { NextRequest, NextResponse } from "next/server";

import { runBatchRefresh } from "@/lib/directory-refresh";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // Verify cron secret when called from a scheduler
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchSize = Number(new URL(req.url).searchParams.get("batchSize") ?? "10");
  const result = await runBatchRefresh(supabase, user.id, Math.min(batchSize, 25));

  return NextResponse.json(result);
}
