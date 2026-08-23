"use client";

import { create } from "zustand";
import { shipments as initialShipments, incomingEmails as initialEmails } from "./mock-data";
import {
  Shipment,
  IncomingEmail,
  TimelineEvent,
  RelatedEmail,
  RecommendedAction,
  DraftEmail,
  MondayTask,
  UnknownEventInterpretation,
  SuggestedUpdate,
  TimelineSource,
  ProcessingOutcome,
} from "./types";
import { processEmail, resolveManualMatch } from "./ai-pipeline";
import { TODAY, formatDate, daysFromToday } from "./dates";

interface AppState {
  shipments: Shipment[];
  emails: IncomingEmail[];
  processEmailById: (id: string) => void;
  applyUpdate: (emailId: string) => void;
  dismissEmail: (emailId: string) => void;
  approveUnknownEvent: (emailId: string, finalAction: string) => void;
  dismissUnknownEvent: (emailId: string) => void;
  linkEmailToShipment: (emailId: string, shipmentId: string) => void;
  replyToEmail: (emailId: string, draft: DraftEmail, action: RecommendedAction | null) => void;
  sendReply: (shipmentId: string, draft: DraftEmail, action: RecommendedAction | null) => void;
  resetDemo: () => void;
  getShipment: (id: string) => Shipment | undefined;
}

let timelineIdCounter = 1000;

// ‎ (LRM) isolates each Latin/numeric token so two of them in one Hebrew
// sentence (e.g. a container number and a date) don't get visually
// reordered by the bidi algorithm.
const lrm = (s: string) => `‎${s}‎`;

function updateSummary(updates: SuggestedUpdate[]): string {
  return updates
    .map((u) =>
      u.field === "currentEta"
        ? `ETA עודכן ל-${lrm(formatDate(u.suggestedValue, true))}`
        : u.field === "containerNumber"
          ? `מספר מכולה אושר: ${lrm(u.suggestedValue)}`
          : "סטטוס עודכן"
    )
    .join(" · ");
}

// Same idea as updateSummary(), but for the automatic carrier path: when a
// field already had a value (u.currentValue is set), this IS the carrier
// revising its own earlier figure, not a first confirmation — the Timeline
// should say so explicitly (who changed it, from what, to what) rather than
// reading identically to a brand-new value appearing out of nowhere.
function carrierUpdateSummary(fromCompany: string, updates: SuggestedUpdate[]): string {
  return updates
    .map((u) => {
      if (u.field === "currentEta") {
        return u.currentValue
          ? `${fromCompany} עדכנה את ה-ETA מ-${lrm(formatDate(u.currentValue, true))} ל-${lrm(formatDate(u.suggestedValue, true))}`
          : `ETA עודכן ל-${lrm(formatDate(u.suggestedValue, true))}`;
      }
      if (u.field === "containerNumber") {
        return u.currentValue
          ? `${fromCompany} עדכנה את מספר המכולה מ-${lrm(u.currentValue)} ל-${lrm(u.suggestedValue)}`
          : `מספר מכולה אושר: ${lrm(u.suggestedValue)}`;
      }
      return "סטטוס עודכן";
    })
    .join(" · ");
}

