import { Shipment, IncomingEmail } from "./types";
import { daysFromToday, formatDate } from "./dates";

let idc = 0;
const eid = (prefix: string) => `${prefix}-${(++idc).toString().padStart(3, "0")}`;

// ---------------------------------------------------------------------------
// 1. PO-4501 — Guangzhou Fire Safety Equipment — normal, in transit, on track
// ---------------------------------------------------------------------------
const s4501: Shipment = {
  id: "sh-4501",
  poNumber: "PO-4501",
  supplier: "Guangzhou Fire Safety Equipment",
  supplierCountry: "סין",
  products: [{ name: "Fire & Smoke Damper Actuators — Basic On/Off", sku: "ACT-FSD24", quantity: 850, unit: "units", unitPrice: 18.5 }],
  currency: "USD",
  payment: { status: "paid", amountPaid: 15725, dueDate: null },
  containerNumber: { value: "MSCU7741205", source: "carrier", sourceLabel: "MSC Tracking", updatedAt: daysFromToday(-6) },
  shippingCarrier: "MSC",
  vesselName: "MSC Bellissima",
  originPort: "Shenzhen",
  destinationPort: "Ashdod",
  destinationWarehouse: "מחסן מרכז — פתח תקווה",
  etd: { value: daysFromToday(-7), source: "carrier", sourceLabel: "MSC Tracking", updatedAt: daysFromToday(-7) },
  originalEta: { value: daysFromToday(6), source: "priority", sourceLabel: "Priority PO", updatedAt: daysFromToday(-14) },
  currentEta: { value: daysFromToday(6), source: "carrier", sourceLabel: "MSC Tracking", updatedAt: daysFromToday(-1) },
  conflictingEta: null,
  status: "in-transit",
  owner: "Sarit Cohen",
  createdAt: daysFromToday(-21),
  lastUpdate: daysFromToday(-1),
  timeline: [
    { id: eid("t"), date: daysFromToday(-21), title: "הזמנת רכש נוצרה", source: "priority", sourceLabel: "Priority" },
    { id: eid("t"), date: daysFromToday(-9), title: "הספק אישר שהייצור הושלם", source: "email", sourceLabel: "מייל · ‎Guangzhou Fire Safety Equipment‎" },
    { id: eid("t"), date: daysFromToday(-7), title: "האונייה יצאה משנזן", detail: "MSC Bellissima", source: "carrier", sourceLabel: "MSC Tracking" },
    { id: eid("t"), date: daysFromToday(-1), title: "ETA אושר: בעוד 6 ימים", source: "carrier", sourceLabel: "MSC Tracking" },
  ],
  emails: [
    {
      id: eid("e"),
      from: "wei.chen@gz-firesafety.cn",
      fromCompany: "Guangzhou Fire Safety Equipment",
      to: "sarit.cohen@efs-company.com",
      subject: "Production completed — PO-4501",
      snippet: "All units passed QC and were loaded into container MSCU7741205 this morning.",
      body: "Hi Sarit,\n\nAll damper actuator units for PO-4501 passed QC and were loaded into container MSCU7741205 this morning. The vessel is on schedule.\n\nBest regards,\nWei Chen",
      receivedAt: daysFromToday(-9),
      state: "info-only",
      direction: "incoming",
    },
  ],
  tasks: [
    { id: eid("k"), title: "תיאום מקום קבלה במחסן מרכז — פתח תקווה", owner: "Sarit Cohen", status: "open", dueDate: daysFromToday(5) },
  ],
};

// ---------------------------------------------------------------------------
// 2. PO-4512 — Shenzhen Damper Components Ltd. — in production, on track, no exceptions
// ---------------------------------------------------------------------------
const s4512: Shipment = {
  id: "sh-4512",
  poNumber: "PO-4512",
  supplier: "Shenzhen Damper Components Ltd.",
  supplierCountry: "סין",
  products: [{ name: "Galvanized Damper Frames", sku: "FRM-GLV09", quantity: 12000, unit: "pcs", unitPrice: 5.6 }],
  currency: "USD",
  payment: { status: "partial", amountPaid: 20160, dueDate: daysFromToday(20) },
  containerNumber: null,
  shippingCarrier: null,
  vesselName: null,
  originPort: "Shenzhen",
  destinationPort: "Haifa",
  destinationWarehouse: "מחסן צפון — חיפה",
  etd: null,
  originalEta: { value: daysFromToday(24), source: "priority", sourceLabel: "Priority PO", updatedAt: daysFromToday(-10) },
  currentEta: null,
  conflictingEta: null,
  status: "production",
  owner: "Sarit Cohen",
  createdAt: daysFromToday(-10),
  lastUpdate: daysFromToday(-3),
  timeline: [
    { id: eid("t"), date: daysFromToday(-10), title: "הזמנת רכש נוצרה", source: "priority", sourceLabel: "Priority" },
    { id: eid("t"), date: daysFromToday(-3), title: "הספק אישר שההזמנה בייצור", detail: "השלמה צפויה בעוד כשבועיים", source: "email", sourceLabel: "מייל · ‎Shenzhen Damper Components‎" },
  ],
  emails: [
    { id: eid("e"), from: "lin.zhao@sz-dampercomp.cn", fromCompany: "Shenzhen Damper Components Ltd.", subject: "Re: PO-4512 production schedule", snippet: "Production is on schedule, expected completion around Sep 4th.", receivedAt: daysFromToday(-3), state: "answered" },
  ],
  tasks: [],
};

