"use client";

import Link from "next/link";
import { Shipment } from "@/lib/types";
import { getExceptions, delayDays, needsAttention } from "@/lib/rules";
import { journeyStageLabel } from "@/lib/journey";
import { formatDate } from "@/lib/dates";
import { SeverityDot } from "./status-badge";
import { Ltr } from "./ltr";
import { ChevronLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function NeedsAttention({ shipments }: { shipments: Shipment[] }) {
  // Uses the same shared needsAttention() predicate as the KPI card and the
  // table's "דורש טיפול" filter, so this panel's row count always matches
  // both of those.
  const withExceptions = shipments
    .filter((s) => needsAttention(s))
    .map((s) => ({ shipment: s, exceptions: getExceptions(s) }))
    .sort((a, b) => {
      const rank = (sev: string) => (sev === "high" ? 2 : sev === "medium" ? 1 : 0);
      return rank(b.exceptions[0].severity) - rank(a.exceptions[0].severity);
    });

  if (withExceptions.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-success/20 bg-success/[0.04] px-5 py-6 text-sm text-muted-foreground">
        <span className="flex size-7 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-4" />
        </span>
        אין כרגע דבר שדורש טיפול — כל המשלוחים תקינים.
      </div>
    );
  }

  const severityRowTone: Record<string, string> = {
    high: "border-s-destructive",
    medium: "border-s-attention",
    low: "border-s-info",
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/90 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border bg-gradient-to-l from-transparent via-transparent to-destructive/[0.03] px-5 py-3.5">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
            <span className="flex size-6 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <AlertTriangle className="size-3.5" />
            </span>
            דורש טיפול
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">מדורג לפי דחיפות עסקית</p>
        </div>
        <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive">
          <Ltr>{withExceptions.length}</Ltr>
        </span>
      </div>
      <ul className="divide-y divide-border">
        {withExceptions.map(({ shipment, exceptions }) => {
          const top = exceptions[0];
          const delay = delayDays(shipment);
          return (
            <li key={shipment.id}>
              <Link
                href={`/shipments/${shipment.id}`}
                className={cn(
                  "flex items-center gap-3 border-s-[3px] px-5 py-3 transition-colors hover:bg-secondary/30",
                  severityRowTone[top.severity]
                )}
              >
                <SeverityDot severity={top.severity} pulse={top.severity === "high"} />
                <div className="min-w-0 flex-1 py-0.5">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <Ltr className="text-sm font-semibold text-foreground">{shipment.poNumber}</Ltr>
                    <span className="text-xs text-muted-foreground truncate">
                      · <Ltr>{shipment.supplier}</Ltr> · {journeyStageLabel(shipment)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-xs">
                    <span className={cn(top.severity === "high" ? "font-semibold text-destructive" : "font-medium text-foreground")}>
                      {top.shortMessage}
                    </span>
                    {top.type === "delayed" && shipment.originalEta && shipment.currentEta && (
                      <span className="text-muted-foreground">
                        · מקורי <Ltr>{formatDate(shipment.originalEta.value, true)}</Ltr> ← נוכחי{" "}
                        <Ltr className={cn(delay > 0 && "font-medium text-destructive")}>
                          {formatDate(shipment.currentEta.value, true)}
                        </Ltr>
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      · <span className="text-foreground/70">פעולה:</span> {top.shortAction}
                    </span>
                  </div>
                </div>
                {exceptions.length > 1 && (
                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    <Ltr>+{exceptions.length - 1}</Ltr>
                  </span>
                )}
                <ChevronLeft className="size-4 text-muted-foreground shrink-0" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