// Shared by both the automatic (trusted carrier, no click required) and
// manual (Sarit clicked "אישור ועדכון") paths, so the two can never drift:
// same fields touched, same "waiting" email resolved, same status bump out
// of production. What differs is only what the resulting SourcedValue and
// timeline entry say about where the update came from — that distinction is
// the entire point of this feature, so it's the one thing callers control.
function applyFieldUpdates(
  shipment: Shipment,
  email: IncomingEmail,
  updates: SuggestedUpdate[],
  origin: {
    source: "carrier" | "email";
    fieldSourceLabel: string;
    timelineSource: TimelineSource;
    timelineSourceLabel: string;
    detail: string;
    title: string;
  }
): { updatedShipment: Shipment; event: TimelineEvent } {
  const etaUpdate = updates.find((u) => u.field === "currentEta");
  const containerUpdate = updates.find((u) => u.field === "containerNumber");

  const event: TimelineEvent = {
    id: `ai-${timelineIdCounter++}`,
    date: TODAY.toISOString(),
    title: origin.title,
    detail: origin.detail,
    source: origin.timelineSource,
    sourceLabel: origin.timelineSourceLabel,
  };

  const updatedShipment: Shipment = {
    ...shipment,
    currentEta: etaUpdate
      ? { value: etaUpdate.suggestedValue, source: origin.source, sourceLabel: origin.fieldSourceLabel, updatedAt: TODAY.toISOString() }
      : shipment.currentEta,
    containerNumber: containerUpdate
      ? { value: containerUpdate.suggestedValue, source: origin.source, sourceLabel: origin.fieldSourceLabel, updatedAt: TODAY.toISOString() }
      : shipment.containerNumber,
    status: shipment.status === "production" ? "in-transit" : shipment.status,
    lastUpdate: TODAY.toISOString(),
    timeline: [...shipment.timeline, event],
    emails: shipment.emails.map((e) =>
      e.fromCompany === email.fromCompany && e.state === "waiting" ? { ...e, state: "answered" } : e
    ),
  };

  return { updatedShipment, event };
}

// Mirrors a matched inbox email into the shipment's own communication
// thread, so Shipment 360 shows the same message without a second, separate
// "inbox" concept — this is what makes the inbox and Shipment 360 feel like
// one connected module instead of two. Only emails that actually reached a
// single shipment get mirrored; irrelevant mail and still-ambiguous matches
// have nothing to attach to yet.
function buildRelatedEmail(email: IncomingEmail, outcome: ProcessingOutcome): RelatedEmail | null {
  if (outcome === "irrelevant") return null;
  return {
    id: `related-${email.id}`,
    from: email.from,
    fromCompany: email.fromCompany,
    subject: email.subject,
    snippet: email.body.split("\n").find((l) => l.trim()) ?? email.body,
    body: email.body,
    receivedAt: email.receivedAt,
    state: outcome === "auto-updated" ? "info-only" : "needs-reply",
    direction: "incoming",
  };
}

function attachRelatedEmail(shipments: Shipment[], shipmentId: string, related: RelatedEmail | null): Shipment[] {
  if (!related) return shipments;
  return shipments.map((s) =>
    s.id === shipmentId && !s.emails.some((e) => e.id === related.id) ? { ...s, emails: [...s.emails, related] } : s
  );
}

// The full per-email pipeline run, extracted as a pure function so it can
// run both on-demand (processEmailById, still available as a de-emphasized
// demo control) and in a loop at store-init time (see createInitialState) —
// in the real product this entire step runs automatically the instant a new
// update arrives, with no manual trigger at all. The decision logic itself
// (processEmail, from lib/ai-pipeline.ts) is called exactly as before and is
// completely unchanged.
function runPipelineForEmail(shipments: Shipment[], emails: IncomingEmail[], id: string): { shipments: Shipment[]; emails: IncomingEmail[] } {
  const email = emails.find((e) => e.id === id);
  if (!email || email.processed) return { shipments, emails };
  const result = processEmail(email, shipments);

  const autoResolved = result.outcome === "auto-updated" || result.outcome === "irrelevant";
  const singleMatch = result.candidates.length === 1 ? result.candidates[0] : null;
  const updatedEmail: IncomingEmail = {
    ...email,
    processed: true,
    classification: result.classification,
    extracted: result.extracted,
    candidates: result.candidates,
    suggestedUpdates: result.suggestedUpdates,
    unknownEvent: result.unknownEvent,
    outcome: result.outcome,
    reviewReason: result.reviewReason,
    applied: autoResolved,
    linkedShipmentId: singleMatch?.shipmentId,
  };

  let nextShipments = attachRelatedEmail(shipments, singleMatch?.shipmentId ?? "", buildRelatedEmail(updatedEmail, result.outcome));

  if (result.outcome !== "auto-updated" || result.suggestedUpdates.length === 0) {
    return { shipments: nextShipments, emails: emails.map((e) => (e.id === id ? updatedEmail : e)) };
  }

  const target = result.candidates[0];
  const shipment = nextShipments.find((s) => s.id === target.shipmentId);
  if (!shipment) return { shipments: nextShipments, emails: emails.map((e) => (e.id === id ? updatedEmail : e)) };

  const { updatedShipment } = applyFieldUpdates(shipment, email, result.suggestedUpdates, {
    source: "carrier",
    fieldSourceLabel: `${email.fromCompany} Tracking`,
    timelineSource: "carrier",
    timelineSourceLabel: `${email.fromCompany} Tracking`,
    detail: `עדכון אוטומטי — מקור מהימן (${email.fromCompany}), ללא צורך באישור ידני.`,
    title: carrierUpdateSummary(email.fromCompany, result.suggestedUpdates),
  });

  nextShipments = nextShipments.map((s) => (s.id === shipment.id ? updatedShipment : s));

  return {
    shipments: nextShipments,
    emails: emails.map((e) => (e.id === id ? updatedEmail : e)),
  };
}

