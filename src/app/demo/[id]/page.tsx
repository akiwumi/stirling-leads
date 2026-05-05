import Image from "next/image";
import { notFound } from "next/navigation";

import { workspaceCardClass, workspaceInsetClass, workspaceRootStyle } from "@/components/workspace-theme";
import { createClient } from "@/lib/supabase/server";

export default async function DemoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: demo } = await supabase.from("qr_demos").select("*").eq("id", id).maybeSingle();

  if (!demo) {
    notFound();
  }

  const config = (demo.landing_page_config ?? {}) as {
    eyebrow?: string;
    headline?: string;
    body?: string;
    primaryLabel?: string;
    primaryUrl?: string;
    secondaryLabel?: string;
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-[100px] py-12" style={workspaceRootStyle}>
      <section className={`w-full max-w-3xl p-8 backdrop-blur-sm ${workspaceCardClass}`}>
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted-foreground)]">{config.eyebrow || "Demo QR campaign"}</p>
        <h1 className="mt-4 max-w-2xl font-[family:var(--font-display)] text-4xl tracking-[-0.05em] text-slate-800 leading-tight">{config.headline || demo.title || "Dynamic QR demo"}</h1>
        <p className="mt-4 max-w-2xl text-lg text-[var(--muted-foreground)]">
          {config.body || "This demo shows how one QR code can point customers to a live destination that changes over time."}
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className={`${workspaceInsetClass} p-6`}>
            <p className="text-sm font-medium">{config.secondaryLabel || "Flexible destination"}</p>
            <ul className="mt-4 space-y-3 text-sm text-[var(--muted-foreground)]">
              <li>Update the destination without changing the printed code.</li>
              <li>Use one QR for menus, bookings, seasonal offers, or campaign pages.</li>
              <li>Track interest before sending outreach at scale.</li>
            </ul>
            <a
              className="mt-6 inline-flex rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)]"
              href={config.primaryUrl || "#"}
              rel="noreferrer"
              target="_blank"
            >
              {config.primaryLabel || "Preview destination"}
            </a>
          </div>

          <div className={`${workspaceInsetClass} p-6`}>
            <p className="text-sm text-[var(--muted-foreground)]">QR preview</p>
            {demo.qr_code_url ? (
              <Image
                alt="Demo QR code"
                className="mt-4 aspect-square w-full rounded-2xl border bg-white p-3"
                height={320}
                src={demo.qr_code_url}
                unoptimized
                width={320}
              />
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
