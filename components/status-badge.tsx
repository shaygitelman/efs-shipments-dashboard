import { cn } from "@/lib/utils";
import { Shipment, ShipmentStatus, Exception } from "@/lib/types";
import { statusLabel, OperationalState, operationalStateLabel } from "@/lib/rules";
import { JOURNEY_STAGES, journeyStageIndex } from "@/lib/journey";
import {
  Factory,
  Package,
  Ship,
  Anchor,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  MailQuestion,
  Sparkles,
} from "lucide-react";

const statusStyles: Record<ShipmentStatus, string> = {
  production: "bg-muted text-muted-foreground border-border",
  "in-transit": "bg-info/10 text-info-foreground border-info/20",
  "arriving-soon": "bg-warning/15 text-warning-foreground border-warning/25",
  arrived: "bg-success/15 text-success-foreground border-success/25",
  delayed: "bg-destructive/10 text-destructive border-destructive/25",
};

const statusIcons: Record<ShipmentStatus, React.ElementType> = {
  production: Factory,
  "in-transit": Ship,
  "arriving-soon": Clock3,
  arrived: CheckCircle2,
  delayed: AlertTriangle,
};

export function StatusBadge({ status, className }: { status: ShipmentStatus; className?: string }) {
  const Icon = statusIcons[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium whitespace-nowrap",
        statusStyles[status],
        className
      )}
    >
      <Icon className="size-3.5" />
      {statusLabel(status)}
    </span>
  );
}

const severityStyles: Record<Exception["severity"], string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-attention/15 text-attention-foreground",
  low: "bg-info/10 text-info-foreground",
};

export function SeverityDot({ severity, pulse = false }: { severity: Exception["severity"]; pulse?: boolean }) {
  return (
    <span className="relative inline-flex size-2">
      {pulse && (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-60" />
      )}
      <span
        className={cn(
          "relative inline-block size-2 rounded-full",
          severity === "high" ? "bg-destructive" : severity === "medium" ? "bg-attention" : "bg-info/60"
        )}
      />
    </span>
  );
}

export function SeverityBadge({ severity, children }: { severity: Exception["severity"]; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", severityStyles[severity])}>
      {children}
    </span>
  );
}

// "סטטוס משלוח" — pure lifecycle position (בייצור/מוכן לשילוח/בדרך/בנמל/הגיע).
// Always neutral in color: lifecycle progress is not itself good or bad, so
// it must never borrow the red/amber tones that belong to operational
// health (see OperationalStateBadge below) — that borrowing is exactly the
// conflation this component exists to avoid.
const lifecycleIcons = [Factory, Package, Ship, Anchor, CheckCircle2];

export function LifecycleBadge({ shipment, className }: { shipment: Shipment; className?: string }) {
  const idx = journeyStageIndex(shipment);
  const Icon = lifecycleIcons[idx];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-cyan/20 bg-cyan/10 px-2 py-1 text-xs font-medium whitespace-nowrap text-cyan",
        className
      )}
    >
      <Icon className="size-3.5" />
      {JOURNEY_STAGES[idx]}
    </span>
  );
}

// "מצב תפעולי" — operational health, independent of lifecycle position.
const operationalStateStyles: Record<OperationalState, string> = {
  ok: "bg-success/15 text-success-foreground border-success/25",
  attention: "bg-attention/15 text-attention-foreground border-attention/25",
  "missing-info": "bg-warning/15 text-warning-foreground border-warning/25",
  delayed: "bg-destructive/10 text-destructive border-destructive/25",
  conflicting: "bg-destructive/10 text-destructive border-destructive/25",
  "waiting-response": "bg-info/10 text-info-foreground border-info/20",
  // Distinct violet tone — reserved for AI-origin, human-approved findings
  // (see lib/store.ts approveUnknownEvent) so it's visually distinguishable
  // from the deterministic-rule states above.
  "needs-review": "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30",
};

const operationalStateIcons: Record<OperationalState, React.ElementType> = {
  ok: CheckCircle2,
  attention: AlertCircle,
  "missing-info": HelpCircle,
  delayed: AlertTriangle,
  conflicting: AlertTriangle,
  "waiting-response": MailQuestion,
  "needs-review": Sparkles,
};

export function OperationalStateBadge({ state, className }: { state: OperationalState; className?: string }) {
  const Icon = operationalStateIcons[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium whitespace-nowrap",
        operationalStateStyles[state],
        className
      )}
    >
      <Icon className="size-3.5" />
      {operationalStateLabel(state)}
    </span>
  );
}