// ---------------------------------------------------------------------------
// 3. PO-4523 — Ningbo Fire Insulation Co. — arriving in 2 days
// ---------------------------------------------------------------------------
const s4523: Shipment = {
  id: "sh-4523",
  poNumber: "PO-4523",
  supplier: "Ningbo Fire Insulation Co.",
  supplierCountry: "סין",
  products: [{ name: "Ceramic Fire Protection Wrap Rolls", sku: "CER-WRAP60", quantity: 600, unit: "rolls", unitPrice: 34 }],
  currency: "USD",
  payment: { status: "paid", amountPaid: 20400, dueDate: null },
  containerNumber: { value: "TEMU9021884", source: "carrier", sourceLabel: "COSCO Tracking", updatedAt: daysFromToday(-12) },
  shippingCarrier: "COSCO",
  vesselName: "COSCO Pride",
  originPort: "Ningbo",
  destinationPort: "Ashdod",
  destinationWarehouse: "מחסן דרום — באר שבע",
  etd: { value: daysFromToday(-16), source: "carrier", sourceLabel: "COSCO Tracking", updatedAt: daysFromToday(-16) },
  originalEta: { value: daysFromToday(2), source: "priority", sourceLabel: "Priority PO", updatedAt: daysFromToday(-25) },
  currentEta: { value: daysFromToday(2), source: "carrier", sourceLabel: "COSCO Tracking", updatedAt: daysFromToday(0) },
  conflictingEta: null,
  status: "arriving-soon",
  owner: "Sarit Cohen",
  createdAt: daysFromToday(-25),
  lastUpdate: daysFromToday(0),
  timeline: [
    { id: eid("t"), date: daysFromToday(-25), title: "הזמנת רכש נוצרה", source: "priority", sourceLabel: "Priority" },
    { id: eid("t"), date: daysFromToday(-16), title: "האונייה יצאה מנינגבו", detail: "COSCO Pride", source: "carrier", sourceLabel: "COSCO Tracking" },
    { id: eid("t"), date: daysFromToday(-4), title: "העברה בין אוניות בנמל סעיד", source: "carrier", sourceLabel: "COSCO Tracking" },
    { id: eid("t"), date: daysFromToday(0), title: "ETA אושר: הגעה בעוד יומיים", source: "carrier", sourceLabel: "COSCO Tracking" },
  ],
  emails: [],
  tasks: [
    { id: eid("k"), title: "הכנת מסמכי שחרור ממכס", owner: "Dana Levi", status: "in-progress", dueDate: daysFromToday(1) },
    { id: eid("k"), title: "תיאום מקום פריקה במחסן דרום — באר שבע", owner: "Sarit Cohen", status: "open", dueDate: daysFromToday(2) },
  ],
};

// ---------------------------------------------------------------------------
// 4. PO-4582 — Shanghai Damper Metalworks — delayed +5 days (headline scenario)
// ---------------------------------------------------------------------------
const s4582: Shipment = {
  id: "sh-4582",
  poNumber: "PO-4582",
  supplier: "Shanghai Damper Metalworks",
  supplierCountry: "סין",
  products: [{ name: "Galvanized Damper Blades", sku: "BLD-GLV14", quantity: 26000, unit: "pcs", unitPrice: 1.35 }],
  currency: "USD",
  payment: { status: "partial", amountPaid: 17550, dueDate: daysFromToday(10) },
  containerNumber: { value: "MSCU3350917", source: "carrier", sourceLabel: "MSC Tracking", updatedAt: daysFromToday(-18) },
  shippingCarrier: "MSC",
  vesselName: "MSC Anna",
  originPort: "Shanghai",
  destinationPort: "Haifa",
  destinationWarehouse: "מחסן מרכז — פתח תקווה",
  etd: { value: daysFromToday(-19), source: "carrier", sourceLabel: "MSC Tracking", updatedAt: daysFromToday(-19) },
  originalEta: { value: daysFromToday(-4), source: "priority", sourceLabel: "Priority PO", updatedAt: daysFromToday(-30) },
  currentEta: { value: daysFromToday(1), source: "carrier", sourceLabel: "MSC Tracking", updatedAt: daysFromToday(-1) },
  conflictingEta: null,
  status: "delayed",
  owner: "Sarit Cohen",
  createdAt: daysFromToday(-30),
  lastUpdate: daysFromToday(-1),
  timeline: [
    { id: eid("t"), date: daysFromToday(-30), title: "הזמנת רכש נוצרה", source: "priority", sourceLabel: "Priority" },
    { id: eid("t"), date: daysFromToday(-19), title: "האונייה יצאה משנגחאי", detail: "MSC Anna", source: "carrier", sourceLabel: "MSC Tracking" },
    { id: eid("t"), date: daysFromToday(-8), title: "דווח על עומס בנמל סעיד בזמן ההעברה", source: "carrier", sourceLabel: "MSC Tracking" },
    {
      id: eid("t"),
      date: daysFromToday(-5),
      title: `ETA שונה מ-‎${formatDate(daysFromToday(-4), true)}‎ ל-‎${formatDate(daysFromToday(-1), true)}‎`,
      source: "carrier",
      sourceLabel: "MSC Tracking",
    },
    {
      id: eid("t"),
      date: daysFromToday(-1),
      title: `ETA שונה שוב — כעת ‎${formatDate(daysFromToday(1), true)}‎`,
      detail: "5 ימים מאחורי הלו״ז המקורי",
      source: "carrier",
      sourceLabel: "MSC Tracking",
    },
  ],
  emails: [
    {
      id: eid("e"),
      from: "logistics@msc.com",
      fromCompany: "MSC",
      to: "sarit.cohen@efs-company.com",
      subject: "Schedule update — vessel MSC Anna",
      snippet: "Due to port congestion at transshipment, revised ETA to Haifa is now Aug 23.",
      body: "Hi Sarit,\n\nDue to port congestion at the transshipment port, the revised ETA to Haifa for PO-4582 is now August 23 — about 5 days behind the original schedule.\n\nWe'll keep you posted if anything changes.\n\nBest regards,\nMSC Logistics Team",
      receivedAt: daysFromToday(-1),
      state: "info-only",
      direction: "incoming",
    },
  ],
  tasks: [
    { id: eid("k"), title: "עדכון תכנון הייצור על איחור של 5 ימים", owner: "Sarit Cohen", status: "open", dueDate: daysFromToday(0) },
  ],
};

