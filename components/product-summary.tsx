import { ProductMatch } from "@/lib/product-search";
import { formatDate } from "@/lib/dates";
import { formatCurrency } from "@/lib/finance";
import { Package } from "lucide-react";

const unitLabels: Record<string, string> = {
  pcs: "יחידות",
  sets: "סטים",
  drums: "חביות",
  rolls: "גלילים",
  sqm: 'מ"ר',
};

function heCount(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : `${n} ${plural}`;
}

export function ProductSummary({ match, query }: { match: ProductMatch; query: string }) {
  // The heading is either one or a few English product names (needs an LTR
  // block so the names don't get bidi-reordered) or a Hebrew fallback
  // sentence when too many distinct products matched.
  const isProductNameHeading = match.productNames.length > 0 && match.productNames.length <= 3;
  const heading = isProductNameHeading
    ? match.productNames.join(" / ")
    : `${match.productNames.length} מוצרים תואמים ל-"${query}"`;

  const qtyText = match.quantityGroups
    .map((g) => `${g.quantity.toLocaleString()} ${unitLabels[g.unit] ?? g.unit}`)
    .join(" + ");

  const clauses: string[] = [
    heCount(match.poCount, "הזמנת רכש אחת", "הזמנות רכש"),
    `${qtyText} בדרך`,
    `בשווי ${formatCurrency(match.totalValue, match.currency)}`,
  ];

  if (match.earliestEta) {
    clauses.push(`הגעה ראשונה: ${formatDate(match.earliestEta, true)}`);
  } else {
    clauses.push("אין ETA זמין עדיין");
  }

  if (match.earliestEta && match.shipmentsWithoutEta > 0) {
    clauses.push(heCount(match.shipmentsWithoutEta, "משלוח אחד ללא ETA", "משלוחים ללא ETA"));
  }

  if (match.delayedCount > 0) {
    clauses.push(heCount(match.delayedCount, "משלוח אחד באיחור", "משלוחים באיחור"));
  }

  if (match.warehouses.length > 0) {
    clauses.push(`יעד: ${match.warehouses.join(", ")}`);
  }

  return (
    <div className="flex items-start gap-3 border-b border-border bg-info/5 px-5 py-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-info/10 text-info-foreground">
        <Package className="size-3.5" />
      </span>
      <div className="min-w-0">
        <p dir={isProductNameHeading ? "ltr" : undefined} className="text-start text-sm font-semibold text-foreground">
          {heading}
        </p>
        <p className="text-xs text-muted-foreground">{clauses.join(" · ")}</p>
      </div>
    </div>
  );
}
