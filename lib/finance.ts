// Deterministic PO/finance math — line totals, PO totals, outstanding
// balance, overdue detection. All derived from stored fields at render/rule
// time rather than duplicated in mock data, so there's a single source of
// truth and nothing can drift out of sync.
import { Shipment, Product } from "./types";
import { diffDays, TODAY } from "./dates";

export function lineTotal(product: Product): number {
  // Round to the nearest cent so binary floating-point noise (e.g.
  // 30000 * 4.1 === 122999.99999999999) never leaks into totals or display.
  return Math.round(product.quantity * product.unitPrice * 100) / 100;
}

export function poTotal(shipment: Shipment): number {
  const sum = shipment.products.reduce((total, p) => total + lineTotal(p), 0);
  return Math.round(sum * 100) / 100;
}

export function outstandingBalance(shipment: Shipment): number {
  const raw = poTotal(shipment) - shipment.payment.amountPaid;
  return Math.max(0, Math.round(raw * 100) / 100);
}

export function isPaymentOverdue(shipment: Shipment): boolean {
  const { payment } = shipment;
  if (payment.status === "paid" || !payment.dueDate) return false;
  return diffDays(TODAY.toISOString(), payment.dueDate) > 0;
}

export function paymentOverdueDays(shipment: Shipment): number {
  if (!shipment.payment.dueDate) return 0;
  const d = diffDays(TODAY.toISOString(), shipment.payment.dueDate);
  return d > 0 ? d : 0;
}

export function paymentStatusLabel(status: Shipment["payment"]["status"]): string {
  switch (status) {
    case "paid":
      return "שולם";
    case "partial":
      return "שולם חלקית";
    case "unpaid":
      return "טרם שולם";
  }
}

const currencySymbols: Record<string, string> = { USD: "$", EUR: "€", ILS: "₪" };

// Whole totals (PO totals, balances) round cleanly to the nearest unit, but
// per-unit prices are often well under $1 (e.g. $0.015/pc for bulk
// fasteners) — rounding those to 0 decimals would display as "$0" and make
// the line total look wrong. Show as many decimals as the value needs, up
// to 3 for sub-$1 amounts.
export function formatCurrency(amount: number, currency: string): string {
  const symbol = currencySymbols[currency] ?? currency + " ";
  const decimals = Number.isInteger(amount) ? 0 : Math.abs(amount) < 1 ? 3 : 2;
  return `${symbol}${amount.toLocaleString(undefined, { maximumFractionDigits: decimals })}`;
}
