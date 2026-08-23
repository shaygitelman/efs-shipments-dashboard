"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutGrid, Inbox, Anchor, Radar } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { ThemeToggle } from "@/components/theme-toggle";
import { DemoReset } from "@/components/demo-reset";

export function TopNav() {
  const pathname = usePathname();
  const emails = useAppStore((s) => s.emails);
  const shipments = useAppStore((s) => s.shipments);
  const unprocessed = emails.filter((e) => !e.applied).length;

  const links = [
    { href: "/", label: "תמונת מצב", icon: LayoutGrid },
    { href: "/inbox", label: "עדכונים נכנסים", icon: Inbox, badge: unprocessed },
  ];

  return (
    <header className="sticky top-0 z-30">
      <div className="relative border-b border-header-border bg-gradient-to-l from-header-from via-header-via to-header-to shadow-[0_1px_0_0_color-mix(in_oklab,var(--cyan)_10%,transparent),0_8px_20px_-16px_rgba(0,0,0,0.5)]">
        <div className="relative mx-auto flex h-16 max-w-[1400px] items-center gap-8 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="relative flex size-10 items-center justify-center rounded-xl bg-header-foreground/8 text-sm font-bold tracking-tight text-header-foreground ring-1 ring-header-border">
              <Anchor className="absolute size-4 opacity-20" />
              <span className="relative">EFS</span>
            </span>
            <span className="hidden flex-col sm:flex">
              <span className="text-[15px] font-semibold leading-tight tracking-tight text-header-foreground">מרכז מעקב משלוחים</span>
              <span className="text-[11px] leading-tight tracking-wide text-header-foreground-muted">EFS LOGISTICS</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {links.map((l) => {
              const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all",
                    active
                      ? "bg-header-foreground/10 text-header-foreground ring-1 ring-cyan/25"
                      : "text-header-foreground-muted hover:bg-header-foreground/6 hover:text-header-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {l.label}
                  {!!l.badge && (
                    <span className="rounded-full bg-cyan px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      {l.badge}
                    </span>
                  )}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[9px] h-0.5 rounded-full bg-cyan shadow-[0_0_6px_0.5px_color-mix(in_oklab,var(--cyan)_45%,transparent)]" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ms-auto flex items-center gap-3">
            <div className="hidden items-center gap-5 lg:flex">
              <div className="flex items-center gap-1.5 text-xs text-header-foreground-muted">
                <Radar className="size-3.5 text-cyan/70" />
                <span className="tracking-wide">{shipments.length} משלוחים במעקב</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-header-foreground/6 px-2.5 py-1 ring-1 ring-header-border">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                </span>
                <span className="text-[11px] font-medium tracking-wide text-header-foreground-muted">מערכת פעילה</span>
              </div>
            </div>
            {/* Demo-only utility, deliberately quiet and separated from the
                operational indicators above — not a feature Sarit uses. */}
            <DemoReset className="hidden sm:flex" />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
