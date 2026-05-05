import Link from "next/link";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="group inline-flex items-center gap-3" href="/">
      <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-[1.1rem] bg-[linear-gradient(135deg,#00c2ff_0%,#3a5cff_42%,#7b2dff_72%,#ff6f61_100%)] shadow-[0_10px_22px_rgba(72,78,169,0.16)]">
        <div className="absolute inset-[8px] rounded-[0.9rem] bg-white/18" />
        <span className="relative text-lg font-semibold tracking-[-0.08em] text-white">S</span>
      </div>
      <div className={compact ? "hidden sm:block" : ""}>
        <p className="font-[family:var(--font-display)] text-[2rem] font-semibold leading-none tracking-[-0.06em] text-[#17181c]">Stirling</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-slate-400">Lead workspace</p>
      </div>
    </Link>
  );
}
