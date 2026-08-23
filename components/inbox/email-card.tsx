"use client";

import { useState } from "react";
import { IncomingEmail, ProcessingOutcome, Shipment, SourceSystem, RecommendedAction } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { classificationLabel, outcomeLabel } from "@/lib/ai-pipeline";
import { recommendedActionForEmail } from "@/lib/communication-agent";
import { formatDateTime } from "@/lib/dates";
import {
  confidenceLabel,
  conflictFoundLabel,
  formatFieldValue,
  isConflictLike,
  isDateLike,
  isMatchingUncertain,
  SIMPLE_OUTCOME_COPY,
  whatHappenedHeadline,
  whatSystemFound,
  whatYouNeedToDo,
} from "@/lib/inbox-copy";
import { UnknownEventCard } from "./unknown-event-card";
import { Ltr } from "@/components/ltr";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Tag,
  ScanSearch,
  Link2,
  FileEdit,
  Target,
  ChevronLeft,
  Mail,
} from "lucide-react";
import Link from "next/link";

const fieldLabels: Record<string, string> = {
  poNumber: "מספר PO",
  eta: "ETA",
  containerNumber: "מספר מכולה",
  supplier: "ספק",
  event: "אירוע",
  origin: "מוצא",
  destination: "יעד",
};

const sourceLabelHebrew: Record<SourceSystem, string> = {
  carrier: "חברת הספנות",
  email: "מייל קודם",
  priority: "Priority",
  monday: "Monday",
  ai: "AI",
};

// The single place that maps a workflow outcome to how it looks — reused by
// the resolved audit row and every actionable card, so all of them agree.
// The tones double as Sarit's color coding: green = handled, cyan = needs
// her approval, red = needs a look, gray = irrelevant.
const outcomeMeta: Record<ProcessingOutcome, { icon: typeof CheckCircle2; tone: string }> = {
  "auto-updated": { icon: CheckCircle2, tone: "text-success-foreground bg-success/10" },
  // Deliberately NOT Sparkles — this outcome is a deterministic PO/field
  // match with a proposed diff, nothing interpretive. Sparkles is reserved
  // for the one genuinely AI-interpreted surface (see UnknownEventCard).
  "pending-approval": { icon: ClipboardCheck, tone: "text-cyan bg-cyan/10" },
  "needs-review": { icon: AlertTriangle, tone: "text-destructive bg-destructive/10" },
  irrelevant: { icon: XCircle, tone: "text-muted-foreground bg-muted" },
};

// Everything in this component is TECHNICAL detail: classification,
// extraction, match confidence, outcome label. It renders only inside the
// "פרטים נוספים" disclosure — never in the primary card — so a non-technical
// user is never required to understand it to know what to do next.
function PipelineStages({ email }: { email: IncomingEmail }) {
  const topCandidate = email.candidates?.[0];
  const isAmbiguous = (email.candidates?.length ?? 0) > 1;
  const matchLabel: React.ReactNode = isAmbiguous ? (
    "נדרשת בדיקה ידנית"
  ) : topCandidate ? (
    <Ltr>
      {topCandidate.poNumber} · {Math.round(topCandidate.confidence * 100)}%
    </Ltr>
  ) : (
    "לא נמצאה התאמה"
  );
  const updateLabel = email.suggestedUpdates?.length
    ? `${email.suggestedUpdates.length} ${email.suggestedUpdates.length === 1 ? "שדה" : "שדות"}`
    : "אין שינוי מוצע";

  const stages: { icon: typeof Tag; label: string; value: React.ReactNode }[] = [
    { icon: Tag, label: "סיווג", value: classificationLabel(email.classification!) },
    {
      icon: ScanSearch,
      label: "חילוץ",
      value:
        email.extracted && Object.keys(email.extracted).length > 0
          ? Object.keys(email.extracted)
              .map((k) => fieldLabels[k] ?? k)
              .join(", ")
          : "—",
    },
    { icon: Link2, label: "התאמה", value: matchLabel },
    { icon: FileEdit, label: "עדכון מוצע", value: updateLabel },
    { icon: Target, label: "תוצאה", value: outcomeLabel(email.outcome!) },
  ];

  return (
    <div className="flex flex-wrap items-stretch gap-1.5">
      {stages.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="flex min-w-[110px] flex-col gap-0.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5">
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Icon className="size-3" />
                {s.label}
              </span>
              <span className="text-xs font-medium text-foreground">{s.value}</span>
            </div>
            {i < stages.length - 1 && <ChevronLeft className="size-3.5 shrink-0 text-muted-foreground/50" />}
          </div>
        );
      })}
    </div>
  );
}

