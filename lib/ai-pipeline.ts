// Simulated AI email-intake pipeline.
//
// This is deliberately NOT a live LLM call: the assignment explicitly says
// simulating the pipeline is acceptable, and a hard dependency on an API key
// would make the demo fragile for anyone running it without credentials.
// The steps mirror what a real pipeline would do: classify -> extract ->
// match against known identifiers first (deterministic) -> fall back to
// fuzzy supplier/product matching only when needed -> surface confidence ->
// propose (never silently apply) an update.
//
// processEmail() is triggered by a manual "עיבוד עדכון" click in this demo
// (components/inbox/email-card.tsx) purely so the pipeline's stages are
// visible to a reviewer. That click is a demo device, not a product
// requirement — in a connected system this would run automatically the
// moment a new update is received (webhook / inbox poll / API push), with
// no user action involved before the four triage outcomes below are
// decided.
import {
  IncomingEmail,
  EmailClassification,
  ExtractedFields,
  MatchCandidate,
  SuggestedUpdate,
  Shipment,
  ConfidenceLevel,
  UnknownEventInterpretation,
  ProcessingOutcome,
} from "./types";
import { daysFromToday } from "./dates";

const PO_REGEX = /PO-\d{3,6}/i;
const CONTAINER_REGEX = /\b[A-Z]{4}\d{6,7}\b/;
const IN_DAYS_REGEX = /in (\d+) days?/i;

// --------------------------------------------------------------------------
// "Trusted carrier source" — DEMO SIMULATION ONLY.
//
// isKnownCarrier() below decides trust by matching the email's free-text
// display name (fromCompany) against a short list of real shipping lines.
// That is NOT what makes a source trustworthy in production — a display
// name is trivially spoofable and proves nothing about where a message
// actually came from. This check stands in for what a real integration
// would use instead:
//   - a carrier API / EDI feed (e.g. an ETA push from MSC's own tracking
//     system, received over an authenticated integration, not email), or
//   - a verified, authenticated sender identity (SPF/DKIM/DMARC-passing
//     domain tied to a known carrier, or an OAuth-authenticated mailbox
//     integration) — never the header's display name alone.
//
// No such authentication integration exists in this demo (out of scope per
// the assignment), so isKnownCarrier() is the closest safe simulation: it
// still requires a deterministic identifier match (exact PO/container) and
// a high confidence floor before anything is auto-applied, but the identity
// check itself is a placeholder, not a security boundary. A production
// build MUST replace this function's body with a real trust check before
// auto-applying anything from it.
// --------------------------------------------------------------------------
const KNOWN_CARRIERS = ["MSC", "COSCO", "Maersk", "CMA CGM", "Evergreen", "OOCL", "Hapag-Lloyd"];

function isKnownCarrier(companyName: string): boolean {
  return KNOWN_CARRIERS.some((c) => c.toLowerCase() === companyName.toLowerCase());
}

function classify(email: IncomingEmail): EmailClassification {
  const text = `${email.subject} ${email.body}`.toLowerCase();
  const isReply = email.subject.toLowerCase().startsWith("re:");

  // Most specific / deterministic signals first, so a stray apology in a
  // routine confirmation email doesn't get swept into "delay-exception".
  if (text.includes("unsubscribe") || text.includes("newsletter") || text.includes("report on")) {
    return "irrelevant";
  }
  // Doesn't fit delay / document / supplier-response — a genuine operational
  // event none of the deterministic rules were written to recognize. This is
  // the one case this demo routes to the AI-assisted fallback (see
  // interpretUnknownEvent below) instead of "shipping-update".
  if (text.includes("customs") && (text.includes("hold") || text.includes("held"))) {
    return "unknown-event";
  }
  if (isReply && text.includes("confirm")) {
    return "supplier-response";
  }
  if (text.includes("container:") || text.includes("container number")) {
    return "document";
  }
  if (text.includes("delay") || text.includes("congestion") || text.includes("shortage") || text.includes("inconvenience")) {
    return "delay-exception";
  }
  return "shipping-update";
}