// ---------------------------------------------------------------------------
// 5. PO-4599 — Qingdao Industrial Insulation — severely delayed +9 days
// ---------------------------------------------------------------------------
const s4599: Shipment = {
  id: "sh-4599",
  poNumber: "PO-4599",
  supplier: "Qingdao Industrial Insulation",
  supplierCountry: "סין",
  products: [{ name: "Ceramic Fire Protection Wrap Rolls", sku: "CER-WRAP42", quantity: 420, unit: "rolls", unitPrice: 30.5 }],
  currency: "USD",
  payment: { status: "partial", amountPaid: 5120, dueDate: daysFromToday(-2) },
  containerNumber: null,
  shippingCarrier: "Maersk",
  vesselName: null,
  originPort: "Qingdao",
  destinationPort: "Haifa",
  destinationWarehouse: "מחסן צפון — חיפה",
  etd: null,
  originalEta: { value: daysFromToday(-9), source: "priority", sourceLabel: "Priority PO", updatedAt: daysFromToday(-35) },
  currentEta: { value: daysFromToday(0), source: "email", sourceLabel: "Qingdao Industrial Insulation email", updatedAt: daysFromToday(-2) },
  conflictingEta: null,
  status: "delayed",
  owner: "Sarit Cohen",
  createdAt: daysFromToday(-35),
  lastUpdate: daysFromToday(-2),
  timeline: [
    { id: eid("t"), date: daysFromToday(-35), title: "הזמנת רכש נוצרה", source: "priority", sourceLabel: "Priority" },
    { id: eid("t"), date: daysFromToday(-20), title: "הספק דיווח על עיכוב במפעל", detail: "מחסור בחומרי גלם לייצור מעטפות קרמיקה", source: "email", sourceLabel: "מייל · ‎Qingdao Industrial Insulation‎" },
    { id: eid("t"), date: daysFromToday(-9), title: "ה-ETA המקורי חלף מבלי שהמשלוח יצא", source: "priority", sourceLabel: "Priority" },
    { id: eid("t"), date: daysFromToday(-2), title: "הספק הבטיח תאריך השלמה חדש, ה-ETA נדחה להיום", source: "email", sourceLabel: "מייל · ‎Qingdao Industrial Insulation‎" },
  ],
  emails: [
    {
      id: eid("e"),
      from: "helen.wu@qd-insulation.cn",
      fromCompany: "Qingdao Industrial Insulation",
      to: "sarit.cohen@efs-company.com",
      subject: "Delay update — PO-4599",
      snippet: "We apologize for the delay caused by a raw-material shortage. Wrap rolls will ship by end of this week.",
      body: "Dear Sarit,\n\nWe apologize for the delay on PO-4599, caused by a ceramic raw-material shortage. The wrap rolls will ship by the end of this week.\n\nPlease let us know if you need anything else.\n\nBest regards,\nHelen Wu",
      receivedAt: daysFromToday(-2),
      state: "needs-reply",
      direction: "incoming",
    },
  ],
  tasks: [
    { id: eid("k"), title: "הסלמה מול הספק — איחור של 9 ימים", owner: "Sarit Cohen", status: "open", dueDate: daysFromToday(0) },
  ],
};

