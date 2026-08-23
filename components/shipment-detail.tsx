"use client";

import { useState } from "react";
import Link from "next/link";
import { Shipment, RecommendedAction } from "@/lib/types";
import { isArrived, delayDays, getExceptions, operationalState } from "@/lib/rules";
import { formatDate, formatDateTime, relativeToToday } from "@/lib/dates";
import { getExecutionPath, ExecutionOption, EXECUTION_ANCHORS } from "@/lib/execution-path";
import { LifecycleBadge, OperationalStateBadge } from "./status-badge";
import { SourceTag } from "./source-tag";
import { Ltr } from "./ltr";
import { JourneyStepper } from "./journey-stepper";
import { ReplyComposer } from "./communication/reply-composer";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertTriangle, MailQuestion, Mail, MailCheck, CheckCircle2, Anchor, Lock, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceSystem } from "@/lib/types";

const timelineDotColor: Record<SourceSystem, string> = {
  priority: "bg-slate-500",
  email: "bg-blue-500",
  monday: "bg-purple-500",
  carrier: "bg-teal-600",
  ai: "bg-amber-500",
};

const timelineDotGlow: Record<SourceSystem, string> = {
  priority: "shadow-[0_0_6px_-1px_#64748b]",
  email: "shadow-[0_0_6px_-1px_#3b82f6]",
  monday: "shadow-[0_0_6px_-1px_#a855f7]",
  carrier: "shadow-[0_0_6px_-1px_#0d9488]",
  ai: "shadow-[0_0_6px_-1px_#f59e0b]",
};

// Jumps to an already-rendered section further down the same page rather
// than duplicating its content up here — "בדיקת המקורות" highlights the
// real conflicting-ETA comparison in ShipmentOverview, "פתיחת משימת Monday"
// highlights the real task in ShipmentTasks, etc. One source of truth per
// piece of data, this just brings the user's eye to it.
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("ring-2", "ring-cyan/40");
  window.setTimeout(() => el.classList.remove("ring-2", "ring-cyan/40"), 1600);
}

// "ביצוע" — every option is either a real action in this demo (opens the
// Communication Agent composer, or jumps to the section that already holds
// the answer) or an explicitly disabled control with a note explaining what
// it stands in for. Never a button that silently does nothing.
function ExecutionOptionButton({
  option,
  variant,
  onEmailAction,
}: {
  option: ExecutionOption;
  variant: "default" | "outline";
  onEmailAction: (action: RecommendedAction) => void;
}) {
  if (!option.available) {
    return (
      <Button size="sm" variant="outline" disabled className="gap-1.5 opacity-60" title={option.note}>
        <Lock className="size-3.5" />
        {option.label}
      </Button>
    );
  }
  if (option.emailAction) {
    return (
      <Button size="sm" variant={variant} onClick={() => onEmailAction(option.emailAction!)}>
        <Mail className="size-3.5" />
        {option.label}
      </Button>
    );
  }
  if (option.scrollToId) {
    return (
      <Button size="sm" variant={variant} onClick={() => scrollToSection(option.scrollToId!)}>
        {option.label}
      </Button>
    );
  }
  return null;
}

function ExecutionArea({ shipment }: { shipment: Shipment }) {
  const path = getExecutionPath(shipment);
  const [composerAction, setComposerAction] = useState<RecommendedAction | null>(null);

  if (!path) return null;

  const notes = [path.primary.note, path.secondary?.note].filter(Boolean) as string[];

  return (
    <div className="mt-3.5 border-t border-border pt-3.5">
      <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">ביצוע</p>
      <div className="flex flex-wrap items-center gap-2">
        <ExecutionOptionButton option={path.primary} variant="default" onEmailAction={setComposerAction} />
        {path.secondary && (
          <ExecutionOptionButton option={path.secondary} variant="outline" onEmailAction={setComposerAction} />
        )}
      </div>
      {notes.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {notes.map((n) => (
            <li key={n} className="text-xs text-muted-foreground">
              {n}
            </li>
          ))}
        </ul>
      )}
      <ReplyComposer
        shipment={shipment}
        action={composerAction}
        open={!!composerAction}
        onOpenChange={(open) => !open && setComposerAction(null)}
      />
    </div>
  );
}