function extract(email: IncomingEmail): ExtractedFields {
  const text = `${email.subject}\n${email.body}`;
  const poMatch = text.match(PO_REGEX);
  const containerMatch = text.match(CONTAINER_REGEX);
  const daysMatch = text.match(IN_DAYS_REGEX);

  const fields: ExtractedFields = {
    supplier: email.fromCompany,
  };
  if (poMatch) fields.poNumber = poMatch[0].toUpperCase();
  if (containerMatch) fields.containerNumber = containerMatch[0];
  if (daysMatch) fields.eta = daysFromToday(parseInt(daysMatch[1], 10));
  if (/departed/i.test(text)) fields.event = "יצא מנמל המוצא";
  if (/production will complete|ship-ready/i.test(text)) fields.event = "תאריך ייצור/משלוח עודכן";
  if (/booking is confirmed/i.test(text)) fields.event = "הזמנת המכולה אושרה";
  if (/heading to the port|loading/i.test(text)) fields.event = "בדרך לנמל, טרם נטען";

  const originMatch = text.match(/departed ([A-Za-z ]+?)(?:\s+this morning| aboard|\.|,|\n)/i);
  if (originMatch) fields.origin = originMatch[1].trim();

  return fields;
}

function findCandidates(email: IncomingEmail, extracted: ExtractedFields, shipments: Shipment[]): MatchCandidate[] {
  // 1. Deterministic: PO number is an exact identifier.
  if (extracted.poNumber) {
    const exact = shipments.find((s) => s.poNumber.toUpperCase() === extracted.poNumber);
    if (exact) {
      return [{ shipmentId: exact.id, poNumber: exact.poNumber, confidence: 0.97, matchedOn: "מספר PO במייל" }];
    }
  }

  // 2. Deterministic: container number.
  if (extracted.containerNumber) {
    const exact = shipments.find((s) => s.containerNumber?.value === extracted.containerNumber);
    if (exact) {
      return [{ shipmentId: exact.id, poNumber: exact.poNumber, confidence: 0.95, matchedOn: "מספר מכולה" }];
    }
  }

  // 3. Fuzzy fallback: supplier name only. Ambiguous when several open
  // shipments share the same supplier with no other distinguishing detail.
  const bySupplier = shipments.filter(
    (s) => s.supplier.toLowerCase() === email.fromCompany.toLowerCase() && s.status !== "arrived"
  );
  if (bySupplier.length === 1) {
    return [{ shipmentId: bySupplier[0].id, poNumber: bySupplier[0].poNumber, confidence: 0.72, matchedOn: "שם ספק (הזמנה פתוחה יחידה)" }];
  }
  if (bySupplier.length > 1) {
    // Rank by recency of PO creation as a weak signal, split confidence.
    const sorted = [...bySupplier].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const total = sorted.length;
    return sorted.map((s, i) => ({
      shipmentId: s.id,
      poNumber: s.poNumber,
      confidence: Math.round(((total - i) / ((total * (total + 1)) / 2)) * 65) / 100,
      matchedOn: "שם ספק בלבד (לא חד-משמעי — מספר הזמנות פתוחות)",
    }));
  }

  return [];
}

function buildSuggestedUpdates(
  extracted: ExtractedFields,
  shipment: Shipment | undefined,
  classification: EmailClassification
): SuggestedUpdate[] {
  if (!shipment || classification === "irrelevant") return [];

  const updates: SuggestedUpdate[] = [];

  if (extracted.containerNumber && !shipment.containerNumber) {
    updates.push({
      field: "containerNumber",
      label: "מספר מכולה",
      currentValue: null,
      suggestedValue: extracted.containerNumber,
    });
  }
  if (extracted.eta) {
    updates.push({
      field: "currentEta",
      label: "ETA נוכחי",
      currentValue: shipment.currentEta?.value ?? null,
      suggestedValue: extracted.eta,
    });
  }
  return updates;
}