// ---------------------------------------------------------------------------
// 6. PO-4610 — Yiwu HVAC & Fire Accessories Trading — missing ETA entirely
// ---------------------------------------------------------------------------
const s4610: Shipment = {
  id: "sh-4610",
  poNumber: "PO-4610",
  supplier: "Yiwu HVAC & Fire Accessories Trading",
  supplierCountry: "סין",
  products: [{ name: "Duct Sealing Clips (Fire-Rated)", sku: "DPA-2201", quantity: 80000, unit: "pcs", unitPrice: 0.19 }],
  currency: "USD",
  payment: { status: "paid", amountPaid: 15200, dueDate: null },
  containerNumber: { value: "CAIU5512300", source: "email", sourceLabel: "Yiwu HVAC & Fire Accessories email", updatedAt: daysFromToday(-5) },
  shippingCarrier: "CMA CGM",
  vesselName: null,
  originPort: "Ningbo",
  destinationPort: "Ashdod",
  destinationWarehouse: "מחסן דרום — באר שבע",
  etd: { value: daysFromToday(-5), source: "email", sourceLabel: "Yiwu HVAC & Fire Accessories email", updatedAt: daysFromToday(-5) },
  originalEta: { value: daysFromToday(11), source: "priority", sourceLabel: "Priority PO", updatedAt: daysFromToday(-19) },
  currentEta: null,
  conflictingEta: null,
  status: "in-transit",
  owner: "Dana Levi",
  createdAt: daysFromToday(-19),
  lastUpdate: daysFromToday(-5),
  timeline: [
    { id: eid("t"), date: daysFromToday(-19), title: "הזמנת רכש נוצרה", source: "priority", sourceLabel: "Priority" },
    { id: eid("t"), date: daysFromToday(-5), title: "הספק דיווח שהמכולה יצאה", detail: "מכולה CAIU5512300, שם האונייה לא צוין", source: "email", sourceLabel: "מייל · ‎Yiwu HVAC & Fire Accessories‎" },
  ],
  emails: [
    { id: eid("e"), from: "jason.lu@yiwu-hvactrade.cn", fromCompany: "Yiwu HVAC & Fire Accessories Trading", subject: "Shipment departed — PO-4610", snippet: "Container CAIU5512300 has departed Ningbo. Will send tracking link once available.", receivedAt: daysFromToday(-5), state: "waiting" },
  ],
  tasks: [],
};

// ---------------------------------------------------------------------------
// 7. PO-4623 — Dongguan Damper Systems — missing container number
// ---------------------------------------------------------------------------
const s4623: Shipment = {
  id: "sh-4623",
  poNumber: "PO-4623",
  supplier: "Dongguan Damper Systems",
  supplierCountry: "סין",
  products: [{ name: "Zinc-Plated Damper Fasteners, M6", sku: "FST-M6Z", quantity: 500000, unit: "pcs", unitPrice: 0.015 }],
  currency: "USD",
  payment: { status: "partial", amountPaid: 4500, dueDate: daysFromToday(15) },
  containerNumber: null,
  shippingCarrier: "Evergreen",
  vesselName: "Ever Given II",
  originPort: "Shenzhen",
  destinationPort: "Haifa",
  destinationWarehouse: "מחסן מרכז — פתח תקווה",
  etd: { value: daysFromToday(-11), source: "carrier", sourceLabel: "Evergreen Tracking", updatedAt: daysFromToday(-11) },
  originalEta: { value: daysFromToday(9), source: "priority", sourceLabel: "Priority PO", updatedAt: daysFromToday(-22) },
  currentEta: { value: daysFromToday(9), source: "carrier", sourceLabel: "Evergreen Tracking", updatedAt: daysFromToday(-2) },
  conflictingEta: null,
  status: "in-transit",
  owner: "Sarit Cohen",
  createdAt: daysFromToday(-22),
  lastUpdate: daysFromToday(-2),
  timeline: [
    { id: eid("t"), date: daysFromToday(-22), title: "הזמנת רכש נוצרה", source: "priority", sourceLabel: "Priority" },
    { id: eid("t"), date: daysFromToday(-11), title: "האונייה יצאה משנזן", detail: "Ever Given II — מספר מכולה טרם אושר", source: "carrier", sourceLabel: "Evergreen Tracking" },
    { id: eid("t"), date: daysFromToday(-2), title: "ETA אושר: בעוד 9 ימים", source: "carrier", sourceLabel: "Evergreen Tracking" },
  ],
  emails: [],
  tasks: [
    { id: eid("k"), title: "בקשת מספר מכולה מהמשלח", owner: "Sarit Cohen", status: "open", dueDate: daysFromToday(2) },
  ],
};

// ---------------------------------------------------------------------------
// 8. PO-4634 — Guangzhou HVAC Components — waiting for supplier response
// ---------------------------------------------------------------------------
const s4634: Shipment = {
  id: "sh-4634",
  poNumber: "PO-4634",
  supplier: "Guangzhou HVAC Components",
  supplierCountry: "סין",
  products: [{ name: "HVAC Duct Flange Connectors", sku: "HVA-DCT03", quantity: 15000, unit: "pcs", unitPrice: 2.35 }],
  currency: "USD",
  payment: { status: "unpaid", amountPaid: 0, dueDate: daysFromToday(-5) },
  containerNumber: null,
  shippingCarrier: "MSC",
  vesselName: null,
  originPort: "Shenzhen",
  destinationPort: "Ashdod",
  destinationWarehouse: "מחסן דרום — באר שבע",
  etd: null,
  originalEta: { value: daysFromToday(15), source: "priority", sourceLabel: "Priority PO", updatedAt: daysFromToday(-8) },
  currentEta: null,
  conflictingEta: null,
  status: "production",
  owner: "Dana Levi",
  createdAt: daysFromToday(-8),
  lastUpdate: daysFromToday(-6),
  timeline: [
    { id: eid("t"), date: daysFromToday(-8), title: "הזמנת רכש נוצרה", source: "priority", sourceLabel: "Priority" },
    { id: eid("t"), date: daysFromToday(-6), title: "פנייה לספק לאישור הזמנת מכולה", source: "email", sourceLabel: "מייל יוצא · ‎Dana Levi‎" },
  ],
  emails: [
    {
      id: eid("e"),
      from: "dana.levi@efs-company.com",
      fromCompany: "EFS",
      to: "chen.wei@gz-hvaccomp.cn",
      subject: "Container booking status — PO-4634",
      snippet: "Hi, can you confirm the container booking and expected departure date?",
      body: "Hi,\n\nCould you confirm the container booking and expected departure date for PO-4634?\n\nThanks,\nDana",
      receivedAt: daysFromToday(-6),
      state: "waiting",
      direction: "outgoing",
    },
  ],
  tasks: [
    { id: eid("k"), title: "מעקב מול Guangzhou HVAC Components — אין מענה כבר 6 ימים", owner: "Dana Levi", status: "open", dueDate: daysFromToday(0) },
  ],
};