// Compact old→new list — technical detail, lives inside "פרטים נוספים"; the
// primary card already states the change in a plain sentence, and the
// conflict card shows its own two-value comparison above this.
function UpdatesList({ updates }: { updates: NonNullable<IncomingEmail["suggestedUpdates"]> }) {
  return (
    <div className="space-y-2">
      {updates.map((u) => (
        <div key={u.field} className="flex items-center gap-3 text-sm">
          <span className="w-24 shrink-0 text-xs text-muted-foreground">{u.label}</span>
          <div className="flex-1">
            <p className="font-medium text-muted-foreground">
              <Ltr>{formatFieldValue(u.currentValue)}</Ltr>
            </p>
          </div>
          <ChevronLeft className="size-3.5 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-medium text-primary">
              <Ltr>{isDateLike(u.suggestedValue) ? formatFieldValue(u.suggestedValue) : u.suggestedValue}</Ltr>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Shared "what's new" box — a small label plus its content, used for both a
// plain-language update sentence ("עדכון") and a conflict comparison
// ("נמצאה סתירה"). The PO is already in the card's headline, so this never
// repeats "הותאם ל-PO-XXXX" — that would just be re-stating the headline.
function FoundBox({ label, tone, children }: { label: string; tone?: "destructive"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "mt-3 rounded-lg p-3 text-sm",
        tone === "destructive" ? "border border-destructive/15 bg-destructive/5" : "bg-secondary/40"
      )}
    >
      <p className={cn("text-xs font-medium", tone === "destructive" ? "text-destructive" : "text-muted-foreground")}>{label}</p>
      <div className="mt-0.5 text-foreground">{children}</div>
    </div>
  );
}

// Shared chrome for every open ("דורש טיפול") card: icon/headline/sender up
// top, "פרטים נוספים" (raw email, pipeline stages, match info) down below.
// The state-specific middle — what happened / what's needed / the action
// buttons — is passed in as children, so each branch below only needs to
// own its own content, not the surrounding card.
function ActionableShell({
  email,
  icon: Icon,
  tone,
  chipLabel,
  headline,
  isAmbiguous,
  matchedShipment,
  children,
}: {
  email: IncomingEmail;
  icon: typeof CheckCircle2;
  tone: string;
  chipLabel: string;
  headline: string;
  isAmbiguous: boolean;
  matchedShipment: Shipment | undefined;
  children: React.ReactNode;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const topCandidate = email.candidates?.[0];

  return (
    <div className="rounded-xl border border-border bg-card/92 backdrop-blur-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", tone)}>
            <Icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{headline}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <Ltr>{email.fromCompany}</Ltr> · <Ltr>{formatDateTime(email.receivedAt)}</Ltr>
            </p>
          </div>
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", tone)}>{chipLabel}</span>
        </div>

        {children}
      </div>

      <details
        className="border-t border-border"
        open={detailsOpen}
        onToggle={(e) => setDetailsOpen(e.currentTarget.open)}
      >
        <summary className="cursor-pointer select-none px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
          פרטים נוספים
        </summary>
        <div className="space-y-3 px-4 pb-4">
          <div dir="ltr" className="rounded-md bg-muted/20 px-3 py-2 text-start text-xs text-muted-foreground whitespace-pre-line">
            {email.body}
          </div>

          <PipelineStages email={email} />

          {isAmbiguous && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-attention-foreground">
                <HelpCircle className="size-4" />
                התאמות אפשריות
              </div>
              <ul className="space-y-1">
                {email.candidates!.map((c) => (
                  <li key={c.shipmentId} className="flex items-center gap-2 text-sm">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-attention" style={{ width: `${Math.round(c.confidence * 100)}%` }} />
                    </div>
                    <Link href={`/shipments/${c.shipmentId}`} className="font-medium text-primary hover:underline">
                      <Ltr>{c.poNumber}</Ltr>
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {confidenceLabel(c.confidence)} (<Ltr>{Math.round(c.confidence * 100)}%</Ltr>)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!isAmbiguous && topCandidate && matchedShipment && (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4 text-success" />
              הותאם להזמנה{" "}
              <Link href={`/shipments/${matchedShipment.id}`} className="font-medium text-primary hover:underline">
                <Ltr>{matchedShipment.poNumber}</Ltr>
              </Link>
              <span className="text-xs text-muted-foreground">
                ({confidenceLabel(topCandidate.confidence)} · <Ltr>{Math.round(topCandidate.confidence * 100)}%</Ltr> · {topCandidate.matchedOn})
              </span>
            </div>
          )}

          {!topCandidate && !isAmbiguous && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <XCircle className="size-4" />
              לא נמצא משלוח מתאים.
            </div>
          )}

          {!!email.suggestedUpdates?.length && <UpdatesList updates={email.suggestedUpdates} />}

          {email.outcome === "needs-review" && email.reviewReason && (
            <p className="text-xs text-muted-foreground">סיבה טכנית: {email.reviewReason}</p>
          )}
        </div>
      </details>
    </div>
  );
}

function ShipmentPickerBranch({ email }: { email: IncomingEmail }) {
  const shipments = useAppStore((s) => s.shipments);
  const linkEmailToShipment = useAppStore((s) => s.linkEmailToShipment);
  const candidates = email.candidates ?? [];
  const candidateIds = new Set(candidates.map((c) => c.shipmentId));
  const otherShipments = shipments.filter((s) => !candidateIds.has(s.id) && s.status !== "arrived");

  return (
    <>
      <p className="mt-3 text-sm text-foreground">לא הצלחנו לזהות לאיזו הזמנה העדכון שייך.</p>
      <div className="mt-3">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">בחרי את ההזמנה המתאימה:</p>
        <Select onValueChange={(shipmentId) => linkEmailToShipment(email.id, shipmentId)}>
          <SelectTrigger className="w-full sm:w-80">
            <SelectValue placeholder="בחר הזמנה" />
          </SelectTrigger>
          <SelectContent>
            {candidates.length > 0 && (
              <SelectGroup>
                <SelectLabel>התאמות סבירות</SelectLabel>
                {candidates.map((c) => {
                  const s = shipments.find((sh) => sh.id === c.shipmentId);
                  return (
                    <SelectItem key={c.shipmentId} value={c.shipmentId}>
                      <span dir="ltr">
                        {c.poNumber} — {s?.supplier}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            )}
            <SelectGroup>
              <SelectLabel>כל ההזמנות הפתוחות</SelectLabel>
              {otherShipments.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <span dir="ltr">
                    {s.poNumber} — {s.supplier}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

function ProposedUpdateBranch({ email, shipment, onReply }: { email: IncomingEmail; shipment: Shipment; onReply: () => void }) {
  const applyUpdate = useAppStore((s) => s.applyUpdate);
  const found = whatSystemFound(email, shipment, email.candidates ?? []);
  const needAction = whatYouNeedToDo(email);

  return (
    <>
      <FoundBox label="עדכון">{found}</FoundBox>
      <div className="mt-2.5 flex items-start gap-2 text-sm">
        <span className="mt-0.5 shrink-0 text-xs font-medium text-muted-foreground">מה צריך לעשות?</span>
        <span className="text-foreground">{needAction}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => applyUpdate(email.id)}>
          אישור ועדכון
        </Button>
        <Button size="sm" variant="outline" onClick={onReply}>
          השב למייל
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/shipments/${shipment.id}`}>פתח משלוח</Link>
        </Button>
      </div>
    </>
  );
}

function ConflictBranch({ email, shipment, onReply }: { email: IncomingEmail; shipment: Shipment; onReply: () => void }) {
  const needAction = whatYouNeedToDo(email);
  const etaUpdate = email.suggestedUpdates?.find((u) => u.field === "currentEta");
  const label = conflictFoundLabel(email.reviewReason);

  return (
    <>
      <FoundBox label={label} tone="destructive">
        {etaUpdate && shipment.currentEta ? (
          <div className="grid grid-cols-2 gap-2">
            <p>
              <span className="text-muted-foreground">{sourceLabelHebrew[shipment.currentEta.source]}: </span>
              <Ltr className="font-semibold">{formatFieldValue(shipment.currentEta.value)}</Ltr>
            </p>
            <p>
              <span className="text-muted-foreground">
                <Ltr>{email.fromCompany}</Ltr>:{" "}
              </span>
              <Ltr className="font-semibold">{formatFieldValue(etaUpdate.suggestedValue)}</Ltr>
            </p>
          </div>
        ) : (
          needAction
        )}
      </FoundBox>
      <div className="mt-2.5 flex items-start gap-2 text-sm">
        <span className="mt-0.5 shrink-0 text-xs font-medium text-muted-foreground">מה צריך לעשות?</span>
        <span className="text-foreground">{needAction}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link href={`/shipments/${shipment.id}`}>בדוק משלוח</Link>
        </Button>
        <Button size="sm" variant="outline" onClick={onReply}>
          השב לספק
        </Button>
      </div>
    </>
  );
}

function UnknownEventBranch({ email, matchedShipment }: { email: IncomingEmail; matchedShipment: Shipment | undefined }) {
  const needAction = whatYouNeedToDo(email);
  return (
    <>
      <div className="mt-2.5 flex items-start gap-2 text-sm">
        <span className="mt-0.5 shrink-0 text-xs font-medium text-muted-foreground">מה צריך לעשות?</span>
        <span className="text-foreground">{needAction}</span>
      </div>
      <div className="mt-3">
        <UnknownEventCard email={email} matchedShipment={matchedShipment} />
      </div>
    </>
  );
}

// "ממתין לתשובה" — Sarit already replied and is waiting on the other side.
// Deliberately quieter than an open card (nothing for her to decide right
// now) but not as quiet as a resolved one (still an open thread).
function AwaitingReplyRow({ email, shipment, onFollowUp }: { email: IncomingEmail; shipment: Shipment; onFollowUp: () => void }) {
  const waitingSince = [...shipment.emails]
    .filter((e) => e.direction === "outgoing" && e.state === "waiting")
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0];

  return (
    <div className="rounded-xl border border-border bg-card/92 backdrop-blur-sm px-4 py-3.5">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-attention/15 text-attention-foreground">
          <Mail className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            <Ltr>{shipment.poNumber}</Ltr> · <Ltr>{email.fromCompany}</Ltr>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {waitingSince ? (
              <>
                השבת ב-<Ltr>{formatDateTime(waitingSince.receivedAt)}</Ltr> · ממתינה לתשובה
              </>
            ) : (
              "ממתינה לתשובה"
            )}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-attention/15 px-2.5 py-1 text-xs font-semibold text-attention-foreground">
          ממתין לתשובה
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/shipments/${shipment.id}`}>פתח התכתבות</Link>
        </Button>
        <Button size="sm" variant="outline" onClick={onFollowUp}>
          שלח Follow-up
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/shipments/${shipment.id}`}>פתח משלוח</Link>
        </Button>
      </div>
    </div>
  );
}

// "טופל" — resolved automatically or by Sarit's own click, collapses to one
// quiet audit row. Deliberately the least visually loud state on the page.
function ResolvedRow({ email, matchedShipment }: { email: IncomingEmail; matchedShipment: Shipment | undefined }) {
  const outcome = email.outcome ?? "irrelevant";
  const meta = outcomeMeta[outcome];
  const Icon = meta.icon;
  const copy = SIMPLE_OUTCOME_COPY[outcome];
  const resolvedByHuman = outcome === "pending-approval" || outcome === "needs-review";
  const hasChanges = outcome === "auto-updated" && !!email.suggestedUpdates?.length;
  const headline = matchedShipment ? matchedShipment.poNumber : email.fromCompany;

  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur-sm px-4 py-2.5 text-sm">
      <div className="flex items-start gap-3">
        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", meta.tone)}>
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          {/* Stacked, not side-by-side: in a shared RTL row the PO (LTR
              content) and the Hebrew outcome label fought for alignment.
              Each on its own line reads naturally right-aligned. */}
          <p className="truncate font-medium text-foreground">
            <Ltr>{headline}</Ltr>
          </p>
          <p className="text-xs font-medium text-muted-foreground">{resolvedByHuman ? "טופל" : copy.label}</p>
          {hasChanges && <AutoUpdateSummary updates={email.suggestedUpdates!} />}
        </div>
      </div>
    </div>
  );
}

// One line per changed field, each written as a natural Hebrew sentence with
// only the technical value (date, container ID) isolated via <Ltr> — never
// the whole line. The previous version wrapped the entire mixed Hebrew+
// English summary in a single dir="ltr" block, which reversed the Hebrew
// words instead of just isolating the embedded values.
function AutoUpdateSummary({ updates }: { updates: NonNullable<IncomingEmail["suggestedUpdates"]> }) {
  return (
    <div className="mt-1 space-y-0.5 text-xs font-medium text-success-foreground">
      {updates.map((u) => {
        const newValue = formatFieldValue(u.suggestedValue);
        if (!u.currentValue) {
          const label = u.field === "currentEta" ? "ETA חדש" : u.field === "containerNumber" ? "מספר מכולה" : u.label;
          return (
            <p key={u.field}>
              {label}: <Ltr>{newValue}</Ltr>
            </p>
          );
        }
        const label = u.field === "currentEta" ? "ETA עודכן" : u.field === "containerNumber" ? "מספר מכולה עודכן" : u.label;
        return (
          <p key={u.field}>
            {label}: <Ltr>{`${formatFieldValue(u.currentValue)} → ${newValue}`}</Ltr>
          </p>
        );
      })}
    </div>
  );
}

interface EmailCardProps {
  email: IncomingEmail;
  // The composer dialog lives once at the page level (not inside this card)
  // — sending a reply flips this same email into "ממתין לתשובה", which
  // switches which branch renders it. If the dialog lived inside that
  // branch, it would unmount mid-send and the "נשלח בהצלחה" confirmation
  // would never be seen.
  onOpenReply: (email: IncomingEmail, action: RecommendedAction | null) => void;
}

export function EmailCard({ email, onOpenReply }: EmailCardProps) {
  const shipments = useAppStore((s) => s.shipments);
  const matchedShipment = email.linkedShipmentId ? shipments.find((s) => s.id === email.linkedShipmentId) : undefined;

  // In the connected product every email is processed the instant it
  // arrives (see lib/store.ts createInitialState) — this branch only guards
  // against a theoretical unprocessed email slipping through; it is never
  // reached in normal operation, so there's no "עיבוד עדכון" state to show.
  if (!email.processed) return null;

  if (email.applied) {
    return <ResolvedRow email={email} matchedShipment={matchedShipment} />;
  }

  if (email.awaitingReply && matchedShipment) {
    const followUpAction: RecommendedAction = {
      kind: "no-response",
      label: "שלח Follow-up",
      recipientRole: "supplier",
      recipientLabel: matchedShipment.supplier,
    };
    return <AwaitingReplyRow email={email} shipment={matchedShipment} onFollowUp={() => onOpenReply(email, followUpAction)} />;
  }

  const outcome = email.outcome ?? "needs-review";
  const meta = outcomeMeta[outcome];
  const copy = SIMPLE_OUTCOME_COPY[outcome];
  const isAmbiguous = (email.candidates?.length ?? 0) > 1;
  const headline = whatHappenedHeadline(email, matchedShipment, isAmbiguous);

  let body: React.ReactNode;
  if (email.unknownEvent) {
    body = <UnknownEventBranch email={email} matchedShipment={matchedShipment} />;
  } else if (!matchedShipment || isMatchingUncertain(email.reviewReason)) {
    body = <ShipmentPickerBranch email={email} />;
  } else if (isConflictLike(email.reviewReason)) {
    body = <ConflictBranch email={email} shipment={matchedShipment} onReply={() => onOpenReply(email, recommendedActionForEmail(email))} />;
  } else {
    body = <ProposedUpdateBranch email={email} shipment={matchedShipment} onReply={() => onOpenReply(email, recommendedActionForEmail(email))} />;
  }

  return (
    <ActionableShell
      email={email}
      icon={meta.icon}
      tone={meta.tone}
      chipLabel={copy.label}
      headline={headline}
      isAmbiguous={isAmbiguous}
      matchedShipment={matchedShipment}
    >
      {body}
    </ActionableShell>
  );
}
