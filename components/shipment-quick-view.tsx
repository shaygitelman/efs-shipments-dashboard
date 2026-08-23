import Link from "next/link";
import { Shipment } from "@/lib/types";
import { isArrived, delayDays, getExceptions, operationalState } from "@/lib/rules";
import { formatDate, formatDateTime, relativeToToday } from "@/lib/dates";
import { poTotal, paymentStatusLabel, formatCurrency } from "@/lib/finance";
import { communicationStatus } from "@/lib/communication-agent";
import { LifecycleBadge, OperationalStateBadge } from "./status-badge";
import { CommunicationBadge } from "./communication/communication-badge";
import { JourneyStepper } from "./journey-stepper";
import { SourceTag } from "./source-tag";
import { Ltr } from "./ltr";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { AlertTriangle, CheckCircle2, Maximize2, Radar } from "lucide-react";
import { cn } from "@/lib/utils";

const paymentStatusStyle: Record<Shipment["payment"]["status"], string> = {
  paid: "bg-success/15 text-success-foreground",
  partial: "bg-warning/15 text-warning-foreground",
  unpaid: "bg-destructive/10 text-destructive",
};

export function ShipmentQuickView({
  shipment,
  open,
  onOpenChange,
}: {
  shipment: Shipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!shipment) return null;

  const arrived = isArrived(shipment);
  const delay = delayDays(shipment);
  const exceptions = getExceptions(shipment);
  const top = exceptions[0];
  const opState = operationalState(shipment);
  const recentEvents = [...shipment.timeline].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="glass-panel w-full !bg-popover sm:max-w-md">
        <SheetHeader className="relative overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0 bg-radar-glow opacity-60" aria-hidden />
          <div className="relative mb-0.5 flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-cyan/70">
            <Radar className="size-3" />
            תיק תפעולי · צפייה מהירה
          </div>
          <div className="relative flex items-center gap-2">
            <Ltr className="text-lg font-bold text-foreground">{shipment.poNumber}</Ltr>
            <LifecycleBadge shipment={shipment} />
          </div>
          <SheetTitle className="sr-only">{shipment.poNumber}</SheetTitle>
          <p dir="ltr" className="relative text-start text-sm text-muted-foreground">{shipment.supplier}</p>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4">
          <div>
            <p className="text-xs text-muted-foreground">{arrived ? "תאריך הגעה" : "ETA נוכחי"}</p>
            {shipment.currentEta ? (
              <p className="text-base font-semibold text-foreground">
                <Ltr>{formatDate(shipment.currentEta.value)}</Ltr>
                {!arrived && (
                  <span className="text-sm font-normal text-muted-foreground"> ({relativeToToday(shipment.currentEta.value)})</span>
                )}
                {!arrived && delay > 0 && <span className="ms-2 text-sm font-medium text-destructive">(+{delay})</span>}
              </p>
            ) : (
              <p className="text-base font-semibold text-muted-foreground">לא זמין</p>
            )}
          </div>

          <JourneyStepper shipment={shipment} />

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">מחסן יעד</span>
            <span className="font-medium text-foreground">{shipment.destinationWarehouse}</span>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">מצב תפעולי</p>
            <OperationalStateBadge state={opState} />
            {opState !== "ok" && top ? (
              <div className="mt-2 flex items-start gap-2 rounded-md border border-border bg-secondary/40 p-2.5">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">{top.shortMessage}</p>
                  <p className="text-muted-foreground">פעולה: {top.shortAction}</p>
                </div>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2 rounded-md border border-success/20 bg-success/5 p-2.5 text-sm">
                <CheckCircle2 className="size-4 shrink-0 text-success" />
                אין צורך בפעולה — הכול תקין.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-surface/50 px-3.5 py-2.5">
            <div>
              <p className="text-xs text-muted-foreground">סה&quot;כ הזמנה</p>
              <p className="text-sm font-semibold text-foreground tabular-nums">
                <Ltr>{formatCurrency(poTotal(shipment), shipment.currency)}</Ltr>
              </p>
            </div>
            <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", paymentStatusStyle[shipment.payment.status])}>
              {paymentStatusLabel(shipment.payment.status)}
            </span>
          </div>

          {communicationStatus(shipment) !== "none" && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">תקשורת</span>
              <CommunicationBadge status={communicationStatus(shipment)} />
            </div>
          )}

          <div>
            <p className="mb-2.5 text-xs font-medium text-muted-foreground">עדכונים אחרונים</p>
            <ol className="flex flex-col gap-3 border-s border-border ps-3.5">
              {recentEvents.map((event) => (
                <li key={event.id} className="relative text-sm">
                  <span className="absolute top-1.5 -start-[18px] size-1.5 rounded-full bg-cyan" />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-foreground">{event.title}</span>
                    <SourceTag source={event.source} label={event.sourceLabel} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <Ltr>{formatDateTime(event.date)}</Ltr>
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <SheetFooter className="border-t border-border">
          <Button asChild className="w-full glow-ring-sm">
            <Link href={`/shipments/${shipment.id}`}>
              <Maximize2 className="size-3.5" />
              פתיחת תמונה מלאה
            </Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