// ---------------------------------------------------------------------------
// 9. PO-4645 — Foshan Passive Fire Systems — conflicting ETA between email and carrier
// ---------------------------------------------------------------------------
const s4645: Shipment = {
  id: "sh-4645",
  poNumber: "PO-4645",
  supplier: "Foshan Passive Fire Systems",
  supplierCountry: "סין",
  products: [{ name: "Firestop Sealing Products", sku: "FSP-CTN2", quantity: 2200, unit: "cartons", unitPrice: 42 }],
  currency: "USD",
  payment: { status: "paid", amountPaid: 92400, dueDate: null },
  containerNumber: { value: "OOLU6620144", source: "carrier", sourceLabel: "OOCL Tracking", updatedAt: daysFromToday(-14) },
  shippingCarrier: "OOCL",
  vesselName: "OOCL Shenzhen",
  originPort: "Foshan",
  destinationPort: "Haifa",
  destinationWarehouse: "מחסן מרכז — פתח תקווה",
  etd: { value: daysFromToday(-15), source: "carrier", sourceLabel: "OOCL Tracking", updatedAt: daysFromToday(-15) },
  originalEta: { value: daysFromToday(4), source: "priority", sourceLabel: "Priority PO", updatedAt: daysFromToday(-28) },
  currentEta: { value: daysFromToday(4), source: "carrier", sourceLabel: "OOCL Tracking", updatedAt: daysFromToday(-1) },
  conflictingEta: { value: daysFromToday(8), source: "email", sourceLabel: "Foshan Passive Fire Systems email", updatedAt: daysFromToday(-2) },
  status: "in-transit",
  owner: "Sarit Cohen",
  createdAt: daysFromToday(-28),
  lastUpdate: daysFromToday(-1),
  timeline: [
    { id: eid("t"), date: daysFromToday(-28), title: "הזמנת רכש נוצרה", source: "priority", sourceLabel: "Priority" },
    { id: eid("t"), date: daysFromToday(-15), title: "האונייה יצאה מפושאן", detail: "OOCL Shenzhen", source: "carrier", sourceLabel: "OOCL Tracking" },
    { id: eid("t"), date: daysFromToday(-2), title: "מייל הספק מציין ETA של בעוד 8 ימים", detail: "סותר את מעקב חברת הספנות", source: "email", sourceLabel: "מייל · ‎Foshan Passive Fire Systems‎" },
    { id: eid("t"), date: daysFromToday(-1), title: "מעקב OOCL מציג ETA של בעוד 4 ימים", source: "carrier", sourceLabel: "OOCL Tracking" },
  ],
  emails: [
    {
      id: eid("e"),
      from: "ivy.huang@foshan-firesys.cn",
      fromCompany: "Foshan Passive Fire Systems",
      to: "sarit.cohen@efs-company.com",
      subject: "Shipping update — PO-4645",
      snippet: "Our forwarder informed us the vessel is running a few days behind — new ETA in about 8 days.",
      body: "Hi Sarit,\n\nOur forwarder informed us the vessel for PO-4645 is running a few days behind — new ETA in about 8 days. Please double check against the carrier tracking, as we're not 100% sure this is up to date.\n\nBest,\nIvy Huang",
      receivedAt: daysFromToday(-2),
      state: "info-only",
      direction: "incoming",
    },
  ],
  tasks: [],
};

// ---------------------------------------------------------------------------
// 10 & 11 — Hangzhou Damper Technologies — two similar shipments, used for the
// low-confidence AI matching scenario in the inbox.
// ---------------------------------------------------------------------------
const s4656: Shipment = {
  id: "sh-4656",
  poNumber: "PO-4656",
  supplier: "Hangzhou Damper Technologies",
  supplierCountry: "סין",
  products: [{ name: "Fire & Smoke Damper Actuators — Modulating 24V", sku: "ACT-24VSTD", quantity: 2400, unit: "units", unitPrice: 77.5 }],
  currency: "USD",
  payment: { status: "paid", amountPaid: 186000, dueDate: null },
  containerNumber: null,
  shippingCarrier: "MSC",
  vesselName: null,
  originPort: "Hangzhou",
  destinationPort: "Ashdod",
  destinationWarehouse: "מחסן דרום — באר שבע",
  etd: null,
  originalEta: { value: daysFromToday(18), source: "priority", sourceLabel: "Priority PO", updatedAt: daysFromToday(-4) },
  currentEta: null,
  conflictingEta: null,
  status: "production",
  owner: "Dana Levi",
  createdAt: daysFromToday(-4),
  lastUpdate: daysFromToday(-4),
  timeline: [{ id: eid("t"), date: daysFromToday(-4), title: "הזמנת רכש נוצרה", source: "priority", sourceLabel: "Priority" }],
  emails: [],
  tasks: [],
};

