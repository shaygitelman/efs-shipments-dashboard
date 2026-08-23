import { Shipment } from "@/lib/types";
import { needsAttention, isInTransit, isArrivingThisWeek, isDelayed } from "@/lib/rules";
import { Ship, Clock3, AlertTriangle, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiBandProps {
  shipments: Shipment[];
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}

const toneRing: Record<string, string> = {
  neutral: "group-hover:ring-cyan/20",
  warning: "group-hover:ring-warning/20",
  destructive: "group-hover:ring-destructive/20",
  attention: "group-hover:ring-attention/20",
};

const toneGlow: Record<string, string> = {
  neutral: "glow-ring",
  warning: "glow-warning",
  destructive: "glow-destructive",
  attention: "glow-attention",
};

export function KpiBand({ shipments, activeFilter, onFilterChange }: KpiBandProps) {
  // These are the exact same predicates the table filters use (lib/rules.ts)
  // — clicking a card must always show precisely this many rows.
  const inTransit = shipments.filter((s) => isInTransit(s));
  const arrivingThisWeek = shipments.filter((s) => isArrivingThisWeek(s));
  const delayed = shipments.filter((s) => isDelayed(s));
  const attention = shipments.filter((s) => needsAttention(s));

  // Ordered to match how a reviewer should scan the page: what needs a
  // decision first, then what's actively wrong, then what's upcoming, then
  // the routine baseline — mirroring "מה דורש טיפול / מה באיחור / מה בדרך".
  const cards = [
    { key: "attention", label: "דורשים טיפול", value: attention.length, icon: ListChecks, tone: "attention" as const },
    { key: "delayed", label: "באיחור", value: delayed.length, icon: AlertTriangle, tone: "destructive" as const },
    { key: "arriving-soon", label: "מגיעים השבוע", value: arrivingThisWeek.length, icon: Clock3, tone: "warning" as const },
    { key: "in-transit", label: "משלוחים בדרך", value: inTransit.length, icon: Ship, tone: "neutral" as const },
  ];

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        const active = activeFilter === c.key;
        const emphasize = c.key === "attention" && c.value > 0;
        return (
          <button
            key={c.key}
            onClick={() => onFilterChange(active ? null : c.key)}
            className={cn(
              // Same neutral surface for all four cards — "דורשים טיפול"
              // used to get its own orange-tinted background/border here,
              // which made it read as a different component family from
              // the other three. The semantic orange now comes through
              // only via the top hairline, icon, and number below.
              "group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card/90 p-4.5 text-start backdrop-blur-sm transition-all duration-200 ease-out sm:p-5",
              active
                ? cn("border-transparent", toneGlow[c.tone])
                : cn("hover:-translate-y-1 hover:ring-1", toneRing[c.tone])
            )}
          >
            {/* Top accent hairline — the "control widget" signature, colored
                per tone, brighter when this card is the active filter. */}
            <span
              className={cn(
                "absolute inset-x-0 top-0 h-[3px] transition-opacity",
                c.tone === "destructive" && "bg-destructive",
                c.tone === "warning" && "bg-warning",
                c.tone === "attention" && "bg-attention",
                c.tone === "neutral" && "bg-cyan",
                active ? "opacity-100" : "opacity-40 group-hover:opacity-80"
              )}
            />
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-muted-foreground">{c.label}</span>
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110",
                  c.tone === "destructive" && "bg-destructive/10 text-destructive",
                  c.tone === "warning" && "bg-warning/15 text-warning-foreground",
                  c.tone === "attention" && (emphasize ? "bg-attention/15 text-attention-foreground" : "bg-muted text-muted-foreground"),
                  c.tone === "neutral" && "bg-cyan/10 text-cyan"
                )}
              >
                <Icon className="size-4" />
              </span>
            </div>
            <span
              className={cn(
                "text-[2.25rem] leading-none font-extrabold tabular-nums text-foreground",
                emphasize && "text-attention-foreground"
              )}
            >
              {c.value}
            </span>
          </button>
        );
      })}
    </div>
  );
}
