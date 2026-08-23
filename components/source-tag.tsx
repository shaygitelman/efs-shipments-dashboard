import { SourceSystem } from "@/lib/types";
import { Database, Mail, LayoutGrid, Ship, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Raw Tailwind palette hues (not theme tokens) — five source systems need
// five visually distinct colors, which a single semantic token can't give.
// Each pair is calibrated per theme: dark text on a light tint for light
// mode, light text on a dark tint for dark mode.
const sourceMeta: Record<SourceSystem, { icon: React.ElementType; label: string; className: string }> = {
  priority: { icon: Database, label: "Priority", className: "text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-500/15" },
  email: { icon: Mail, label: "מייל", className: "text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-500/15" },
  monday: { icon: LayoutGrid, label: "Monday", className: "text-purple-700 bg-purple-50 dark:text-purple-300 dark:bg-purple-500/15" },
  carrier: { icon: Ship, label: "חברת ספנות", className: "text-teal-700 bg-teal-50 dark:text-teal-300 dark:bg-teal-500/15" },
  ai: { icon: Sparkles, label: "AI", className: "text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/15" },
};

export function SourceTag({ source, label, className }: { source: SourceSystem; label?: string; className?: string }) {
  const meta = sourceMeta[source];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
        meta.className,
        className
      )}
    >
      <Icon className="size-3" />
      {label ?? meta.label}
    </span>
  );
}