const s4657: Shipment = {
  id: "sh-4657",
  poNumber: "PO-4657",
  supplier: "Hangzhou Damper Technologies",
  supplierCountry: "סין",
  products: [{ name: "Fire & Smoke Damper Actuators — Spring-Return Fail-Safe", sku: "ACT-SPRRTN", quantity: 1725, unit: "units", unitPrice: 80 }],
  currency: "USD",
  payment: { status: "partial", amountPaid: 69000, dueDate: daysFromToday(25) },
  containerNumber: null,
  shippingCarrier: "MSC",
  vesselName: null,
  originPort: "Hangzhou",
  destinationPort: "Ashdod",
  destinationWarehouse: "מחסן מרכז — פתח תקווה",
  etd: null,
  originalEta: { value: daysFromToday(20), source: "priority", sourceLabel: "Priority PO", updatedAt: daysFromToday(-2) },
  currentEta: null,
  conflictingEta: null,
  status: "production",
  owner: "Dana Levi",
  createdAt: daysFromToday(-2),
  lastUpdate: daysFromToday(-2),
  timeline: [{ id: eid("t"), date: daysFromToday(-2), title: "הזמנת רכש נוצרה", source: "priority", sourceLabel: "Priority" }],
  emails: [],
  tasks: [],
};

// ---------------------------------------------------------------------------
// 12. PO-4668 — Xiamen Fire Protection Materials — multiple products under one PO
// ---------------------------------------------------------------------------
const s4668: Shipment = {
  id: "sh-4668",
  poNumber: "PO-4668",
  supplier: "Xiamen Fire Protection Materials",
  supplierCountry: "סין",
  products: [
    { name: "Ceramic Fire Protection Wrap Rolls", sku: "CER-WRAP90", quantity: 900, unit: "rolls", unitPrice: 37 },
    { name: "High-Temperature Ceramic Insulation Boards", sku: "CER-BRD58", quantity: 900, unit: "boards", unitPrice: 58 },
  ],
  currency: "USD",
  payment: { status: "paid", amountPaid: 85500, dueDate: null },
  containerNumber: { value: "COSU4471820", source: "carrier", sourceLabel: "COSCO Tracking", updatedAt: daysFromToday(-9) },
  shippingCarrier: "COSCO",
  vesselName: "COSCO Fortune",
  originPort: "Xiamen",
  destinationPort: "Haifa",
  destinationWarehouse: "מחסן צפון — חיפה",
  etd: { value: daysFromToday(-10), source: "carrier", sourceLabel: "COSCO Tracking", updatedAt: daysFromToday(-10) },
  originalEta: { value: daysFromToday(13), source: "priority", sourceLabel: "Priority PO", updatedAt: daysFromToday(-24) },
  currentEta: { value: daysFromToday(13), source: "carrier", sourceLabel: "COSCO Tracking", updatedAt: daysFromToday(-3) },
  conflictingEta: null,
  status: "in-transit",
  owner: "Sarit Cohen",
  createdAt: daysFromToday(-24),
  lastUpdate: daysFromToday(-3),
  timeline: [
    { id: eid("t"), date: daysFromToday(-24), title: "הזמנת רכש נוצרה", source: "priority", sourceLabel: "Priority" },
    { id: eid("t"), date: daysFromToday(-10), title: "האונייה יצאה משיאמן", detail: "COSCO Fortune, 2 פריטים במכולה אחת", source: "carrier", sourceLabel: "COSCO Tracking" },
    { id: eid("t"), date: daysFromToday(-3), title: "ETA אושר: בעוד 13 ימים", source: "carrier", sourceLabel: "COSCO Tracking" },
  ],
  emails: [],
  tasks: [],
};

// ---------------------------------------------------------------------------
// 13. PO-4679 — Shenzhen Precision Damper Manufacturing — recently updated ETA (good news)
// ---------------------------------------------------------------------------
const s4679: Shipment = {
  id: "sh-4679",
  poNumber: "PO-4679",
  supplier: "Shenzhen Precision Damper Manufacturing",
  supplierCountry: "סין",
  products: [{ name: "Damper Blade Linkage Assemblies", sku: "LNK-BLD01", quantity: 1080, unit: "units", unitPrice: 60 }],
  currency: "USD",
  payment: { status: "paid", amountPaid: 64800, dueDate: null },
  containerNumber: { value: "MAEU8834210", source: "carrier", sourceLabel: "Maersk Tracking", updatedAt: daysFromToday(-17) },
  shippingCarrier: "Maersk",
  vesselName: "Maersk Sealand",
  originPort: "Shenzhen",
  destinationPort: "Ashdod",
  destinationWarehouse: "מחסן דרום — באר שבע",
  etd: { value: daysFromToday(-18), source: "carrier", sourceLabel: "Maersk Tracking", updatedAt: daysFromToday(-18) },
  originalEta: { value: daysFromToday(7), source: "priority", sourceLabel: "Priority PO", updatedAt: daysFromToday(-27) },
  currentEta: { value: daysFromToday(5), source: "carrier", sourceLabel: "Maersk Tracking", updatedAt: daysFromToday(0) },
  conflictingEta: null,
  status: "in-transit",
  owner: "Sarit Cohen",
  createdAt: daysFromToday(-27),
  lastUpdate: daysFromToday(0),
  timeline: [
    { id: eid("t"), date: daysFromToday(-27), title: "הזמנת רכש נוצרה", source: "priority", sourceLabel: "Priority" },
    { id: eid("t"), date: daysFromToday(-18), title: "האונייה יצאה משנזן", detail: "Maersk Sealand", source: "carrier", sourceLabel: "Maersk Tracking" },
    { id: eid("t"), date: daysFromToday(0), title: "ה-ETA השתפר מ-7 ימים ל-5 ימים", detail: "האונייה מקדימה את הלו״ז", source: "carrier", sourceLabel: "Maersk Tracking" },
  ],
  emails: [],
  tasks: [],
};

