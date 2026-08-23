"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Shipment } from "@/lib/types";
import {
  needsAttention,
  delayDays,
  shortRequiredAction,
  isInTransit,
  isArrivingThisWeek,
  isDelayed,
  isArrived,
} from "@/lib/rules";
import { formatDate, relativeToToday } from "@/lib/dates";
import { findProductMatch } from "@/lib/product-search";
import { poTotal, formatCurrency } from "@/lib/finance";
import { communicationStatus } from "@/lib/communication-agent";
import { LifecycleBadge } from "./status-badge";
import { CommunicationBadge } from "./communication/communication-badge";
import { ProductSummary } from "./product-summary";
import { ShipmentQuickView } from "./shipment-quick-view";
import { Ltr } from "./ltr";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

// "attention" and "arriving-soon" are no longer offered as filter-bar pills
// (the dedicated "דורש טיפול" section above the table now owns that job —
// see NeedsAttention, which filters independently of this component's
// state), but both values remain valid here because the KPI cards above
// still set them directly when clicked. Removing the cases would silently
// break "every clickable KPI shows exactly its displayed count".
type FilterKey = "all" | "in-transit" | "arriving-soon" | "delayed" | "attention" | "arrived";
type SortKey = "urgent" | "eta" | "recent";

// Pared down to pure lifecycle/status navigation, per the dashboard's
// division of labor: urgency lives in the KPI cards + Needs Attention above;
// these four pills are just "where is it in its journey".
const filterOptions: { key: FilterKey; label: string }[] = [
  { key: "all", label: "הכול" },
  { key: "delayed", label: "באיחור" },
  { key: "in-transit", label: "בדרך" },
  { key: "arrived", label: "הגיעו" },
];

