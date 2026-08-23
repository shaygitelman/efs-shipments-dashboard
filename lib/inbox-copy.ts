// Plain-language layer for the "עדכונים נכנסים" screen. This file makes NO
// decisions — it only reads fields the pipeline (lib/ai-pipeline.ts) already
// produced (outcome, reviewReason, suggestedUpdates, candidates) and turns
// them into sentences a non-technical user can understand in a few seconds.
// Nothing here can change what outcome an email gets or what a click does —
// it is a pure presentation/copy layer sitting on top of the untouched
// pipeline.
import { IncomingEmail, MatchCandidate, ProcessingOutcome, Shipment, SuggestedUpdate } from "./types";
import { formatDate } from "./dates";

export function isDateLike(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(v);
}

export function formatFieldValue(v: string | null): string {
  if (!v) return "לא הוגדר";
  return isDateLike(v) ? formatDate(v) : v;
}

// Human-readable stand-in for a raw confidence score. Bands line up with the
// pipeline's own thresholds (lib/ai-pipeline.ts REVIEW_CONFIDENCE_FLOOR /
// AUTO_CONFIDENCE_FLOOR) purely so the word never disagrees with what the
// system actually decided — this does not feed back into that decision.
export function confidenceLabel(score: number): string {
  if (score >= 0.9) return "התאמה ודאית";
  if (score >= 0.7) return "התאמה טובה";
  return "התאמה לא ודאית";
}

export const SIMPLE_OUTCOME_COPY: Record<ProcessingOutcome, { label: string; sublabel: string }> = {
  "auto-updated": { label: "טופל אוטומטית", sublabel: "אין צורך בפעולה" },
  "pending-approval": { label: "נדרש אישור", sublabel: "בדקי את השינוי ואשרי אם הוא נכון" },
  "needs-review": { label: "נדרשת בדיקה", sublabel: "המערכת לא הצליחה לקבוע בוודאות" },
  irrelevant: { label: "לא רלוונטי", sublabel: "אין צורך בפעולה" },
};

// Exact-string lookup, not fuzzy matching: lib/ai-pipeline.ts produces one of
// a small, fixed set of reviewReason strings, so mapping each one exactly is
// more robust than pattern-matching substrings. Anything unmapped (should
// never happen) just falls back to the raw reason rather than showing
// nothing.
const SIMPLE_REVIEW_REASON: Record<string, string> = {
  "אירוע תפעולי לא מוכר — לא נמצא חוק קיים שתואם":
    "יש כאן דיווח על בעיה תפעולית שהמערכת לא מזהה אוטומטית. יש לבדוק ולהחליט מה לעשות.",
  "לא נמצא משלוח מתאים": "לא הצלחנו לשייך את העדכון הזה לאף הזמנה קיימת. יש לבדוק ידנית למי הוא שייך.",
  "התאמה לא חד-משמעית — מספר הזמנות פתוחות אפשריות":
    "העדכון הזה יכול להתאים ליותר מהזמנה אחת. יש לבדוק ולבחור את ההזמנה הנכונה.",
  "רמת ביטחון נמוכה מדי לפעולה אוטומטית": "המערכת לא בטוחה מספיק בהתאמה כדי לפעול לבד. יש לבדוק ולאשר ידנית.",
  "העדכון ישן יותר מהנתון הקיים במערכת — לא בוצע עדכון אוטומטי":
    "כבר קיים במערכת מידע חדש יותר מזה שהתקבל עכשיו. יש לבדוק איזה מידע נכון.",
  "לא ניתן היה לאמת את עדכניות המידע בביטחון — נדרשת בדיקה ידנית":
    "לא ניתן היה לוודא שהמידע עדכני. יש לבדוק ידנית לפני שמעדכנים.",
  "מידע סותר — קיים כבר ערך ממקור מהימן יותר":
    "המידע שהתקבל סותר מידע קיים ממקור מהימן יותר (למשל חברת הספנות). יש לבדוק איזה מידע נכון.",
};

export function simplifyReviewReason(reason: string | undefined): string {
  if (!reason) return "נדרשת בדיקה ידנית.";
  return SIMPLE_REVIEW_REASON[reason] ?? reason;
}

// The 3 reviewReason strings that mean "we don't know WHICH shipment this
// is about" — these route to the shipment-picker card. Everything else
// means matching succeeded but there's a data-level issue (conflict, stale,
// unknown event) — those route to the conflict/unknown-event cards instead.
const MATCHING_UNCERTAIN_REASONS = new Set([
  "לא נמצא משלוח מתאים",
  "התאמה לא חד-משמעית — מספר הזמנות פתוחות אפשריות",
  "רמת ביטחון נמוכה מדי לפעולה אוטומטית",
]);

export function isMatchingUncertain(reason: string | undefined): boolean {
  return !!reason && MATCHING_UNCERTAIN_REASONS.has(reason);
}

const CONFLICT_LIKE_REASON = "מידע סותר — קיים כבר ערך ממקור מהימן יותר";
const STALE_REASONS = new Set([
  "העדכון ישן יותר מהנתון הקיים במערכת — לא בוצע עדכון אוטומטי",
  "לא ניתן היה לאמת את עדכניות המידע בביטחון — נדרשת בדיקה ידנית",
]);

