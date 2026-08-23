import { CommunicationStatus } from "@/lib/types";
import { MailQuestion, Mail, MailCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const meta: Record<Exclude<CommunicationStatus, "none">, { icon: React.ElementType; label: string; className: string }> = {
  "needs-reply": { icon: MailQuestion, label: "דורש מענה", className: "text-destructive bg-destructive/10" },
  waiting: { icon: Mail, label: "ממתין לתשובה", className: "text-attention-foreground bg-attention/15" },
  answered: { icon: MailCheck, label: "נענה", className: "text-success-foreground bg-success/15" },
};

export function CommunicationBadge({ status, className }: { status: CommunicationStatus; className?: string }) {
  if (status === "none") return <span className={cn("text-xs text-muted-foreground", className)}>—</span>;
  const m = meta[status];
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", m.className, className)}>
      <Icon className="size-3" />
      {m.label}
    </span>
  );
}