// Same idea as sendReply below, extracted so replyToEmail (triggered from an
// inbox card) and sendReply (triggered from Shipment 360's own "ביצוע" area)
// can share one implementation instead of two copies that could drift.
function sendReplyPure(shipments: Shipment[], shipmentId: string, draft: DraftEmail, action: RecommendedAction | null): Shipment[] {
  const shipment = shipments.find((s) => s.id === shipmentId);
  if (!shipment) return shipments;

  const ownerSlug = shipment.owner
    .toLowerCase()
    .split(" ")
    .join(".")
    .replace(/[^a-z.]/g, "");
  const fromAddress = `${ownerSlug}@efs-company.com`;

  const outgoingEmail: RelatedEmail = {
    id: `email-${timelineIdCounter++}`,
    from: fromAddress,
    fromCompany: "EFS",
    to: draft.to,
    subject: draft.subject,
    snippet: draft.body.split("\n").find((l) => l.trim()) ?? draft.body,
    body: draft.body,
    receivedAt: TODAY.toISOString(),
    state: "waiting",
    direction: "outgoing",
  };

  // Sending a reply resolves any thread that was waiting on us.
  const updatedEmails = [
    ...shipment.emails.map((e) => (e.state === "needs-reply" ? { ...e, state: "answered" as const } : e)),
    outgoingEmail,
  ];

  const recipientLabel = action?.recipientLabel ?? "הצד הרלוונטי";
  const timelineTitle =
    action?.kind === "delayed"
      ? `נשלחה פנייה ל${recipientLabel} לאימות ETA מעודכן`
      : action?.kind === "missing-container"
        ? `נשלחה פנייה ל${recipientLabel} לבקשת מספר מכולה`
        : action?.kind === "no-response"
          ? `נשלח מעקב (Follow-up) ל${recipientLabel}`
          : action?.kind === "conflicting-eta"
            ? `נשלחה פנייה ל${recipientLabel} לאימות ה-ETA הנכון`
            : `נשלח מייל בנושא: ${draft.subject}`;

  const timelineEvent: TimelineEvent = {
    id: `email-${timelineIdCounter++}`,
    date: TODAY.toISOString(),
    title: timelineTitle,
    detail: `אל: ${draft.to}`,
    source: "email",
    sourceLabel: `מייל יוצא · ${shipment.owner}`,
  };

  const followUpTitle = `מעקב אחר תשובת ${recipientLabel}`;
  const hasOpenFollowUp = shipment.tasks.some((t) => t.title === followUpTitle && t.status !== "done");
  const followUpTask: MondayTask = {
    id: `task-${timelineIdCounter++}`,
    title: followUpTitle,
    owner: shipment.owner,
    status: "open",
    dueDate: daysFromToday(2),
  };
  const updatedTasks = hasOpenFollowUp ? shipment.tasks : [...shipment.tasks, followUpTask];

  const updatedShipment: Shipment = {
    ...shipment,
    emails: updatedEmails,
    timeline: [...shipment.timeline, timelineEvent],
    tasks: updatedTasks,
    lastUpdate: TODAY.toISOString(),
  };

  return shipments.map((s) => (s.id === shipmentId ? updatedShipment : s));
}

