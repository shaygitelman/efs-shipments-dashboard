"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { isActiveShipment, isArrived } from "@/lib/rules";
import { KpiBand } from "@/components/kpi-band";
import { NeedsAttention } from "@/components/needs-attention";
import { ShipmentsTable } from "@/components/shipments-table";
import { Ltr } from "@/components/ltr";
import { PageOceanBackground } from "@/components/page-ocean-background";
import { Ship, Landmark } from "lucide-react";

export default function DashboardPage() {
  const shipments = useAppStore((s) => s.shipments);
  const [filter, setFilter] = useState<string | null>(null);

  // Every count here is its own independent filter() over the exact same
  // shared predicates the KPI cards and table filters use (lib/rules.ts) —
  // never derived by subtracting one from another — so "15 total" can never
  // silently drift out of sync with "14 active" + "1 arrived".
  const readout = useMemo(() => {
    const active = shipments.filter(isActiveShipment);
    const arrived = shipments.filter(isArrived);
    const ports = new Set(active.map((s) => s.destinationPort));
    return { total: shipments.length, activeCount: active.length, arrivedCount: arrived.length, ports: ports.size };
  }, [shipments]);

  return (
    <div className="flex flex-col gap-7">
      {/* The cargo-ship photo now lives once, fixed behind the entire page
          (see PageOceanBackground) — not duplicated inside the hero. The
          hero itself is just a content layer, translucent + blurred enough
          to read as "floating" above the photo rather than a solid card
          pasted over it. */}
      <PageOceanBackground positionClassName="bg-[position:32%_38%]" />

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/85 p-6 shadow-soft backdrop-blur-md sm:p-7">
        <div className="relative flex flex-col gap-5">
          <div>
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-cyan/20 bg-cyan/[0.06] px-2.5 py-1 text-[11px] font-medium tracking-wide text-cyan">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan opacity-30" />
                <span className="relative inline-flex size-1.5 rounded-full bg-cyan" />
              </span>
              תמונת מצב חיה
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-gradient-brand sm:text-[2.15rem]">
              מעקב משלוחים והזמנות בדרך
            </h1>
            <p className="mt-2 max-w-xl text-sm font-medium text-foreground/80">
              כל הזמנות הרכש והמשלוחים שבדרך, במקום אחד.
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">מידע מאוחד מ-Priority, מיילים, Monday וחברות הספנות</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Ship className="size-3.5 text-cyan/70" />
              <span>
                <span className="font-semibold text-foreground"><Ltr>{readout.total}</Ltr></span> הזמנות במעקב ·{" "}
                <span className="font-semibold text-foreground"><Ltr>{readout.activeCount}</Ltr></span>{" "}
                {readout.activeCount === 1 ? "פעילה" : "פעילות"} ·{" "}
                <span className="font-semibold text-foreground"><Ltr>{readout.arrivedCount}</Ltr></span>{" "}
                {readout.arrivedCount === 1 ? "הגיעה" : "הגיעו"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Landmark className="size-3.5 text-teal/70" />
              <span className="font-semibold text-foreground"><Ltr>{readout.ports}</Ltr></span>
              נמלי יעד
            </div>
          </div>
        </div>
      </div>

      <KpiBand shipments={shipments} activeFilter={filter} onFilterChange={setFilter} />

      <NeedsAttention shipments={shipments} />

      <ShipmentsTable shipments={shipments} filter={filter} onFilterChange={setFilter} />
    </div>
  );
}