export function ShipmentsTable({
  shipments,
  filter,
  onFilterChange,
}: {
  shipments: Shipment[];
  filter: string | null;
  onFilterChange: (f: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("urgent");
  const [quickViewId, setQuickViewId] = useState<string | null>(null);

  const normalizedFilter: FilterKey = (filter as FilterKey) ?? "all";

  const filtered = useMemo(() => {
    let list = shipments;

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.poNumber.toLowerCase().includes(q) ||
          s.supplier.toLowerCase().includes(q) ||
          (s.containerNumber?.value.toLowerCase().includes(q) ?? false) ||
          s.products.some((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      );
    }

    // Every case here calls the exact same predicate the matching KPI card
    // uses (lib/rules.ts) — this is what keeps the displayed KPI count and
    // the filtered row count identical when a card is clicked.
    switch (normalizedFilter) {
      case "in-transit":
        list = list.filter((s) => isInTransit(s));
        break;
      case "arriving-soon":
        list = list.filter((s) => isArrivingThisWeek(s));
        break;
      case "delayed":
        list = list.filter((s) => isDelayed(s));
        break;
      case "attention":
        list = list.filter((s) => needsAttention(s));
        break;
      case "arrived":
        list = list.filter((s) => isArrived(s));
        break;
    }

    const sorted = [...list].sort((a, b) => {
      if (sort === "eta") {
        const ea = a.currentEta?.value ?? "9999";
        const eb = b.currentEta?.value ?? "9999";
        return ea.localeCompare(eb);
      }
      if (sort === "recent") {
        return b.lastUpdate.localeCompare(a.lastUpdate);
      }
      // urgent: needs-attention + delay days first
      const aAttn = needsAttention(a) ? 1 : 0;
      const bAttn = needsAttention(b) ? 1 : 0;
      if (aAttn !== bAttn) return bAttn - aAttn;
      return delayDays(b) - delayDays(a);
    });

    return sorted;
  }, [shipments, query, normalizedFilter, sort]);

  const productMatch = useMemo(() => findProductMatch(shipments, query), [shipments, query]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/90 backdrop-blur-sm">
      <div className="flex flex-col gap-3 border-b border-border bg-surface/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onFilterChange(opt.key === "all" ? null : opt.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                normalizedFilter === opt.key
                  ? "border-transparent bg-cyan text-white shadow-[0_0_9px_-3px_var(--cyan)]"
                  : "border-border bg-transparent text-muted-foreground hover:border-cyan/25 hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש לפי מוצר, ספק או PO — למשל: Ceramic Fire Protection Wrap"
              className="h-8 w-80 ps-8 text-sm"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger size="sm" className="h-8 text-xs w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgent">הדחופים ביותר</SelectItem>
              <SelectItem value="eta">לפי ETA</SelectItem>
              <SelectItem value="recent">עדכון אחרון</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {productMatch && <ProductSummary match={productMatch} query={query} />}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface/60 text-start text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              <th className="px-4 py-3 font-semibold text-start">סטטוס</th>
              <th className="px-4 py-3 font-semibold text-start">PO</th>
              <th className="px-4 py-3 font-semibold text-start">ספק</th>
              <th className="px-4 py-3 font-semibold text-start">מוצר</th>
              <th className="px-4 py-3 font-semibold text-start">שווי הזמנה</th>
              <th className="px-4 py-3 font-semibold text-start">ETA</th>
              <th className="px-4 py-3 font-semibold text-start">איחור</th>
              <th className="px-4 py-3 font-semibold text-start">תקשורת</th>
              <th className="px-4 py-3 font-semibold text-start">פעולה נדרשת</th>
              <th className="px-4 py-3 font-semibold text-start">עדכון אחרון</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const delay = delayDays(s);
              const attn = needsAttention(s);
              return (
                <tr
                  key={s.id}
                  className={cn(
                    "group relative border-b border-border/70 transition-colors last:border-0 hover:bg-cyan/[0.04]",
                    attn && "bg-destructive/[0.025]"
                  )}
                >
                  <td className="px-4 py-3.5">
                    <LifecycleBadge shipment={s} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setQuickViewId(s.id)}
                        className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-cyan group-hover:opacity-100 focus:opacity-100"
                        title="צפייה מהירה"
                      >
                        <Eye className="size-3.5" />
                      </button>
                      <Link href={`/shipments/${s.id}`} className="font-semibold text-cyan transition-colors hover:text-foreground hover:underline">
                        <Ltr>{s.poNumber}</Ltr>
                      </Link>
                    </div>
                  </td>
                  <td dir="ltr" className="px-4 py-3.5 text-start text-muted-foreground">{s.supplier}</td>
                  <td
                    dir="ltr"
                    className="px-4 py-3.5 max-w-[220px] truncate text-start"
                    title={s.products.map((p) => p.name).join(", ")}
                  >
                    {s.products.map((p) => p.name).join(", ")}
                    {s.products.length > 1 && (
                      <span dir="rtl" className="text-xs text-muted-foreground">
                        {" "}
                        ({s.products.length} פריטים)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground tabular-nums">
                    <Ltr>{formatCurrency(poTotal(s), s.currency)}</Ltr>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {s.currentEta ? (
                      isArrived(s) ? (
                        <span className="text-success-foreground">
                          הגיע ב-<Ltr>{formatDate(s.currentEta.value, true)}</Ltr>
                        </span>
                      ) : (
                        <Ltr>
                          {formatDate(s.currentEta.value, true)}{" "}
                          <span className="text-xs text-muted-foreground">({relativeToToday(s.currentEta.value)})</span>
                        </Ltr>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {delay > 0 ? (
                      <Ltr className="font-semibold text-destructive">+{delay}</Ltr>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <CommunicationBadge status={communicationStatus(s)} />
                  </td>
                  <td className={cn("px-4 py-3.5 max-w-[200px] truncate", attn ? "font-medium text-foreground" : "text-muted-foreground")}>
                    {shortRequiredAction(s)}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                    {relativeToToday(s.lastUpdate)}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  אין משלוחים התואמים לתצוגה זו.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ShipmentQuickView
        shipment={shipments.find((s) => s.id === quickViewId) ?? null}
        open={!!quickViewId}
        onOpenChange={(open) => !open && setQuickViewId(null)}
      />
    </div>
  );
}
