// Deterministic business rules. No AI involved: delay math, exception
// detection, and required-action text are all plain logic derived from
// structured shipment fields, per the assignment's guidance that structured
// data doesn't need an LLM.
import { Shipment, Exception } from "./types";
import { diffDays, TODAY, formatDate } from "./dates";
import { isPaymentOverdue, paymentOverdueDays } from "./finance";

export function delayDays(shipment: Shipment): number {
  if (!shipment.currentEta || !shipment.originalEta) return 0;
  const d = diffDays(shipment.currentEta.value, shipment.originalEta.value);
  return d > 0 ? d : 0;
}

// --------------------------------------------------------------------------
// Shared dashboard predicates — the single source of truth for every KPI
// card and its paired table filter. Each one is named after exactly what it
// means; a KPI and its filter must always call the SAME function here, never
// re-derive an equivalent-looking condition independently. That divergence
// is what caused KPI counts and filtered row counts to disagree before this
// fix (e.g. a delayed shipment arriving in 2 days was counted under "מגיעים
// השבוע" by one check but excluded by the other's mutually-exclusive status
// bucketing). Overlap between predicates (e.g. isDelayed AND
// isArrivingThisWeek both true for the same PO) is intentional, not a bug.
//
// effectiveStatus() below remains separate on purpose: it collapses a
// shipment into one display bucket for the status badge, where showing a
// single primary state per row is correct UX. It is not used for KPI/filter
// counting — those need the additive predicates here instead.
// --------------------------------------------------------------------------

export function isArrived(shipment: Shipment): boolean {
  return shipment.status === "arrived";
}

// "הזמנות פעילות" concept — any PO not yet arrived, regardless of
// production/transit stage. Not currently surfaced as its own KPI, but
// available as the broadest active-order predicate.
export function isActiveShipment(shipment: Shipment): boolean {
  return !isArrived(shipment);
}

// "משלוחים בדרך" — physically shipped (production complete) and not yet
// arrived. Deliberately INCLUDES delayed and arriving-soon shipments: they
// are still en route, just with an exception flag layered on top.
export function isInTransit(shipment: Shipment): boolean {
  return shipment.status !== "production" && !isArrived(shipment);
}

// "באיחור" — current ETA later than the original ETA, and not yet arrived
// (a historical delay on an arrived shipment is a fact, not an open issue —
// see the exclusion in getExceptions below for the same reasoning).
export function isDelayed(shipment: Shipment): boolean {
  return !isArrived(shipment) && delayDays(shipment) > 0;
}

// "מגיעים השבוע" — current ETA falls within the next 7 days (today
// included). This is the ONLY predicate used for that KPI and its filter;
// isArrivingSoon() below is a deliberately different, tighter 3-day window
// used solely for the "prepare for arrival now" exception nudge and the
// journey stepper's "at port" stage — a different operational question
// ("should Sarit act today?") from "what's arriving this week?".
export function isArrivingThisWeek(shipment: Shipment): boolean {
  if (!shipment.currentEta || isArrived(shipment)) return false;
  const days = diffDays(shipment.currentEta.value, TODAY.toISOString());
  return days >= 0 && days <= 7;
}

// Tighter 3-day "act now" window — used by the arriving-soon exception and
// the journey stepper only. Not used for the "מגיעים השבוע" KPI/filter.
export function isArrivingSoon(shipment: Shipment): boolean {
  if (!shipment.currentEta) return false;
  if (shipment.status === "arrived") return false;
  const days = diffDays(shipment.currentEta.value, TODAY.toISOString());
  return days >= 0 && days <= 3;
}

function hebrewDays(n: number): string {
  if (n === 1) return "יום אחד";
  if (n === 2) return "יומיים";
  return `${n} ימים`;
}

