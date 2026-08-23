// Communication Agent — recommends a next action and drafts a reply, always
// grounded in the shipment's own stored fields (no invented facts, no live
// LLM call). This mirrors the same "simulate, don't fabricate" approach as
// the incoming-email pipeline: deterministic templates driven by real data,
// with two phrasing variants so "ניסוח מחדש" visibly does something.
import { Shipment, RecommendedAction, RecommendedActionKind, DraftEmail, CommunicationStatus, IncomingEmail } from "./types";
import { getExceptions } from "./rules";
import { formatDate } from "./dates";

export function communicationStatus(shipment: Shipment): CommunicationStatus {
  const actionable = shipment.emails.filter((e) => e.state !== "info-only");
  if (actionable.length === 0) return "none";
  if (actionable.some((e) => e.state === "needs-reply")) return "needs-reply";
  if (actionable.some((e) => e.state === "waiting")) return "waiting";
  return "answered";
}

const recipientLabels: Record<RecommendedAction["recipientRole"], string> = {
  carrier: "חברת הספנות",
  supplier: "הספק",
  forwarder: "המשלח",
};

// The top exception is already the shipment's single source of truth for
// "what's wrong" (rules.ts) — the agent only decides whether that specific
// problem is something an email can help resolve.
export function getRecommendedAction(shipment: Shipment): RecommendedAction | null {
  const top = getExceptions(shipment)[0];
  if (!top) return null;

  const build = (kind: RecommendedActionKind, label: string, recipientRole: RecommendedAction["recipientRole"]): RecommendedAction => ({
    kind,
    label,
    recipientRole,
    recipientLabel: recipientLabels[recipientRole],
  });

  switch (top.type) {
    case "delayed":
    case "missing-eta":
      return build("delayed", "בקש אישור ETA מעודכן", "carrier");
    case "missing-container":
      return build("missing-container", "בקש מספר מכולה מהספק", "supplier");
    case "waiting-for-response":
      return build("no-response", "שלח Follow-up", "supplier");
    case "conflicting-info":
      return build("conflicting-eta", "בקש מהמשלח לאשר את ה-ETA הנכון", "forwarder");
    default:
      // payment-overdue, arriving-soon: real issues, but not ones an email to
      // a supplier/carrier resolves — handled elsewhere (finance / warehouse).
      return null;
  }
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function existingContact(shipment: Shipment, company: string): string | null {
  const match = shipment.emails.find(
    (e) => e.direction !== "outgoing" && e.fromCompany.toLowerCase() === company.toLowerCase()
  );
  return match?.from ?? null;
}

function carrierContact(shipment: Shipment): string {
  if (shipment.shippingCarrier) {
    return existingContact(shipment, shipment.shippingCarrier) ?? `logistics@${slug(shipment.shippingCarrier)}.com`;
  }
  return "logistics@carrier.com";
}

function supplierContact(shipment: Shipment): string {
  return existingContact(shipment, shipment.supplier) ?? `contact@${slug(shipment.supplier)}.com`;
}

function ownerFirstName(shipment: Shipment): string {
  return shipment.owner.split(" ")[0];
}

export function generateDraftForAction(shipment: Shipment, action: RecommendedAction, variant: 0 | 1 = 0): DraftEmail {
  const owner = ownerFirstName(shipment);
  const productNames = shipment.products.map((p) => p.name).join(", ");

  switch (action.kind) {
    case "delayed": {
      const eta = shipment.currentEta ? formatDate(shipment.currentEta.value) : "the current estimate";
      const body =
        variant === 0
          ? `Hi,\n\nThank you for the update.\n\nCould you please confirm whether ${eta} is now the latest expected arrival date for ${shipment.poNumber} and whether any further delays are currently expected?\n\nThanks,\n${owner}`
          : `Hi,\n\nWe noticed the schedule for ${shipment.poNumber} has changed. Can you confirm ${eta} is firm, and let us know if there's any risk of further delay?\n\nAppreciate the update.\n\nBest,\n${owner}`;
      return { to: carrierContact(shipment), subject: `${shipment.poNumber} — Updated ETA Confirmation`, body };
    }
    case "missing-container": {
      const body =
        variant === 0
          ? `Hi,\n\nCould you please share the container number for ${shipment.poNumber} (${productNames})? We'd like to start tracking the shipment.\n\nThanks,\n${owner}`
          : `Hi,\n\nWe still don't have a container number on file for ${shipment.poNumber}. Could you send it over when you get a chance so we can track the shipment?\n\nThanks,\n${owner}`;
      return { to: supplierContact(shipment), subject: `${shipment.poNumber} — Container Number Request`, body };
    }
    case "no-response": {
      const waitingEmail = shipment.emails.find((e) => e.state === "waiting");
      // A "waiting" email can be our own outgoing message (we're waiting on
      // a reply to it — follow up with the same recipient) or an incoming
      // one where the other side owes us something (follow up with them).
      const to =
        (waitingEmail?.direction === "outgoing" ? waitingEmail.to : waitingEmail?.from) ?? supplierContact(shipment);
      const subject = waitingEmail ? `Re: ${waitingEmail.subject}` : `${shipment.poNumber} — Follow-up`;
      const body =
        variant === 0
          ? `Hi,\n\nFollowing up on our previous message regarding ${shipment.poNumber} — we haven't heard back yet. Could you please provide an update at your earliest convenience?\n\nThanks,\n${owner}`
          : `Hi,\n\nJust checking in on ${shipment.poNumber} — would appreciate an update when you have a moment.\n\nThanks,\n${owner}`;
      return { to, subject, body };
    }
    case "conflicting-eta": {
      const carrierDate = shipment.currentEta ? formatDate(shipment.currentEta.value) : "—";
      const emailDate = shipment.conflictingEta ? formatDate(shipment.conflictingEta.value) : "—";
      const body =
        variant === 0
          ? `Hi,\n\nWe've received conflicting ETA information for ${shipment.poNumber} — ${carrierDate} per carrier tracking vs ${emailDate} per your last message. Could you please confirm the correct expected arrival date?\n\nThanks,\n${owner}`
          : `Hi,\n\nOur carrier tracking shows ${carrierDate} for ${shipment.poNumber}, but we separately received a different date (${emailDate}). Could you clarify which is accurate?\n\nThanks,\n${owner}`;
      return { to: carrierContact(shipment), subject: `${shipment.poNumber} — ETA Confirmation Needed`, body };
    }
  }
}

// Drafts a reply grounded in a SPECIFIC incoming email + the shipment it was
// matched to — used by the inbox's "השב למייל"/"השב לספק" buttons, as
// opposed to generateDraftForAction() above, which drafts from the
// shipment's own top exception with no single triggering message in mind.
// Always replies to whoever sent that email, never a role-derived lookup.
export function generateReplyForIncomingEmail(shipment: Shipment, email: IncomingEmail, variant: 0 | 1 = 0): DraftEmail {
  const owner = ownerFirstName(shipment);
  const to = email.from;
  const subject = `Re: ${email.subject}`;

  if (email.unknownEvent) {
    const body =
      variant === 0
        ? `Hi,\n\nThank you for letting us know about ${shipment.poNumber}. Could you please share more details on what's needed to resolve this, and an updated timeline once available?\n\nThanks,\n${owner}`
        : `Hi,\n\nAppreciate the update on ${shipment.poNumber}. Please keep us posted on what's missing and the revised timeline.\n\nBest,\n${owner}`;
    return { to, subject, body };
  }

  const isConflict = email.reviewReason === "מידע סותר — קיים כבר ערך ממקור מהימן יותר";
  const etaUpdate = email.suggestedUpdates?.find((u) => u.field === "currentEta");

  if (isConflict && shipment.currentEta && etaUpdate) {
    const carrierDate = formatDate(shipment.currentEta.value);
    const emailDate = formatDate(etaUpdate.suggestedValue);
    const body =
      variant === 0
        ? `Hi,\n\nThanks for the update on ${shipment.poNumber}. We're showing ${carrierDate} per our carrier tracking, but your message mentions ${emailDate}. Could you please confirm which date is accurate?\n\nThanks,\n${owner}`
        : `Hi,\n\nWe've received two different ETAs for ${shipment.poNumber} — ${carrierDate} from the carrier and ${emailDate} from your message. Could you clarify which is correct?\n\nBest,\n${owner}`;
    return { to, subject, body };
  }

  if (etaUpdate) {
    const eta = formatDate(etaUpdate.suggestedValue);
    const body =
      variant === 0
        ? `Hi,\n\nThank you for the update regarding ${shipment.poNumber}. Could you please confirm the latest expected arrival date (${eta}) and whether there are any additional delays?\n\nBest regards,\n${owner}`
        : `Hi,\n\nThanks for letting us know about ${shipment.poNumber}. Just confirming — is ${eta} the final expected date, or could this shift further?\n\nBest,\n${owner}`;
    return { to, subject, body };
  }

  const body =
    variant === 0
      ? `Hi,\n\nThank you for the update regarding ${shipment.poNumber}. We've noted the details — please let us know if anything else changes.\n\nBest regards,\n${owner}`
      : `Hi,\n\nAppreciate the update on ${shipment.poNumber}. We'll proceed accordingly — let us know if there's anything further to confirm.\n\nBest,\n${owner}`;
  return { to, subject, body };
}

// Picks the closest existing RecommendedActionKind for a reply triggered
// from the inbox, purely so sendReplyPure's timeline-title templates read
// naturally — this does not affect what the email says (that's decided
// above) or what shipment field gets touched.
export function recommendedActionForEmail(email: IncomingEmail): RecommendedAction | null {
  if (email.unknownEvent) return null;
  const isConflict = email.reviewReason === "מידע סותר — קיים כבר ערך ממקור מהימן יותר";
  const hasEtaUpdate = email.suggestedUpdates?.some((u) => u.field === "currentEta");
  if (isConflict) {
    return { kind: "conflicting-eta", label: "בקש אישור ETA", recipientRole: "supplier", recipientLabel: email.fromCompany };
  }
  if (hasEtaUpdate) {
    return { kind: "delayed", label: "בקש אישור ETA מעודכן", recipientRole: "supplier", recipientLabel: email.fromCompany };
  }
  return null;
}