// Runs the pipeline for every not-yet-processed email once, in order — this
// is the "automatic processing" the real product would do the instant each
// update arrives. Used both to build the store's initial state (so the
// inbox is already triaged the moment the page renders — no manual
// "עיבוד עדכון" click required) and by the demo reset control.
function createInitialState(): { shipments: Shipment[]; emails: IncomingEmail[] } {
  let shipments = initialShipments;
  let emails = initialEmails;
  for (const e of initialEmails) {
    ({ shipments, emails } = runPipelineForEmail(shipments, emails, e.id));
  }
  return { shipments, emails };
}

export const useAppStore = create<AppState>((set, get) => ({
  ...createInitialState(),

  // Kept as a de-emphasized demo/testing control (see the "כלי דמו" toggle
  // on the inbox page) — in the connected product this never needs a manual
  // trigger, since createInitialState() above already runs it the moment
  // each update arrives.
  processEmailById: (id: string) =>
    set((state) => runPipelineForEmail(state.shipments, state.emails, id)),

  applyUpdate: (emailId: string) =>
    set((state) => {
      const email = state.emails.find((e) => e.id === emailId);
      if (!email || !email.suggestedUpdates?.length || !email.candidates?.length || email.candidates.length > 1) return state;
      const target = email.candidates[0];
      const shipment = state.shipments.find((s) => s.id === target.shipmentId);
      if (!shipment) return state;

      const { updatedShipment } = applyFieldUpdates(shipment, email, email.suggestedUpdates, {
        source: "email",
        fieldSourceLabel: `מייל · ‎${email.fromCompany}‎`,
        timelineSource: "ai",
        timelineSourceLabel: "עדכון AI (נסקר ואושר)",
        detail: `עודכן מתוך המייל: "${email.subject}"`,
        title: updateSummary(email.suggestedUpdates),
      });

      return {
        shipments: state.shipments.map((s) => (s.id === shipment.id ? updatedShipment : s)),
        emails: state.emails.map((e) => (e.id === emailId ? { ...e, applied: true } : e)),
      };
    }),

  dismissEmail: (emailId: string) =>
    set((state) => ({
      emails: state.emails.map((e) => (e.id === emailId ? { ...e, applied: true } : e)),
    })),

  // The only action that turns an AI-proposed "unknown event" into anything
  // real — nothing above this call has written to a shipment yet. Sarit's
  // click is what approves the interpretation (possibly after editing
  // finalAction) and is the sole trigger for: attaching the approved
  // exception to the shipment, logging a timeline event, and opening a
  // Monday follow-up task. No status change, no email, no Priority/Monday
  // field write — exactly the boundaries the AI fallback must respect.
  approveUnknownEvent: (emailId: string, finalAction: string) =>
    set((state) => {
      const email = state.emails.find((e) => e.id === emailId);
      if (!email || !email.unknownEvent || email.applied) return state;
      const topCandidate = email.candidates?.[0];
      if (!topCandidate) return state;
      const shipment = state.shipments.find((s) => s.id === topCandidate.shipmentId);
      if (!shipment) return state;

      const approvedEvent: UnknownEventInterpretation = {
        ...email.unknownEvent,
        suggestedAction: finalAction,
        status: "approved",
      };

      const event: TimelineEvent = {
        id: `ai-${timelineIdCounter++}`,
        date: TODAY.toISOString(),
        title: "זוהה אירוע תפעולי חדש (הצעת AI, אושרה ע\"י המשתמש)",
        detail: approvedEvent.summary,
        source: "ai",
        sourceLabel: "AI · נסקר ואושר",
      };

      const hasOpenTask = shipment.tasks.some((t) => t.title === finalAction && t.status !== "done");
      const followUpTask: MondayTask = {
        id: `task-${timelineIdCounter++}`,
        title: finalAction,
        owner: shipment.owner,
        status: "open",
        dueDate: daysFromToday(2),
      };

      const updatedShipment: Shipment = {
        ...shipment,
        aiFlaggedEvent: approvedEvent,
        timeline: [...shipment.timeline, event],
        tasks: hasOpenTask ? shipment.tasks : [...shipment.tasks, followUpTask],
        lastUpdate: TODAY.toISOString(),
      };

      return {
        shipments: state.shipments.map((s) => (s.id === shipment.id ? updatedShipment : s)),
        emails: state.emails.map((e) => (e.id === emailId ? { ...e, applied: true, unknownEvent: approvedEvent } : e)),
      };
    }),

  dismissUnknownEvent: (emailId: string) =>
    set((state) => ({
      emails: state.emails.map((e) => (e.id === emailId ? { ...e, applied: true } : e)),
    })),

  // Resolves an inbox email the pipeline couldn't confidently match on its
  // own (no match / ambiguous / low confidence) once Sarit picks the right
  // shipment by hand. Reuses the exact same extraction + conflict logic as
  // the automatic path (lib/ai-pipeline.ts resolveManualMatch) — matching
  // itself isn't re-decided here, only "which shipment", which only a human
  // can settle once the system itself couldn't. The email is then mirrored
  // into that shipment's thread and continues through the normal
  // pending-approval / needs-review workflow from there.
  linkEmailToShipment: (emailId: string, shipmentId: string) =>
    set((state) => {
      const email = state.emails.find((e) => e.id === emailId);
      const shipment = state.shipments.find((s) => s.id === shipmentId);
      if (!email || !shipment || email.applied) return state;

      const resolved = resolveManualMatch(email, shipment);
      const updatedEmail: IncomingEmail = {
        ...email,
        candidates: [{ shipmentId: shipment.id, poNumber: shipment.poNumber, confidence: 1, matchedOn: "נבחר ידנית" }],
        extracted: resolved.extracted,
        suggestedUpdates: resolved.suggestedUpdates,
        outcome: resolved.outcome,
        reviewReason: resolved.reviewReason,
        linkedShipmentId: shipment.id,
        // A manual pick can still land on "nothing to change" (e.g. no
        // ETA/container in the message) — that's resolved, not actionable,
        // same as the automatic path's own "confident match, nothing to
        // change" case.
        applied: resolved.outcome === "auto-updated",
      };

      const related = buildRelatedEmail(updatedEmail, resolved.outcome);
      return {
        emails: state.emails.map((e) => (e.id === emailId ? updatedEmail : e)),
        shipments: attachRelatedEmail(state.shipments, shipment.id, related),
      };
    }),

  // Reply flow triggered from an inbox card (as opposed to sendReply below,
  // triggered from Shipment 360's own "ביצוע" area) — same underlying write
  // (sendReplyPure), plus marking the originating inbox card as awaiting a
  // reply so it moves from "דורש טיפול" to "ממתין לתשובה" without being
  // marked fully resolved.
  replyToEmail: (emailId: string, draft: DraftEmail, action: RecommendedAction | null) =>
    set((state) => {
      const email = state.emails.find((e) => e.id === emailId);
      if (!email || !email.linkedShipmentId) return state;

      return {
        shipments: sendReplyPure(state.shipments, email.linkedShipmentId, draft, action),
        emails: state.emails.map((e) => (e.id === emailId ? { ...e, awaitingReply: true } : e)),
      };
    }),

  // The single action that demonstrates the connected workflow: one send
  // updates the email thread, the timeline, and the Monday follow-up in one
  // shot — the "unified operational picture" isn't just a read-time view,
  // writes fan out the same way.
  sendReply: (shipmentId: string, draft: DraftEmail, action: RecommendedAction | null) =>
    set((state) => ({ shipments: sendReplyPure(state.shipments, shipmentId, draft, action) })),

  // De-emphasized demo control (see the inbox page's "כלי דמו" toggle) — not
  // part of Sarit's normal workflow. Restores fresh mock data and re-runs
  // automatic processing, simulating "a new batch of updates just arrived."
  resetDemo: () => set(() => createInitialState()),

  getShipment: (id: string) => get().shipments.find((s) => s.id === id),
}));
