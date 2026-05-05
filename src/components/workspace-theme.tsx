import { cn } from "@/lib/utils";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const workspaceRootStyle = {
  ["--font-display" as string]: '"Avenir Next", "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif',
  ["--font-body" as string]: '"Avenir Next", "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif',
  ["--background" as string]: "#f5f3ef",
  ["--foreground" as string]: "#17181c",
  ["--card" as string]: "rgba(255,255,255,0.96)",
  ["--card-foreground" as string]: "#17181c",
  ["--border" as string]: "#ece7de",
  ["--input" as string]: "#fcfbf8",
  ["--muted" as string]: "#f6f3ee",
  ["--muted-foreground" as string]: "#8f918f",
  ["--primary" as string]: "#1d1f24",
  ["--primary-foreground" as string]: "#ffffff",
  ["--ring" as string]: "rgba(47,91,234,0.2)",
};

export const workspaceCardClass =
  "rounded-[2rem] border border-[#ece7de] bg-white/96 shadow-[0_18px_50px_rgba(30,25,20,0.045)] backdrop-blur-sm";
export const workspaceInsetClass =
  "rounded-[1.75rem] border border-[#efe9e1] bg-[linear-gradient(180deg,rgba(255,255,255,0.985),rgba(249,247,243,0.95))] shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]";
export const workspaceSoftInsetClass =
  "rounded-[1.75rem] border border-[#efe9e1] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(251,250,247,0.96))]";
export const workspaceSelectClass =
  "flex h-11 w-full rounded-[1rem] border border-[#ece7de] bg-[#fcfbf8] px-3 py-2 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-[#2f5bea]/20";

const heroTones = {
  lavender: "bg-[linear-gradient(135deg,rgba(255,251,247,0.98),rgba(250,247,255,0.97)_52%,rgba(244,250,247,0.98))]",
  apricot: "bg-[linear-gradient(135deg,rgba(255,250,245,0.98),rgba(250,248,255,0.97)_52%,rgba(245,250,255,0.98))]",
  pearl: "bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,248,246,0.96))]",
} as const;

export function WorkspaceHero({
  eyebrow,
  title,
  description,
  actions,
  tone = "pearl",
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  tone?: keyof typeof heroTones;
}) {
  return (
    <section className={cn("rounded-[2.25rem] border border-[#ece7de] p-7 shadow-[0_20px_60px_rgba(32,24,16,0.05)]", heroTones[tone])}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">{eyebrow}</p>
          <h1 className="mt-3 font-[family:var(--font-display)] text-4xl font-semibold tracking-[-0.06em] text-slate-900">{title}</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-500">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}

export function WorkspaceMetricCard({
  icon,
  title,
  value,
}: {
  icon?: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <Card className={workspaceCardClass}>
      <CardHeader>
        <div className="flex items-center gap-2 text-slate-400">
          {icon}
          <CardDescription className="text-slate-400">{title}</CardDescription>
        </div>
        <CardTitle className="font-[family:var(--font-display)] text-4xl font-semibold tracking-[-0.06em] text-slate-900">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export function WorkspacePill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn("rounded-full border border-[#ede7de] bg-[#fcfbf8] px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-500", className)}>{children}</span>;
}

export function WorkspaceBanner({
  text,
  tone,
}: {
  text: string;
  tone: "error" | "success";
}) {
  return (
    <div
      className={
        tone === "error"
          ? "rounded-[1.5rem] border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700"
          : "rounded-[1.5rem] border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-800"
      }
    >
      {text}
    </div>
  );
}

export function WorkspaceEmptyState({ text }: { text: string }) {
  return <div className="rounded-[1.75rem] border border-dashed border-[#ebe5dc] bg-[#fbfaf7] p-5 text-sm text-slate-500">{text}</div>;
}