// ---------------------------------------------------------------------------
// 14. PO-4690 — Suzhou HVAC Precision Manufacturing — already arrived
// ---------------------------------------------------------------------------
const s4690: Shipment = {
  id: "sh-4690",
  poNumber: "PO-4690",
  supplier: "Suzhou HVAC Precision Manufacturing",
  supplierCountry: "סין",
  products: [{ name: "Manual Volume Control Dampers", sku: "HVA-DCT12", quantity: 8200, unit: "pcs", unitPrice: 15 }],
  currency: "USD",
  payment: { status: "paid", amountPaid: 123000, dueDate: null },
  containerNumber: { value: "HLXU2298031", source: "carrier", sourceLabel: "Hapag-Lloyd Tracking", updatedAt: daysFromToday(-30) },
  shippingCarrier: "Hapag-Lloyd",
  vesselName: "Hapag Bremen",
  originPort: "Shanghai",
  destinationPort: "Haifa",
  destinationWarehouse: "מחסן צפון — חיפה",
  etd: { value: daysFromToday(-31), source: "carrier", sourceLabel: "Hapag-Lloyd Tracking", updatedAt: daysFromToday(-31) },
  originalEta: { value: daysFromToday(-3), source: "priority", sourceLabel: "Priority PO", updatedAt: daysFromToday(-45) },
  currentEta: { value: daysFromToday(-3), source: "carrier", sourceLabel: "Hapag-Lloyd Tracking", updatedAt: daysFromToday(-3) },
  conflictingEta: null,
  status: "arrived",
  owner: "Sarit Cohen",
  createdAt: daysFromToday(-45),
  lastUpdate: daysFromToday(-3),
  timeline: [
    { id: eid("t"), date: daysFromToday(-45), title: "הזמנת רכש נוצרה", source: "priority", sourceLabel: "Priority" },
    { id: eid("t"), date: daysFromToday(-31), title: "האונייה יצאה משנגחאי", detail: "Hapag Bremen", source: "carrier", sourceLabel: "Hapag-Lloyd Tracking" },
    { id: eid("t"), date: daysFromToday(-3), title: "המכולה הגיעה לנמל חיפה", source: "carrier", sourceLabel: "Hapag-Lloyd Tracking" },
    { id: eid("t"), date: daysFromToday(-2), title: "שוחרר ממכס והתקבל במחסן", source: "monday", sourceLabel: "Monday" },
  ],
  emails: [],
  tasks: [{ id: eid("k"), title: "העברת מסמכי המשלוח לארכיון", owner: "Dana Levi", status: "done", dueDate: daysFromToday(-1) }],
};

// ---------------------------------------------------------------------------
// 15. PO-4701 — Wuxi ThermalShield Industries — normal, in production
// ---------------------------------------------------------------------------
const s4701: Shipment = {
  id: "sh-4701",
  poNumber: "PO-4701",
  supplier: "Wuxi ThermalShield Industries",
  supplierCountry: "סין",
  products: [{ name: "Mineral Wool Fire Protection Insulation Rolls", sku: "FPI-ROLL59", quantity: 600, unit: "rolls", unitPrice: 59 }],
  currency: "USD",
  payment: { status: "partial", amountPaid: 7040, dueDate: daysFromToday(30) },
  containerNumber: null,
  shippingCarrier: null,
  vesselName: null,
  originPort: "Shanghai",
  destinationPort: "Haifa",
  destinationWarehouse: "מחסן מרכז — פתח תקווה",
  etd: null,
  originalEta: { value: daysFromToday(29), source: "priority", sourceLabel: "Priority PO", updatedAt: daysFromToday(-5) },
  currentEta: null,
  conflictingEta: null,
  status: "production",
  owner: "Dana Levi",
  createdAt: daysFromToday(-5),
  lastUpdate: daysFromToday(-5),
  timeline: [{ id: eid("t"), date: daysFromToday(-5), title: "הזמנת רכש נוצרה", source: "priority", sourceLabel: "Priority" }],
  emails: [],
  tasks: [],
};

export const shipments: Shipment[] = [
  s4501, s4512, s4523, s4582, s4599, s4610, s4623, s4634,
  s4645, s4656, s4657, s4668, s4679, s4690, s4701,
];