// Source-of-truth guard: an update is only safe to trust when it doesn't
// contradict a field the shipment already has on record FROM a more
// authoritative source. Carrier is authoritative for ETA/container — if the
// shipment's current value for either already came from the carrier and
// this message proposes something different, that's a genuine conflict
// between sources, not just "new information".
//
// Deliberately NOT the check for "the carrier revising its own earlier
// value" — that's a different, expected situation (see processEmail below,
// which only calls this for messages that are NOT from the same trusted
// carrier already on file). A same-source revision is gated on freshness
// alone via checkFreshness(), never routed through this conflict check.
function hasAuthorityConflict(shipment: Shipment, updates: SuggestedUpdate[]): boolean {
  return updates.some((u) => {
    if (u.field === "currentEta") {
      return shipment.currentEta?.source === "carrier" && shipment.currentEta.value !== u.suggestedValue;
    }
    if (u.field === "containerNumber") {
      return shipment.containerNumber?.source === "carrier" && shipment.containerNumber.value !== u.suggestedValue;
    }
    return false;
  });
}

// --------------------------------------------------------------------------
// Freshness guard — a trusted, structured source is still not safe to
// auto-apply if the update itself is older than what's already on file: an
// out-of-order or delayed message must never overwrite a later carrier
// confirmation, even from the same carrier. This only compares against a
// field that's already carrier-sourced (the same authority this update
// would need to supersede) — a stale message can't invalidate an existing
// carrier value it never even competed with.
//
// `email.receivedAt` stands in, in this simulation, for the carrier feed's
// own event/update timestamp — a real API/EDI integration would carry its
// own source timestamp rather than relying on inbox arrival time.
// --------------------------------------------------------------------------
type Freshness = "fresh" | "stale" | "indeterminate";

function checkFreshness(shipment: Shipment, updates: SuggestedUpdate[], incomingTimestamp: string): Freshness {
  const incoming = Date.parse(incomingTimestamp);
  if (Number.isNaN(incoming)) return "indeterminate";

  for (const u of updates) {
    const existing =
      u.field === "currentEta" && shipment.currentEta?.source === "carrier"
        ? shipment.currentEta
        : u.field === "containerNumber" && shipment.containerNumber?.source === "carrier"
          ? shipment.containerNumber
          : null;
    if (!existing) continue; // nothing carrier-sourced on file yet -> nothing to be stale against

    const existingTime = Date.parse(existing.updatedAt);
    if (Number.isNaN(existingTime)) return "indeterminate";
    if (incoming < existingTime) return "stale";
  }
  return "fresh";
}

// --------------------------------------------------------------------------
// AI-assisted fallback for "unknown-event" emails — the long tail the
// deterministic rule engine above was never written to recognize. This is a
// deterministic SIMULATION of what a real model call would return (same
// "simulate, don't fabricate" approach as the rest of this pipeline, see the
// file header) — not a live inference, so the confidence score below is a
// stand-in, not a measured probability. It never touches a Shipment; it only
// produces a proposal that a human must approve (lib/store.ts
// approveUnknownEvent) before anything is written.
// --------------------------------------------------------------------------

const UNKNOWN_EVENT_SIGNALS: { pattern: RegExp; weight: number }[] = [
  { pattern: /customs/i, weight: 0.2 },
  { pattern: /\bhold\b|\bheld\b/i, weight: 0.15 },
  { pattern: /document|documentation|paperwork/i, weight: 0.13 },
];

function unknownEventConfidenceScore(text: string): number {
  let score = 0.3;
  for (const s of UNKNOWN_EVENT_SIGNALS) {
    if (s.pattern.test(text)) score += s.weight;
  }
  return Math.min(0.95, Math.round(score * 100) / 100);
}

function confidenceLevelFor(score: number): ConfidenceLevel {
  if (score >= 0.7) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}

function summarizeUnknownEvent(text: string): string {
  if (/customs/i.test(text) && /hold|held/i.test(text)) {
    return "המשלוח נעצר במכס עקב מסמכי יבוא חסרים.";
  }
  // Generic fallback for the long tail beyond the one scenario this demo
  // exercises — still routed here rather than silently ignored or forced
  // into an existing rule.
  return "זוהה אירוע תפעולי שאינו תואם לאף חוק קיים במערכת.";
}

function suggestActionForUnknownEvent(text: string, level: ConfidenceLevel): string | null {
  if (level === "low") return null;
  if (/customs/i.test(text) && /hold|held/i.test(text)) {
    return "בירור מול המשלח / עמיל המכס אילו מסמכים חסרים.";
  }
  return "בדיקה ידנית של האירוע מול הספק/המשלח.";
}