export function isConflictLike(reason: string | undefined): boolean {
  return reason === CONFLICT_LIKE_REASON || (!!reason && STALE_REASONS.has(reason));
}

function fieldChangeLabel(updates: SuggestedUpdate[]): string {
  const hasEta = updates.some((u) => u.field === "currentEta");
  const hasContainer = updates.some((u) => u.field === "containerNumber");
  if (hasEta && hasContainer) return "עדכון פרטי משלוח";
  if (hasEta) return "שינוי בתאריך ההגעה";
  if (hasContainer) return "התקבל מספר מכולה";
  return "עדכון בהזמנה";
}

// Short phrase for a conflict/stale needs-review case — shared by the card
// headline (whatHappenedHeadline) and the card's "found" section label
// (conflictFoundLabel), so both name the same situation.
export function conflictHeadlineSuffix(reason: string | undefined): string {
  return reason === CONFLICT_LIKE_REASON ? "מידע סותר לגבי ETA" : "עדכון שאינו מעודכן";
}

export function conflictFoundLabel(reason: string | undefined): string {
  return reason === CONFLICT_LIKE_REASON ? "נמצאה סתירה" : "מידע לא מעודכן";
}

// "מה קרה?" — the card's headline. PO-first, "·" separated, since that's
// what Sarit actually recognizes — never the raw email subject or the
// sender's name as the lead.
export function whatHappenedHeadline(email: IncomingEmail, matchedShipment: Shipment | undefined, isAmbiguous: boolean): string {
  if (email.outcome === "irrelevant") return "תוכן לא קשור למשלוחים";
  if (email.unknownEvent) {
    return matchedShipment ? `${matchedShipment.poNumber} · אירוע לא מוכר` : `${email.fromCompany} · אירוע לא מוכר`;
  }
  if (isAmbiguous) return `${email.fromCompany} — לא ברור לאיזו הזמנה זה שייך`;
  if (!matchedShipment) return `${email.fromCompany} — לא נמצאה הזמנה מתאימה`;
  if (isConflictLike(email.reviewReason)) {
    return `${matchedShipment.poNumber} · ${conflictHeadlineSuffix(email.reviewReason)}`;
  }
  if (email.suggestedUpdates?.length) {
    return `${matchedShipment.poNumber} · ${fieldChangeLabel(email.suggestedUpdates)}`;
  }
  return `${matchedShipment.poNumber} · עדכון התקבל`;
}

// "מה המערכת מצאה?" — one plain sentence, old→new folded in directly
// instead of a separate technical table (that table still exists, just
// moved into "פרטים נוספים").
export function whatSystemFound(
  email: IncomingEmail,
  matchedShipment: Shipment | undefined,
  candidates: MatchCandidate[]
): string {
  if (email.unknownEvent) return email.unknownEvent.summary;

  const updates = email.suggestedUpdates ?? [];
  if (updates.length > 0) {
    const parts = updates.map((u) => {
      if (u.field === "currentEta") {
        return u.currentValue
          ? `ה-ETA השתנה מ-${formatFieldValue(u.currentValue)} ל-${formatFieldValue(u.suggestedValue)}`
          : `נמסר ETA חדש: ${formatFieldValue(u.suggestedValue)}`;
      }
      if (u.field === "containerNumber") {
        return u.currentValue
          ? `מספר המכולה השתנה מ-${u.currentValue} ל-${u.suggestedValue}`
          : `נמסר מספר מכולה: ${u.suggestedValue}`;
      }
      return "פרט במשלוח עודכן";
    });
    return `התקבל עדכון מ-${email.fromCompany}: ${parts.join(", ")}.`;
  }

  if (candidates.length > 1) {
    return `התקבל מייל מ-${email.fromCompany}, שיכול להתאים ליותר מהזמנה פתוחה אחת.`;
  }
  if (!matchedShipment) {
    return `התקבל מייל מ-${email.fromCompany}, אך לא נמצאה הזמנה מתאימה במערכת.`;
  }
  return `התקבל מייל מ-${email.fromCompany} בנוגע להזמנה ${matchedShipment.poNumber}, ללא שינוי בפרטי המשלוח.`;
}

// "מה נדרש ממך?"
export function whatYouNeedToDo(email: IncomingEmail): string {
  switch (email.outcome) {
    case "pending-approval":
      return "לאשר את העדכון או להשיב לספק.";
    case "needs-review":
      if (isMatchingUncertain(email.reviewReason)) {
        return "לא הצלחנו לזהות בוודאות לאיזה משלוח העדכון שייך. בחרי את ההזמנה הנכונה כדי להמשיך.";
      }
      if (isConflictLike(email.reviewReason)) {
        return "בדקי איזה תאריך נכון לפני עדכון המשלוח.";
      }
      return simplifyReviewReason(email.reviewReason);
    case "auto-updated":
      return "אין צורך בפעולה — הכול טופל אוטומטית.";
    case "irrelevant":
      return "אין צורך בפעולה.";
    default:
      return "";
  }
}