// ---------------------------------------------------------------------------
// Incoming email inbox — raw, unprocessed emails for the AI pipeline demo.
// ---------------------------------------------------------------------------
export const incomingEmails: IncomingEmail[] = [
  {
    id: "in-1",
    from: "logistics@msc.com",
    fromCompany: "MSC",
    subject: "Container departed — PO-4512",
    body:
      "Hi Sarit,\n\nThe container for PO-4512 (MSCU2207714) departed Shenzhen this morning aboard MSC Bellissima.\nCurrent ETA to Haifa is in 22 days.\n\nRegards,\nMSC Tracking Team",
    receivedAt: daysFromToday(-1, 14),
    processed: false,
  },
  {
    id: "in-2",
    from: "leo.deng@dg-dampersys.cn",
    fromCompany: "Dongguan Damper Systems",
    subject: "Container number confirmed — PO-4623",
    body:
      "Hi Sarit,\n\nApologies for the delay in sharing this. The forwarder confirmed the container number for your order:\nContainer: EVGU4471029\n\nLet me know if you need anything else.\n\nBest,\nLeo",
    receivedAt: daysFromToday(-1, 9),
    processed: false,
  },
  {
    id: "in-3",
    from: "helen.wu@qd-insulation.cn",
    fromCompany: "Qingdao Industrial Insulation",
    subject: "Updated completion date — PO-4599",
    body:
      "Dear Sarit,\n\nFurther to our last message, the ceramic wrap production backlog has cleared and the rolls are ready for dispatch. Revised ship-ready ETA to Haifa is in 4 days.\n\nWe're very sorry for the inconvenience.\n\nHelen Wu",
    receivedAt: daysFromToday(0, 8),
    processed: false,
  },
  {
    id: "in-4",
    from: "sales@hz-dampertech.cn",
    fromCompany: "Hangzhou Damper Technologies",
    subject: "Damper actuator shipment on its way",
    body:
      "Hi,\n\nJust a quick note that the actuator batch is now heading to the port for loading. Should be on a vessel within the next couple of days. We'll confirm the container once it's assigned.\n\nThanks,\nHangzhou Damper Technologies",
    receivedAt: daysFromToday(0, 10),
    processed: false,
  },
  {
    id: "in-5",
    from: "chen.wei@gz-hvaccomp.cn",
    fromCompany: "Guangzhou HVAC Components",
    subject: "Re: Container booking status — PO-4634",
    body:
      "Hi Dana,\n\nSorry for the slow reply — the container booking is confirmed now: MSCU5591037. Departure is expected within 3 days.\n\nBest regards,\nChen Wei",
    receivedAt: daysFromToday(0, 11),
    processed: false,
  },
  {
    id: "in-6",
    from: "newsletter@freightinsights.com",
    fromCompany: "Freight Insights Weekly",
    subject: "5 ways to optimize your Q4 shipping budget",
    body:
      "Hi there,\n\nCheck out our latest report on ocean freight rate trends and how to save on your Q4 shipping costs. Read more on our blog...\n\nUnsubscribe here.",
    receivedAt: daysFromToday(-1, 6),
    processed: false,
  },
  // AI-assisted-fallback demo: a genuine operational problem (customs hold)
  // that none of the deterministic exception rules were written to
  // recognize — see classify()/interpretUnknownEvent() in lib/ai-pipeline.ts.
  {
    id: "in-7",
    from: "wei.chen@gz-firesafety.cn",
    fromCompany: "Guangzhou Fire Safety Equipment",
    subject: "Urgent — shipment held at customs",
    body:
      "Hi Sarit,\n\nCustoms has placed the shipment on hold due to missing import documentation. We're trying to find out exactly what's missing and will update as soon as we know more.\n\nBest,\nWei Chen",
    receivedAt: daysFromToday(0, 7),
    processed: false,
  },
  // Source-conflict demo: PO-4668's currentEta is already carrier-sourced
  // (COSCO Tracking) — a supplier email proposing a different date must not
  // silently overwrite it. See hasAuthorityConflict() in lib/ai-pipeline.ts.
  {
    id: "in-8",
    from: "amy.lin@xiamen-fireprotect.cn",
    fromCompany: "Xiamen Fire Protection Materials",
    subject: "Updated arrival estimate — PO-4668",
    body:
      "Hi Sarit,\n\nOur forwarder just told us the vessel is running ahead of schedule — PO-4668 should now arrive in 7 days instead of originally planned.\n\nBest,\nAmy",
    receivedAt: daysFromToday(0, 6),
    processed: false,
  },
  // Carrier self-revision demo: PO-4679's currentEta is already carrier-
  // sourced (Maersk Tracking, updated today at 09:00) and this is a NEWER
  // message from that SAME carrier, so it's a legitimate revision — not a
  // conflict — and should auto-apply. See the isKnownCarrier branch in
  // processEmail() (lib/ai-pipeline.ts), which now checks freshness instead
  // of routing same-source updates through hasAuthorityConflict.
  {
    id: "in-9",
    from: "tracking@maersk.com",
    fromCompany: "Maersk",
    subject: "ETA revision — PO-4679",
    body:
      "Hi Sarit,\n\nOur tracking system now shows a revised ETA for PO-4679 — the vessel is running behind schedule and the container should now arrive in 8 days instead of the previous estimate.\n\nMaersk Tracking",
    receivedAt: daysFromToday(0, 16),
    processed: false,
  },
];
