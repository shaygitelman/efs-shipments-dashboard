import Link from "next/link";
import { History, ChevronLeft } from "lucide-react";
import { IncomingEmail, Shipment } from "@/lib/types";
import { getTodayDigest } from "@/lib/today-digest";
import { Ltr } from "@/components/ltr";

const VISIBLE_LIMIT = 4;

// Deliberately the quietest section on the page: no severity colors, no
// badges, one line per row. Needs Attention (below) already owns the
// red/orange "something is wrong" language — this only ever answers "what's
// new," so it stays neutral even when the underlying shipment is a problem.
export function TodayDigest({ shipments, emails }: { shipments: Shipment[]; emails: IncomingEmail[] }) {
  const items = getTodayDigest(emails, shipments);
  const visible = items.slice(0, VISIBLE_LIMIT);
  const overflow = items.length - visible.length;

  return (
    <div className="rounded-2xl border border-border bg-card/90 px-5 py-4 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="size-4 text-cyan/70" />
          <h2 className="text-[15px] font-semibold text-foreground">מה השתנה היום</h2>
        </div>
        {items.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {items.length === 1 ? "עדכון משמעותי אחד" : `${items.length} עדכונים משמעותיים`}
          </span>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">אין עדכונים חדשים מאז הבדיקה האחרונה.</p>
      ) : (
        <div className="mt-2 divide-y divide-border/60">
          {visible.map((item) => (
            <Link
              key={item.emailId}
              href={`/shipments/${item.shipmentId}`}
              className="-mx-1.5 flex items-start gap-2.5 rounded-lg px-1.5 py-2 text-sm transition-colors hover:bg-secondary/40"
            >
              <span className="shrink-0 font-semibold text-cyan">
                <Ltr>{item.poNumber}</Ltr>
              </span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{item.description}</span>
              <ChevronLeft className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/40" />
            </Link>
          ))}
        </div>
      )}

      {overflow > 0 && (
        <Link href="/inbox" className="mt-1 inline-block text-xs font-medium text-cyan hover:underline">
          +{overflow} נוספים
        </Link>
      )}
    </div>
  );
}
