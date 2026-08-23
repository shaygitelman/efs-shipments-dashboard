import { Shipment } from "@/lib/types";
import { lineTotal, poTotal, outstandingBalance, paymentStatusLabel, formatCurrency } from "@/lib/finance";
import { formatDate } from "@/lib/dates";
import { EXECUTION_ANCHORS } from "@/lib/execution-path";
import { SourceTag } from "./source-tag";
import { Ltr } from "./ltr";
import { cn } from "@/lib/utils";

const paymentStatusStyle: Record<Shipment["payment"]["status"], string> = {
  paid: "bg-success/15 text-success-foreground",
  partial: "bg-warning/15 text-warning-foreground",
  unpaid: "bg-destructive/10 text-destructive",
};

export function OrderDetails({ shipment }: { shipment: Shipment }) {
  const total = poTotal(shipment);
  const balance = outstandingBalance(shipment);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">פרטי הזמנה</h2>
          <p className="text-xs text-muted-foreground">
            תאריך הזמנה: <Ltr>{formatDate(shipment.createdAt, true)}</Ltr>
          </p>
        </div>
        <SourceTag source="priority" label="Priority · כספים" />
      </div>

      <div id={EXECUTION_ANCHORS.payment} className="scroll-mt-24 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border px-5 py-3 transition-shadow">
        <div>
          <p className="text-xs text-muted-foreground">סה&quot;כ הזמנה</p>
          <p className="text-lg font-semibold text-foreground">
            <Ltr>{formatCurrency(total, shipment.currency)}</Ltr>
          </p>
        </div>
        {shipment.payment.status !== "unpaid" && (
          <div>
            <p className="text-xs text-muted-foreground">שולם</p>
            <p className="text-sm font-medium text-foreground">
              <Ltr>{formatCurrency(shipment.payment.amountPaid, shipment.currency)}</Ltr>
            </p>
          </div>
        )}
        {balance > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">יתרה לתשלום</p>
            <p className="text-sm font-medium text-foreground">
              <Ltr>{formatCurrency(balance, shipment.currency)}</Ltr>
            </p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground">סטטוס תשלום</p>
          <span className={cn("mt-0.5 inline-block rounded-md px-2 py-0.5 text-xs font-medium", paymentStatusStyle[shipment.payment.status])}>
            {paymentStatusLabel(shipment.payment.status)}
          </span>
        </div>
        {shipment.payment.dueDate && (
          <div>
            <p className="text-xs text-muted-foreground">מועד פירעון</p>
            <p className="text-sm font-medium text-foreground">
              <Ltr>{formatDate(shipment.payment.dueDate, true)}</Ltr>
            </p>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-5 py-2 text-start font-medium">מוצר</th>
              <th className="px-5 py-2 text-start font-medium">מק&quot;ט</th>
              <th className="px-5 py-2 text-start font-medium">כמות</th>
              <th className="px-5 py-2 text-start font-medium">מחיר ליחידה</th>
              <th className="px-5 py-2 text-start font-medium">סה&quot;כ</th>
            </tr>
          </thead>
          <tbody>
            {shipment.products.map((p) => (
              <tr key={p.sku} className="border-b border-border last:border-0">
                <td dir="ltr" className="px-5 py-2.5 text-start">{p.name}</td>
                <td className="px-5 py-2.5 text-muted-foreground">
                  <Ltr>{p.sku}</Ltr>
                </td>
                <td className="px-5 py-2.5">
                  <Ltr>
                    {p.quantity.toLocaleString()} {p.unit}
                  </Ltr>
                </td>
                <td className="px-5 py-2.5 text-muted-foreground">
                  <Ltr>{formatCurrency(p.unitPrice, shipment.currency)}</Ltr>
                </td>
                <td className="px-5 py-2.5 font-medium">
                  <Ltr>{formatCurrency(lineTotal(p), shipment.currency)}</Ltr>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