export function getExceptions(shipment: Shipment): Exception[] {
  const exceptions: Exception[] = [];

  // Once a shipment has arrived, a historical delay is a fact, not an open
  // issue — it shouldn't linger in Needs Attention forever. delayDays()
  // itself still returns the true figure for factual display elsewhere
  // (header badge, table column); only the actionable exception is gated.
  const delay = delayDays(shipment);
  if (delay > 0 && shipment.status !== "arrived") {
    exceptions.push({
      type: "delayed",
      severity: delay >= 5 ? "high" : "medium",
      message: `ה-ETA נדחה ב-${hebrewDays(delay)} מהתאריך המקורי.`,
      shortMessage: `ETA נדחה ב-${delay} ${delay === 1 ? "יום" : "ימים"}`,
      action:
        delay >= 5
          ? "יש לאמת את ה-ETA החדש מול חברת הספנות ולעדכן את הגורמים המושפעים בייצור ובמכירות."
          : "יש לוודא שה-ETA המעודכן מאושר במעקב חברת הספנות.",
      shortAction: "אימות ETA חדש",
    });
  }

  // Same reasoning: once arrived, a once-conflicting ETA is moot — we now
  // know the real outcome.
  if (shipment.conflictingEta && shipment.status !== "arrived") {
    exceptions.push({
      type: "conflicting-info",
      severity: "high",
      message: `חברת הספנות והמייל מדווחים על תאריכי ETA שונים (${formatDate(
        shipment.currentEta?.value ?? "",
        true
      )} מול ${formatDate(shipment.conflictingEta.value, true)}).`,
      shortMessage: "ETA סותר בין מקורות",
      action: "יש לבדוק את שני המקורות ולקבוע מהו ה-ETA הנכון.",
      shortAction: "בדיקת מידע סותר",
    });
  }

  // A shipment still in production hasn't shipped yet, so having no ETA is
  // expected, not an exception — only flag it once the order has actually
  // left the factory (or should have, per the original ETA).
  if (!shipment.currentEta && shipment.status !== "arrived" && shipment.status !== "production") {
    exceptions.push({
      type: "missing-eta",
      severity: "high",
      message: "לא התקבל ETA מאף מקור עדיין.",
      shortMessage: "ETA חסר",
      action: "יש לבדוק באתר המעקב של חברת הספנות או לפנות לעמיל המכס/מוביל.",
      shortAction: "בירור ETA חסר",
    });
  }

  if (
    !shipment.containerNumber &&
    shipment.status !== "production" &&
    shipment.status !== "arrived"
  ) {
    exceptions.push({
      type: "missing-container",
      severity: "medium",
      message: "מספר המכולה מעולם לא אושר לאחר היציאה מהנמל.",
      shortMessage: "מספר מכולה חסר",
      action: "יש לבקש את מספר המכולה מהספק או ממשלח הבינלאומי.",
      shortAction: "בקשת מספר מכולה",
    });
  }

  const waitingEmail = shipment.emails.find((e) => e.state === "waiting");
  if (waitingEmail) {
    exceptions.push({
      type: "waiting-for-response",
      severity: "low",
      message: `ממתינים לתשובה מ-${waitingEmail.fromCompany} מאז ${formatDate(waitingEmail.receivedAt, true)}.`,
      shortMessage: "ממתינים לתשובת ספק",
      action: "יש לפנות שוב לספק אם לא תתקבל תשובה תוך יומיים.",
      shortAction: "מעקב אחר ספק",
    });
  }

  if (isPaymentOverdue(shipment)) {
    const overdueDays = paymentOverdueDays(shipment);
    exceptions.push({
      type: "payment-overdue",
      severity: overdueDays >= 14 ? "high" : "medium",
      message: `תשלום להזמנה זו באיחור של ${hebrewDays(overdueDays)} מול מועד הפירעון.`,
      shortMessage: `תשלום באיחור ${overdueDays} ${overdueDays === 1 ? "יום" : "ימים"}`,
      action: "יש לבדוק את סטטוס התשלום מול הנהלת חשבונות ולוודא שאין השפעה על שחרור המשלוח.",
      shortAction: "בדיקת תשלום",
    });
  }

  // Business exception, same as payment-overdue: an open task past its due
  // date is a real problem regardless of shipment/transit status, so it's
  // not gated on shipment.status !== "arrived" the way transit exceptions
  // are. Picks the most overdue open task if more than one qualifies.
  const overdueTask = shipment.tasks
    .filter((t) => t.status !== "done" && diffDays(TODAY.toISOString(), t.dueDate) > 0)
    .sort((a, b) => diffDays(TODAY.toISOString(), b.dueDate) - diffDays(TODAY.toISOString(), a.dueDate))[0];
  if (overdueTask) {
    const overdueDays = diffDays(TODAY.toISOString(), overdueTask.dueDate);
    exceptions.push({
      type: "task-overdue",
      severity: overdueDays >= 3 ? "high" : "medium",
      message: `המשימה "${overdueTask.title}" באיחור של ${hebrewDays(overdueDays)} מתאריך היעד.`,
      shortMessage: `משימה באיחור ${overdueDays} ${overdueDays === 1 ? "יום" : "ימים"}`,
      action: `יש להשלים את המשימה "${overdueTask.title}" או לעדכן את תאריך היעד ב-Monday.`,
      shortAction: "השלמת משימה",
    });
  }

  // AI-flagged operational event — the one exception NOT derived from a
  // structured field. It only exists once a human has approved the AI's
  // interpretation in the inbox (lib/store.ts approveUnknownEvent); until
  // then the shipment has no exception from this at all. Once approved, it
  // is treated exactly like any other exception from here on — same list,
  // same severity sort, same Needs Attention / KPI predicates.
  if (shipment.aiFlaggedEvent && shipment.aiFlaggedEvent.status === "approved") {
    const ev = shipment.aiFlaggedEvent;
    exceptions.push({
      type: "ai-needs-review",
      severity: ev.confidenceLevel === "high" ? "high" : "medium",
      message: ev.summary,
      shortMessage: "אירוע תפעולי לא מוכר",
      action: ev.suggestedAction ?? "לא ניתן לקבוע פעולה בביטחון — נדרשת בדיקה ידנית.",
      shortAction: "בדיקה ואישור פעולה",
    });
  }

  if (isArrivingSoon(shipment) && shipment.status !== "delayed") {
    exceptions.push({
      type: "arriving-soon",
      severity: "low",
      message: "המשלוח צפוי להגיע בתוך 3 הימים הקרובים.",
      shortMessage: "מגיע בקרוב",
      action: "יש לוודא מסמכי מכס ולתאם מקום קבלה במחסן.",
      shortAction: "הכנה לקבלת משלוח",
    });
  }

  return exceptions.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function severityRank(s: Exception["severity"]): number {
  return s === "high" ? 2 : s === "medium" ? 1 : 0;
}

export function needsAttention(shipment: Shipment): boolean {
  return getExceptions(shipment).some((e) => e.severity === "high" || e.severity === "medium");
}

export function requiredAction(shipment: Shipment): string {
  const exceptions = getExceptions(shipment);
  if (exceptions.length === 0) return "אין צורך בפעולה — הכול תקין.";
  return exceptions[0].action;
}

export function shortRequiredAction(shipment: Shipment): string {
  const exceptions = getExceptions(shipment);
  if (exceptions.length === 0) return "אין צורך בפעולה";
  return exceptions[0].shortAction;
}

export function statusLabel(status: Shipment["status"]): string {
  switch (status) {
    case "production":
      return "בייצור";
    case "in-transit":
      return "בדרך";
    case "arriving-soon":
      return "מגיע בקרוב";
    case "arrived":
      return "הגיע";
    case "delayed":
      return "באיחור";
  }
}

export function effectiveStatus(shipment: Shipment): Shipment["status"] {
  if (shipment.status === "arrived") return "arrived";
  if (delayDays(shipment) > 0) return "delayed";
  if (isArrivingSoon(shipment)) return "arriving-soon";
  return shipment.status;
}

// --------------------------------------------------------------------------
// Operational state — a display-only concept, separate from lifecycle
// status (see lib/journey.ts) and separate from the raw ShipmentStatus enum.
// A shipment's lifecycle position ("where is it") should never change just
// because it also has an open problem ("is it OK") — effectiveStatus() above
// conflates the two into one badge value, which is exactly the ambiguity
// this function exists to remove for display. It reads the SAME
// getExceptions() top exception used everywhere else (required action,
// exception banners), so it can never disagree with those.
// --------------------------------------------------------------------------

export type OperationalState =
  | "ok"
  | "attention"
  | "missing-info"
  | "delayed"
  | "conflicting"
  | "waiting-response"
  | "needs-review";

export function operationalState(shipment: Shipment): OperationalState {
  const top = getExceptions(shipment)[0];
  // No exception, or the only exception is the low-severity "arriving soon"
  // heads-up (not an actual problem) — nothing wrong operationally.
  if (!top || top.type === "arriving-soon") return "ok";

  switch (top.type) {
    case "delayed":
      return "delayed";
    case "conflicting-info":
      return "conflicting";
    case "missing-eta":
    case "missing-container":
      return "missing-info";
    case "waiting-for-response":
      return "waiting-response";
    case "ai-needs-review":
      return "needs-review";
    case "payment-overdue":
    case "task-overdue":
      return "attention";
  }
}

export function operationalStateLabel(state: OperationalState): string {
  switch (state) {
    case "ok":
      return "תקין";
    case "attention":
      return "דורש טיפול";
    case "missing-info":
      return "מידע חסר";
    case "delayed":
      return "באיחור";
    case "conflicting":
      return "מידע סותר";
    case "waiting-response":
      return "ממתין לתשובה";
    case "needs-review":
      return "נדרשת בדיקה";
  }
}