function interpretUnknownEvent(email: IncomingEmail): UnknownEventInterpretation {
  const text = `${email.subject} ${email.body}`;
  const score = unknownEventConfidenceScore(text);
  const level = confidenceLevelFor(score);
  return {
    summary: summarizeUnknownEvent(text),
    suggestedAction: suggestActionForUnknownEvent(text, level),
    confidenceLevel: level,
    confidenceScore: level === "low" ? null : score,
    status: "pending",
  };
}

export interface ProcessedEmail {
  classification: EmailClassification;
  extracted: ExtractedFields;
  candidates: MatchCandidate[];
  suggestedUpdates: SuggestedUpdate[];
  unknownEvent?: UnknownEventInterpretation;
  outcome: ProcessingOutcome;
  reviewReason?: string;
}

// --------------------------------------------------------------------------
// The workflow decision. This is the single place that decides "does Sarit
// need to look at this" — everything else in this file only gathers the
// evidence (classification, extracted fields, candidate matches). Order
// matters: each check below is a reason a message CANNOT be safely
// automated, evaluated from most to least certain, so the first one that
// applies wins.
//
//   irrelevant                      -> filtered, never shown as work
//   unknown event                   -> no rule covers this, always review
//   no / ambiguous match            -> can't safely act without certainty
//   confidence too low              -> ditto
//   conflicts a more-authoritative
//     source's value on file        -> never silently overwritten
//   known carrier + high confidence
//     but the update is stale (or
//     freshness can't be verified)  -> never silently overwritten either
//   known carrier + high confidence
//     + verified fresh              -> trusted structured source, auto-apply
//   anything else with a proposed
//     field change                  -> strong match, but email/supplier is
//                                       not authoritative -> needs approval
//   confident match, nothing to
//     change                        -> nothing for Sarit to decide, filed
// --------------------------------------------------------------------------
const REVIEW_CONFIDENCE_FLOOR = 0.7; // below this, a single match still isn't "strong"
const AUTO_CONFIDENCE_FLOOR = 0.9; // automation needs to be very sure, not just "sure enough for a human to check"

export function processEmail(email: IncomingEmail, shipments: Shipment[]): ProcessedEmail {
  const classification = classify(email);

  if (classification === "irrelevant") {
    return { classification, extracted: {}, candidates: [], suggestedUpdates: [], outcome: "irrelevant" };
  }

  if (classification === "unknown-event") {
    // No structured extraction applies here (that's the point) — matching
    // still runs so the AI's proposal can be tied to a shipment, but the
    // deterministic rule engine's field-update machinery is bypassed
    // entirely: an AI-fallback proposal never suggests a structured field
    // change, only an exception + action, and only once approved.
    const candidates = findCandidates(email, { supplier: email.fromCompany }, shipments);
    return {
      classification,
      extracted: {},
      candidates,
      suggestedUpdates: [],
      unknownEvent: interpretUnknownEvent(email),
      outcome: "needs-review",
      reviewReason: "אירוע תפעולי לא מוכר — לא נמצא חוק קיים שתואם",
    };
  }

  const extracted = extract(email);
  const candidates = findCandidates(email, extracted, shipments);

  if (candidates.length === 0) {
    return { classification, extracted, candidates, suggestedUpdates: [], outcome: "needs-review", reviewReason: "לא נמצא משלוח מתאים" };
  }
  if (candidates.length > 1) {
    return {
      classification,
      extracted,
      candidates,
      suggestedUpdates: [],
      outcome: "needs-review",
      reviewReason: "התאמה לא חד-משמעית — מספר הזמנות פתוחות אפשריות",
    };
  }

  const top = candidates[0];
  if (top.confidence < REVIEW_CONFIDENCE_FLOOR) {
    return {
      classification,
      extracted,
      candidates,
      suggestedUpdates: [],
      outcome: "needs-review",
      reviewReason: "רמת ביטחון נמוכה מדי לפעולה אוטומטית",
    };
  }

  const shipment = shipments.find((s) => s.id === top.shipmentId);
  const updates = buildSuggestedUpdates(extracted, shipment, classification);

  if (updates.length === 0) {
    // Confident, unambiguous match — but nothing to change. Nothing here
    // requires Sarit's judgment, so it's filed rather than surfaced.
    return { classification, extracted, candidates, suggestedUpdates: updates, outcome: "auto-updated" };
  }

  // "Same authoritative source, newer information" is a revision, not a
  // conflict — it must never be evaluated by hasAuthorityConflict, which
  // exists specifically for a DIFFERENT (lower-authority) source disagreeing
  // with what the carrier already confirmed. A carrier updating its own
  // earlier value is expected, routine behavior; only freshness decides
  // whether THIS specific message is safe to trust.
  if (shipment && isKnownCarrier(email.fromCompany) && top.confidence >= AUTO_CONFIDENCE_FLOOR) {
    const freshness = checkFreshness(shipment, updates, email.receivedAt);
    if (freshness === "fresh") {
      return { classification, extracted, candidates, suggestedUpdates: updates, outcome: "auto-updated" };
    }
    return {
      classification,
      extracted,
      candidates,
      suggestedUpdates: updates,
      outcome: "needs-review",
      reviewReason:
        freshness === "stale"
          ? "העדכון ישן יותר מהנתון הקיים במערכת — לא בוצע עדכון אוטומטי"
          : "לא ניתן היה לאמת את עדכניות המידע בביטחון — נדרשת בדיקה ידנית",
    };
  }

  // Everything past this point is NOT from the same trusted carrier that
  // owns the field's current value, so a disagreement here really is a
  // cross-source conflict — never silently overwritten.
  if (shipment && hasAuthorityConflict(shipment, updates)) {
    return {
      classification,
      extracted,
      candidates,
      suggestedUpdates: updates,
      outcome: "needs-review",
      reviewReason: "מידע סותר — קיים כבר ערך ממקור מהימן יותר",
    };
  }

  return { classification, extracted, candidates, suggestedUpdates: updates, outcome: "pending-approval" };
}

