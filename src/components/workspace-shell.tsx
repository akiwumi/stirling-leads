"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, HelpCircle, LayoutGrid, LogOut, Mail, Search, Sparkles, UserCircle2 } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { workspaceRootStyle } from "@/components/workspace-theme";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: <LayoutGrid className="h-[1.15rem] w-[1.15rem]" /> },
  { href: "/dashboard/directory", label: "Directory", icon: <BookOpen className="h-[1.15rem] w-[1.15rem]" /> },
  { href: "/dashboard/analytics", label: "Analytics", icon: <BarChart3 className="h-[1.15rem] w-[1.15rem]" /> },
  { href: "/dashboard/outreach", label: "Outreach", icon: <Mail className="h-[1.15rem] w-[1.15rem]" /> },
  { href: "/dashboard/help", label: "Help", icon: <HelpCircle className="h-[1.15rem] w-[1.15rem]" /> },
];

export function WorkspaceShell({
  children,
  signOutAction,
}: {
  children: React.ReactNode;
  signOutAction: (formData: FormData) => Promise<void>;
}) {
  const pathname = usePathname();

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(245,216,255,0.35),transparent_22%),radial-gradient(circle_at_72%_100%,rgba(255,224,193,0.35),transparent_24%),linear-gradient(180deg,#f5f3ef_0%,#f2f0ea_100%)] px-[100px] py-4 lg:py-6"
      style={workspaceRootStyle}
    >
      <div className="mx-auto max-w-[1600px] rounded-[3rem] border border-[#e8e2d8] bg-[rgba(250,249,246,0.96)] p-4 shadow-[0_20px_80px_rgba(52,41,28,0.05)] backdrop-blur-xl lg:p-6">
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <div className="flex justify-start">
              <BrandMark />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              {navItems.map((item) => {
                const active =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : item.href === "/dashboard/directory"
                    ? pathname === "/dashboard/directory" || pathname.startsWith("/dashboard/companies") || pathname.startsWith("/dashboard/search")
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    className={
                      active
                        ? "inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-red-500 bg-[rgba(255,255,255,0.92)] text-slate-700"
                        : "inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#e7e1d8] bg-[rgba(255,255,255,0.92)] text-slate-700 transition hover:border-[#d9d1c5] hover:bg-white"
                    }
                    href={item.href}
                    key={item.href + item.label}
                    title={item.label}
                  >
                    {item.icon}
                    <span className="sr-only">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3">
              <div className="hidden h-14 min-w-[220px] items-center gap-3 rounded-full border border-[#e7e1d8] bg-[rgba(255,255,255,0.92)] px-5 text-slate-400 lg:flex">
                <Search className="h-5 w-5" />
                <span className="text-base">Search</span>
              </div>
              <form action={signOutAction}>
                <button className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#e7e1d8] bg-white text-slate-700 transition hover:bg-slate-50" type="submit">
                  <LogOut className="h-4 w-4" />
                  <span className="sr-only">Log out</span>
                </button>
              </form>
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#5f87ff,#2c46c7)] text-white shadow-[0_10px_24px_rgba(44,70,199,0.2)]">
                <UserCircle2 className="h-8 w-8" />
                <span className="absolute -right-1 -top-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#ff2d66] px-1.5 text-[11px] font-semibold text-white">
                  12
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
