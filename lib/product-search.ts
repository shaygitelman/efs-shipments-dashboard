// Aggregates matching product lines across shipments into a single answer
// to "how much of this product is on the way, and when does it arrive?" —
// the management question the assignment calls out explicitly. Deterministic
// arithmetic only, no AI: this is exactly the kind of structured lookup the
// assignment says shouldn't involve an LLM.
import { Shipment } from "./types";
import { delayDays } from "./rules";
import { lineTotal } from "./finance";

export interface QuantityGroup {
  unit: string;
  quantity: number;
}

export interface ProductMatch {
  productNames: string[]; // distinct matched product names, in first-seen order
  poCount: number;
  quantityGroups: QuantityGroup[];
  totalValue: number;
  currency: string; // taken from the first match — mock data uses a single currency
  earliestEta: string | null; // ISO date of the soonest currentEta among matches
  shipmentsWithoutEta: number;
  delayedCount: number;
  warehouses: string[]; // distinct destination warehouses among matches, in first-seen order
}

export function findProductMatch(shipments: Shipment[], query: string): ProductMatch | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const matchedShipmentIds = new Set<string>();
  const productNames: string[] = [];
  const quantityByUnit = new Map<string, number>();
  let totalValue = 0;
  let currency = "USD";

  for (const shipment of shipments) {
    for (const product of shipment.products) {
      if (product.name.toLowerCase().includes(q) || product.sku.toLowerCase().includes(q)) {
        matchedShipmentIds.add(shipment.id);
        if (!productNames.includes(product.name)) productNames.push(product.name);
        quantityByUnit.set(product.unit, (quantityByUnit.get(product.unit) ?? 0) + product.quantity);
        totalValue += lineTotal(product);
        currency = shipment.currency;
      }
    }
  }

  if (matchedShipmentIds.size === 0) return null;

  const relevant = shipments.filter((s) => matchedShipmentIds.has(s.id));
  const etas = relevant.map((s) => s.currentEta?.value).filter((v): v is string => !!v);
  const earliestEta = etas.length ? [...etas].sort()[0] : null;
  const shipmentsWithoutEta = relevant.filter((s) => !s.currentEta && s.status !== "arrived").length;
  const delayedCount = relevant.filter((s) => delayDays(s) > 0).length;
  const warehouses = Array.from(new Set(relevant.map((s) => s.destinationWarehouse)));

  return {
    productNames,
    poCount: matchedShipmentIds.size,
    quantityGroups: Array.from(quantityByUnit.entries()).map(([unit, quantity]) => ({ unit, quantity })),
    totalValue,
    currency,
    earliestEta,
    shipmentsWithoutEta,
    delayedCount,
    warehouses,
  };
}