export interface ManualMatchResult {
  extracted: ExtractedFields;
  suggestedUpdates: SuggestedUpdate[];
  outcome: ProcessingOutcome;
  reviewReason?: string;
}

// Resolves the "which shipment is this about" question by hand, for the one
// case the pipeline above can't decide on its own (no match / ambiguous
// match / confidence too low — see processEmail's needs-review branches).
// Sarit has already told us which shipment, so all that's left is the same
// extraction + conflict logic the automatic path uses for a single confident
// candidate — reused verbatim, not reimplemented. Deliberately skips the
// auto-apply (isKnownCarrier) branch: a match that required a human to
// resolve is never eligible for silent auto-apply, only pending-approval or
// a conflict review, exactly like any other non-carrier source.
export function resolveManualMatch(email: IncomingEmail, shipment: Shipment): ManualMatchResult {
  if (email.classification === "unknown-event") {
    return { extracted: {}, suggestedUpdates: [], outcome: "needs-review", reviewReason: email.reviewReason };
  }

  const extracted = email.extracted ?? extract(email);
  const updates = buildSuggestedUpdates(extracted, shipment, email.classification ?? "shipping-update");

  if (updates.length === 0) {
    return { extracted, suggestedUpdates: updates, outcome: "auto-updated" };
  }
  if (hasAuthorityConflict(shipment, updates)) {
    return { extracted, suggestedUpdates: updates, outcome: "needs-review", reviewReason: "מידע סותר — קיים כבר ערך ממקור מהימן יותר" };
  }
  return { extracted, suggestedUpdates: updates, outcome: "pending-approval" };
}

export function outcomeLabel(o: ProcessingOutcome): string {
  switch (o) {
    case "auto-updated":
      return "עודכן אוטומטית";
    case "pending-approval":
      return "ממתין לאישור";
    case "needs-review":
      return "נדרשת בדיקה";
    case "irrelevant":
      return "לא רלוונטי";
  }
}

export function classificationLabel(c: EmailClassification): string {
  switch (c) {
    case "shipping-update":
      return "עדכון משלוח";
    case "document":
      return "מסמך";
    case "delay-exception":
      return "עיכוב / חריגה";
    case "supplier-response":
      return "תשובת ספק";
    case "unknown-event":
      return "אירוע לא מוכר";
    case "irrelevant":
      return "לא רלוונטי";
  }
}
