// "מה השתנה היום" — a compact morning digest, answering a different question
// from Needs Attention (lib/rules.ts getExceptions/needsAttention): not "what
// requires action" but "what new information entered the system." Reuses the
// exact same processed-email state that already drives Incoming Updates —
// no parallel event log, no new store field, no new business logic. A change
// can be fully auto-handled and still belong here (see the awaitingReply /
// auto-updated cases below), which is the whole point of the distinction.
import { IncomingEmail, Shipment } from "./types";
import { whatSystemFound, isMatchingUncertain, isConflictLike } from "./inbox-copy";

export interface DigestItem {
  emailId: string;
  shipmentId: string;
  poNumber: string;
  description: string;
  receivedAt: string;
}

function describeDigestItem(email: IncomingEmail, shipment: Shipment): string {
  // Sarit already replied — that's the freshest fact about this thread, more
  // relevant than restating what the original email said.
  if (email.awaitingReply) {
    return "תשובה נרשמה, המשלוח ממתין לתשובה.";
  }

  const base = whatSystemFound(email, shipment, email.candidates ?? []);

  // Once approved/resolved, state the fact plainly — no "ממתין ל..." suffix,
  // since nothing is pending anymore (still shows the update DID happen).
  if (email.applied) return base;

  if (email.outcome === "pending-approval") return `${base} ממתין לאישור.`;
  if (email.unknownEvent) return `${base} נדרשת בדיקה.`;
  if (isConflictLike(email.reviewReason)) return `${base} נמצאה סתירה מול מקור קיים.`;

  return base;
}

// Emails still needing a manual shipment match don't have a PO to anchor a
// digest row on yet (and that "לא ברור לאיזו הזמנה" state is already the
// most prominent card in Incoming Updates) — they're excluded here, not lost.
export function getTodayDigest(emails: IncomingEmail[], shipments: Shipment[]): DigestItem[] {
  const items: DigestItem[] = [];
  for (const email of emails) {
    if (!email.processed || email.outcome === "irrelevant") continue;
    if (isMatchingUncertain(email.reviewReason)) continue;
    if (!email.linkedShipmentId) continue;
    const shipment = shipments.find((s) => s.id === email.linkedShipmentId);
    if (!shipment) continue;

    items.push({
      emailId: email.id,
      shipmentId: shipment.id,
      poNumber: shipment.poNumber,
      description: describeDigestItem(email, shipment),
      receivedAt: email.receivedAt,
    });
  }
  return items.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}
