// Central data model for EFS purchase-order / shipment tracking.
// A Shipment unifies data from Priority (ERP), Email, Monday, and carrier
// tracking sites. Every field that could plausibly conflict between sources
// carries its own provenance (SourcedValue) instead of being flattened.

export type SourceSystem = "priority" | "email" | "monday" | "carrier" | "ai";

export interface SourcedValue<T> {
  value: T;
  source: SourceSystem;
  sourceLabel: string; // human label, e.g. "MSC Tracking", "Supplier email"
  updatedAt: string; // ISO date
}

// Fixed set of three demo inbound-logistics warehouses — the final leg of
// the journey after customs clearance at the Israeli port. Demo locations
// only; not a claim about EFS's actual facilities.
export type DestinationWarehouse = "מחסן מרכז — פתח תקווה" | "מחסן צפון — חיפה" | "מחסן דרום — באר שבע";

export type ShipmentStatus =
  | "production" // ordered, not yet shipped
  | "in-transit"
  | "arriving-soon"
  | "arrived"
  | "delayed";

export type ExceptionType =
  | "delayed"
  | "arriving-soon"
  | "missing-eta"
  | "missing-container"
  | "conflicting-info"
  | "waiting-for-response"
  | "payment-overdue"
  | "task-overdue"
  | "ai-needs-review";

export interface Exception {
  type: ExceptionType;
  severity: "high" | "medium" | "low";
  message: string; // what happened (full sentence, for detail views)
  shortMessage: string; // compact label for list scanning
  action: string; // what to do about it (full sentence, for detail views)
  shortAction: string; // compact label for table/list scanning
}

export interface Product {
  name: string;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: number; // in the PO's currency
}

export type PaymentStatus = "paid" | "partial" | "unpaid";

export interface PaymentInfo {
  status: PaymentStatus;
  amountPaid: number;
  dueDate: string | null; // ISO — null once fully paid or when no term is set yet
}

export type TimelineSource = SourceSystem;

export interface TimelineEvent {
  id: string;
  date: string; // ISO
  title: string;
  detail?: string;
  source: TimelineSource;
  sourceLabel: string;
}

export type EmailState = "needs-reply" | "waiting" | "answered" | "info-only";

export interface RelatedEmail {
  id: string;
  from: string;
  fromCompany: string;
  to?: string; // recipient — populated for outgoing mail and enriched incoming threads
  subject: string;
  snippet: string;
  body?: string; // full message content; falls back to snippet where absent
  receivedAt: string; // ISO
  state: EmailState;
  direction?: "incoming" | "outgoing"; // defaults to "incoming" when absent
}

// Communication status rolled up across a shipment's email thread.
export type CommunicationStatus = "needs-reply" | "waiting" | "answered" | "none";

// The Communication Agent's recommendation is always derived from the
// shipment's own top exception — never invented. Each kind maps to exactly
// one exception type in getExceptions().
export type RecommendedActionKind = "delayed" | "missing-container" | "no-response" | "conflicting-eta";

export interface RecommendedAction {
  kind: RecommendedActionKind;
  label: string;
  recipientRole: "carrier" | "supplier" | "forwarder";
  recipientLabel: string; // Hebrew label for the recipient role, e.g. "חברת הספנות"
}

export interface DraftEmail {
  to: string;
  subject: string;
  body: string;
}

export type TaskStatus = "open" | "in-progress" | "done";

export interface MondayTask {
  id: string;
  title: string;
  owner: string;
  status: TaskStatus;
  dueDate: string; // ISO
}

export interface Shipment {
  id: string;
  poNumber: string;
  supplier: string;
  supplierCountry: string;
  products: Product[];

  containerNumber: SourcedValue<string> | null;
  shippingCarrier: string | null;
  vesselName: string | null;
  originPort: string | null;
  destinationPort: string;
  destinationWarehouse: DestinationWarehouse;

  etd: SourcedValue<string> | null; // estimated time of departure
  originalEta: SourcedValue<string> | null;
  currentEta: SourcedValue<string> | null;
  conflictingEta: SourcedValue<string> | null; // set when two sources disagree

  status: ShipmentStatus;
  owner: string; // internal owner, from Monday

  timeline: TimelineEvent[];
  emails: RelatedEmail[];
  tasks: MondayTask[];

  currency: string; // ISO currency code, e.g. "USD"
  payment: PaymentInfo;

  createdAt: string; // PO created date, from Priority — also serves as the order date
  lastUpdate: string; // ISO, most recent update across all sources

  // Set only once a human has approved an AI-interpreted "unknown event"
  // from the inbox (see lib/store.ts approveUnknownEvent). Absent for every
  // shipment until that happens — never written automatically.
  aiFlaggedEvent?: UnknownEventInterpretation | null;
}

// ---- AI email intake pipeline ----

export type EmailClassification =
  | "shipping-update"
  | "document"
  | "delay-exception"
  | "supplier-response"
  | "unknown-event" // doesn't match any known structured exception type
  | "irrelevant";

// The workflow decision — separate from EmailClassification (what kind of
// content this is) and driven instead by source authority + match certainty
// (lib/ai-pipeline.ts decideOutcome). This is what the inbox UI and filters
// are organized around: it answers "does Sarit need to do anything about
// this", not "what topic is this".
export type ProcessingOutcome = "auto-updated" | "pending-approval" | "needs-review" | "irrelevant";

// --- AI-assisted fallback for events the deterministic rules don't cover ---
export type ConfidenceLevel = "high" | "medium" | "low";

export interface UnknownEventInterpretation {
  summary: string; // AI's plain-language read of what happened
  suggestedAction: string | null; // null only at "low" confidence — no fake precision
  confidenceLevel: ConfidenceLevel;
  confidenceScore: number | null; // 0-1; null at "low" confidence, same reasoning
  status: "pending" | "approved" | "dismissed";
}

export interface ExtractedFields {
  supplier?: string;
  event?: string;
  origin?: string;
  destination?: string;
  eta?: string;
  containerNumber?: string;
  poNumber?: string;
}

export interface MatchCandidate {
  shipmentId: string;
  poNumber: string;
  confidence: number; // 0-1
  matchedOn: string; // e.g. "PO number", "supplier + product"
}

export interface SuggestedUpdate {
  field: "currentEta" | "containerNumber" | "status";
  label: string;
  currentValue: string | null;
  suggestedValue: string;
}

export interface IncomingEmail {
  id: string;
  from: string;
  fromCompany: string;
  subject: string;
  body: string;
  receivedAt: string;
  processed: boolean;
  classification?: EmailClassification;
  extracted?: ExtractedFields;
  candidates?: MatchCandidate[];
  suggestedUpdates?: SuggestedUpdate[];
  unknownEvent?: UnknownEventInterpretation;
  outcome?: ProcessingOutcome;
  // Short, human-facing reason shown on "needs-review" items — ambiguous
  // match / conflicting source / low confidence / unknown event — so Sarit
  // immediately sees WHY this one couldn't be handled automatically.
  reviewReason?: string;
  applied?: boolean;
  // Set once this email is tied to exactly one shipment — automatically by
  // the pipeline's own match, or by Sarit resolving an ambiguous/no-match
  // case by hand (lib/store.ts linkEmailToShipment). Drives "פתח משלוח" and
  // the mirrored entry in that shipment's own communication thread.
  linkedShipmentId?: string;
  // True once Sarit has sent a reply from this card (lib/store.ts
  // replyToEmail) — moves the card from "דורש טיפול" to "ממתין לתשובה"
  // without marking it fully resolved (applied stays false).
  awaitingReply?: boolean;
}