export function ShipmentHeader({ shipment }: { shipment: Shipment }) {
  const arrived = isArrived(shipment);
  const delay = delayDays(shipment);
  const exceptions = getExceptions(shipment);
  const top = exceptions[0];
  const opState = operationalState(shipment);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/" className="flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-cyan">
        <ArrowRight className="size-3.5" />
        חזרה לתמונת מצב
      </Link>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-cyan/70">
              <Anchor className="size-3" />
              תיק תפעולי · Shipment 360
            </div>
            <div className="flex items-center gap-2.5">
              <Ltr className="text-2xl font-extrabold tracking-tight text-foreground">{shipment.poNumber}</Ltr>
              <LifecycleBadge shipment={shipment} />
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              <Ltr>{shipment.supplier}</Ltr> · {shipment.supplierCountry} · יעד: <Ltr>{shipment.destinationPort}</Ltr>
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface/50 px-4 py-2.5 text-left">
            <p className="text-xs text-muted-foreground">{arrived ? "תאריך הגעה" : "ETA נוכחי"}</p>
            {shipment.currentEta ? (
              <p className="text-lg font-bold text-foreground">
                <Ltr>{formatDate(shipment.currentEta.value)}</Ltr>
                {!arrived && (
                  <span className="text-sm font-normal text-muted-foreground"> ({relativeToToday(shipment.currentEta.value)})</span>
                )}
              </p>
            ) : (
              <p className="text-lg font-semibold text-muted-foreground">לא זמין</p>
            )}
          </div>
        </div>

        <div className="relative mt-5 border-t border-border pt-5">
          <p className="mb-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            סטטוס משלוח — היכן המשלוח נמצא
          </p>
          <JourneyStepper shipment={shipment} />
        </div>

        <div className="relative mt-5 border-t border-border pt-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              מצב תפעולי — האם הכול תקין
            </p>
            {delay > 0 && (
              <span className="text-xs text-muted-foreground">
                <Ltr>{delay}</Ltr> ימי איחור מול ה-ETA המקורי
              </span>
            )}
          </div>
          <div className="mt-2">
            <OperationalStateBadge state={opState} />
          </div>

          {opState !== "ok" && top ? (
            <>
              <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-border bg-surface/50 p-3.5">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="text-sm">
                  <p>
                    <span className="font-medium text-foreground">בעיה: </span>
                    <span className="text-foreground/90">{top.message}</span>
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    <span className="font-medium text-foreground">פעולה נדרשת: </span>
                    {top.action}
                  </p>
                </div>
              </div>
              <ExecutionArea shipment={shipment} />
            </>
          ) : (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-success/20 bg-success/5 p-3.5 text-sm">
              <CheckCircle2 className="size-4 shrink-0 text-success" />
              אין צורך בפעולה — הכול תקין.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ShipmentOverview({ shipment }: { shipment: Shipment }) {
  const rows: { label: string; value: React.ReactNode; source?: React.ReactNode }[] = [
    {
      label: "מוצרים",
      value: (
        <div className="space-y-0.5">
          {shipment.products.map((p) => (
            <div key={p.sku}>
              <Ltr>{p.name}</Ltr> <span className="text-muted-foreground">— <Ltr>{p.quantity.toLocaleString()}</Ltr> {p.unit}</span>
            </div>
          ))}
        </div>
      ),
      source: <SourceTag source="priority" />,
    },
    {
      label: "מכולה",
      value: shipment.containerNumber ? <Ltr>{shipment.containerNumber.value}</Ltr> : <span className="text-muted-foreground">טרם אושר</span>,
      source: shipment.containerNumber && (
        <SourceTag source={shipment.containerNumber.source} label={shipment.containerNumber.sourceLabel} />
      ),
    },
    { label: "אונייה", value: shipment.vesselName ? <Ltr>{shipment.vesselName}</Ltr> : <span className="text-muted-foreground">—</span> },
    { label: "חברת ספנות", value: shipment.shippingCarrier ? <Ltr>{shipment.shippingCarrier}</Ltr> : <span className="text-muted-foreground">—</span> },
    {
      // Full inbound journey: supplier → origin port → sea transit →
      // Israeli port → destination warehouse. Built from separate isolated
      // segments (ChevronLeft icons, not a literal "→" mixed into a single
      // Ltr-wrapped string) so the English port/supplier names and the
      // Hebrew "בדרך בים" / warehouse text never fight over paragraph
      // direction — the exact bug fixed in the inbox's resolved-card RTL
      // pass applies here too.
      label: "מסלול",
      value: (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
          <Ltr>{shipment.supplier}</Ltr>
          <ChevronLeft className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
          <Ltr>{shipment.originPort ?? "—"}</Ltr>
          <ChevronLeft className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
          <span className="text-xs text-muted-foreground">בדרך בים</span>
          <ChevronLeft className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
          <Ltr>{shipment.destinationPort}</Ltr>
          <ChevronLeft className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
          <span className="font-medium text-foreground">{shipment.destinationWarehouse}</span>
        </div>
      ),
    },
    {
      label: "ETD",
      value: shipment.etd ? <Ltr>{formatDate(shipment.etd.value)}</Ltr> : <span className="text-muted-foreground">—</span>,
      source: shipment.etd && <SourceTag source={shipment.etd.source} label={shipment.etd.sourceLabel} />,
    },
    {
      label: "ETA מקורי",
      value: shipment.originalEta ? <Ltr>{formatDate(shipment.originalEta.value)}</Ltr> : <span className="text-muted-foreground">—</span>,
      source: shipment.originalEta && <SourceTag source={shipment.originalEta.source} label={shipment.originalEta.sourceLabel} />,
    },
    {
      label: "ETA נוכחי",
      value: shipment.currentEta ? <Ltr>{formatDate(shipment.currentEta.value)}</Ltr> : <span className="text-muted-foreground">חסר</span>,
      source: shipment.currentEta && <SourceTag source={shipment.currentEta.source} label={shipment.currentEta.sourceLabel} />,
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border bg-surface/40 px-5 py-3.5">
        <h2 className="text-[15px] font-semibold text-foreground">פרטי משלוח</h2>
      </div>
      <dl className="divide-y divide-border">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start gap-4 px-5 py-3 text-sm transition-colors hover:bg-secondary/20">
            <dt className="w-28 shrink-0 text-muted-foreground">{r.label}</dt>
            <dd className="flex-1">{r.value}</dd>
            {r.source && <div className="shrink-0">{r.source}</div>}
          </div>
        ))}
      </dl>

      {shipment.conflictingEta && shipment.currentEta && (
        <div id={EXECUTION_ANCHORS.sources} className="scroll-mt-24 rounded-b-2xl border-t border-destructive/20 bg-destructive/5 px-5 py-3.5 transition-shadow">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-destructive">
            <AlertTriangle className="size-3.5" />
            התקבל ETA סותר ממקורות שונים
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border bg-card p-2.5">
              <SourceTag source={shipment.currentEta.source} label={shipment.currentEta.sourceLabel} />
              <p className="mt-1 font-medium"><Ltr>{formatDate(shipment.currentEta.value)}</Ltr></p>
            </div>
            <div className="rounded-lg border border-border bg-card p-2.5">
              <SourceTag source={shipment.conflictingEta.source} label={shipment.conflictingEta.sourceLabel} />
              <p className="mt-1 font-medium"><Ltr>{formatDate(shipment.conflictingEta.value)}</Ltr></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ShipmentTimeline({ shipment }: { shipment: Shipment }) {
  const sorted = [...shipment.timeline].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-surface/40 px-5 py-3.5">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">ציר זמן</h2>
          <p className="text-xs text-muted-foreground">היסטוריה מאוחדת מכל המקורות — Priority · Email · Monday · חברת ספנות</p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          {(["priority", "email", "monday", "carrier", "ai"] as SourceSystem[]).map((src) => (
            <span key={src} className={cn("size-1.5 rounded-full", timelineDotColor[src])} />
          ))}
        </div>
      </div>
      <ol className="p-5">
        {sorted.map((event, i) => (
          <li key={event.id} className="relative flex gap-3.5 pb-7 last:pb-0">
            {i !== sorted.length - 1 && (
              <span
                className="absolute start-[5px] top-3 h-full w-px bg-gradient-to-b from-border via-border to-transparent"
                aria-hidden
              />
            )}
            <span
              className={cn(
                "relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-card",
                timelineDotColor[event.source],
                timelineDotGlow[event.source]
              )}
            />
            <div className="min-w-0 flex-1 rounded-xl border border-transparent px-2 py-1 -my-1 transition-colors hover:border-border hover:bg-secondary/20">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">{event.title}</span>
                <SourceTag source={event.source} label={event.sourceLabel} />
              </div>
              {event.detail && <p className="text-sm text-muted-foreground">{event.detail}</p>}
              <p className="text-xs text-muted-foreground"><Ltr>{formatDateTime(event.date)}</Ltr></p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

const emailStateMeta: Record<Shipment["emails"][number]["state"], { icon: React.ElementType; label: string; className: string }> = {
  "needs-reply": { icon: MailQuestion, label: "דרושה תשובה", className: "text-destructive bg-destructive/10" },
  waiting: { icon: Mail, label: "ממתין לתשובה", className: "text-attention-foreground bg-attention/15" },
  answered: { icon: MailCheck, label: "נענה", className: "text-success-foreground bg-success/15" },
  "info-only": { icon: Mail, label: "למידע בלבד", className: "text-muted-foreground bg-muted" },
};

export function ShipmentEmails({ shipment }: { shipment: Shipment }) {
  const sorted = [...shipment.emails].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* Read-only thread — the one action entry point (Communication Agent
          composer) now lives in the header's "ביצוע" area, directly beside
          the required action it resolves, instead of a second trigger down
          here. */}
      <div className="border-b border-border bg-surface/40 px-5 py-3.5">
        <h2 className="text-[15px] font-semibold text-foreground">תקשורת קשורה</h2>
      </div>

      {sorted.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-muted-foreground">אין עדיין מיילים המקושרים למשלוח זה.</p>
      ) : (
        <ul className="divide-y divide-border">
          {sorted.map((e) => {
            const meta = emailStateMeta[e.state];
            const Icon = meta.icon;
            const outgoing = e.direction === "outgoing";
            return (
              <li key={e.id} className="px-5 py-3.5 transition-colors hover:bg-secondary/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p dir="ltr" className="truncate text-start text-sm font-medium text-foreground">
                      {e.subject}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      מאת: <Ltr>{outgoing ? shipment.owner : e.fromCompany}</Ltr>
                      {e.to && (
                        <>
                          {" · אל: "}
                          <Ltr>{e.to}</Ltr>
                        </>
                      )}
                      {" · "}
                      <Ltr>{formatDateTime(e.receivedAt)}</Ltr>
                    </p>
                    <p dir="ltr" className="mt-1.5 text-start text-sm text-muted-foreground whitespace-pre-line line-clamp-3">
                      {e.body ?? e.snippet}
                    </p>
                  </div>
                  <span className={cn("flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium", meta.className)}>
                    <Icon className="size-3.5" />
                    {meta.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const taskStatusMeta: Record<Shipment["tasks"][number]["status"], { label: string; className: string }> = {
  open: { label: "פתוח", className: "bg-muted text-muted-foreground" },
  "in-progress": { label: "בתהליך", className: "bg-info/10 text-info-foreground" },
  done: { label: "הושלם", className: "bg-success/15 text-success-foreground" },
};

export function ShipmentTasks({ shipment }: { shipment: Shipment }) {
  if (shipment.tasks.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border bg-surface/40 px-5 py-3.5">
          <h2 className="text-[15px] font-semibold text-foreground">משימות פנימיות</h2>
        </div>
        <p className="px-5 py-6 text-center text-sm text-muted-foreground">אין משימות פתוחות למשלוח זה.</p>
      </div>
    );
  }

  return (
    <div id={EXECUTION_ANCHORS.tasks} className="scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-card transition-shadow">
      <div className="border-b border-border bg-surface/40 px-5 py-3.5">
        <h2 className="text-[15px] font-semibold text-foreground">משימות פנימיות</h2>
        <p className="text-xs text-muted-foreground">מתוך Monday</p>
      </div>
      <ul className="divide-y divide-border">
        {shipment.tasks.map((t) => {
          const meta = taskStatusMeta[t.status];
          return (
            <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-secondary/20">
              <div>
                <p className="font-medium text-foreground">{t.title}</p>
                <p className="text-xs text-muted-foreground">
                  {t.owner} · יעד <Ltr>{formatDate(t.dueDate, true)}</Ltr>
                </p>
              </div>
              <span className={cn("rounded-md px-2 py-1 text-xs font-medium", meta.className)}>{meta.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
