"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { EmailCard } from "@/components/inbox/email-card";
import { ReplyComposer } from "@/components/communication/reply-composer";
import { IncomingEmail, RecommendedAction } from "@/lib/types";
import { Inbox, AlertTriangle, Mail, CheckCircle2 } from "lucide-react";
import { PageOceanBackground } from "@/components/page-ocean-background";

export default function InboxPage() {
  const emails = useAppStore((s) => s.emails);
  const shipments = useAppStore((s) => s.shipments);

  // The reply composer lives once, here at the page level, rather than
  // inside each card — sending a reply moves its email from "דורש טיפול" to
  // "ממתין לתשובה", which re-parents the card into a different section. A
  // composer owned by the card it was opened from would unmount mid-send
  // and the "נשלח בהצלחה" confirmation would never show.
  const [composer, setComposer] = useState<{ email: IncomingEmail; action: RecommendedAction | null } | null>(null);
  const composerShipment = composer ? shipments.find((s) => s.id === composer.email.linkedShipmentId) ?? null : null;

  // Three operational buckets — every processed email lands in exactly one.
  // No flat technical filter bar, no manual "process" step: by the time
  // this page renders, every email already went through the pipeline (see
  // lib/store.ts createInitialState).
  const requiresAttention = emails.filter((e) => e.processed && !e.applied && !e.awaitingReply);
  const awaitingReply = emails.filter((e) => e.processed && !e.applied && e.awaitingReply);
  const handled = [...emails.filter((e) => e.processed && e.applied)].sort(
    (a, b) => (a.outcome === "irrelevant" ? 1 : 0) - (b.outcome === "irrelevant" ? 1 : 0)
  );

  return (
    <div className="flex flex-col gap-6">
      {/* The cargo-ship photo now lives once, fixed behind the entire page
          (see PageOceanBackground) — not duplicated inside the hero. */}
      <PageOceanBackground positionClassName="bg-[position:55%_58%]" />

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/85 p-6 shadow-soft backdrop-blur-md">
        <div className="relative flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan/10 text-cyan">
              <Inbox className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-gradient-brand">עדכונים נכנסים</h1>
              <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
                כאן מופיעים עדכונים חדשים שמשפיעים על ההזמנות. המערכת מטפלת אוטומטית במה שאפשר, מקשרת כל עדכון להזמנה
                הרלוונטית, ומציגה לך רק מה שדורש החלטה.
              </p>
            </div>
          </div>
          {/* Compact live readout, not a KPI card — just what needs her
              attention right now, derived from the same arrays the sections
              below render. Pinned to the end of the row so it stays part of
              the same header line on desktop instead of wrapping under the
              title/subtitle column. */}
          <p className="ms-auto shrink-0 rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-sm font-semibold text-foreground">
            {requiresAttention.length} דורשים טיפול
            {awaitingReply.length > 0 && ` · ${awaitingReply.length} ממתין לתשובה`}
          </p>
        </div>
      </div>

      {/* דורש טיפול — the most important section on the page, always
          visible, never collapsed. */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="size-4" />
          </span>
          <h2 className="text-lg font-bold text-foreground">דורש טיפול ({requiresAttention.length})</h2>
        </div>
        <div className="flex flex-col gap-2.5">
          {requiresAttention.length === 0 && (
            <p className="rounded-2xl border border-border bg-card/90 backdrop-blur-sm px-4 py-8 text-center text-sm text-muted-foreground">
              אין כרגע עדכונים שממתינים לך — הכול טופל.
            </p>
          )}
          {requiresAttention.map((e) => (
            <EmailCard key={e.id} email={e} onOpenReply={(email, action) => setComposer({ email, action })} />
          ))}
        </div>
      </div>

      {awaitingReply.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-attention/15 text-attention-foreground">
              <Mail className="size-4" />
            </span>
            <h2 className="text-base font-semibold text-foreground">ממתין לתשובה ({awaitingReply.length})</h2>
          </div>
          <div className="flex flex-col gap-2.5">
            {awaitingReply.map((e) => (
              <EmailCard key={e.id} email={e} onOpenReply={(email, action) => setComposer({ email, action })} />
            ))}
          </div>
        </div>
      )}

      {handled.length > 0 && (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted-foreground select-none">
            <span className="transition-transform group-open:rotate-90">›</span>
            <CheckCircle2 className="size-3.5 text-success-foreground" />
            טופל ({handled.length})
          </summary>
          <div className="mt-2.5 flex flex-col gap-2">
            {handled.map((e) => (
              <EmailCard key={e.id} email={e} onOpenReply={(email, action) => setComposer({ email, action })} />
            ))}
          </div>
        </details>
      )}

      {/* Mounted unconditionally (unlike the cards above) — ReplyComposer
          detects a fresh open by watching its own `open` prop rise from
          false to true, which only works if it's already mounted beforehand.
          Conditionally mounting it exactly when composer becomes non-null
          would make it mount already "open", so that transition would never
          fire and it would never generate a draft. */}
      <ReplyComposer
        shipment={composerShipment}
        action={composer?.action ?? null}
        email={composer?.email ?? null}
        open={!!composer && !!composerShipment}
        onOpenChange={(open) => !open && setComposer(null)}
      />
    </div>
  );
}
