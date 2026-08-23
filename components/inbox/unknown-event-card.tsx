"use client";

import { useState } from "react";
import Link from "next/link";
import { IncomingEmail, Shipment } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { Ltr } from "@/components/ltr";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, CheckCircle2, Pencil, XCircle } from "lucide-react";

const confidenceLabel: Record<"high" | "medium", string> = {
  high: "גבוהה",
  medium: "בינונית",
};

const confidenceTone: Record<"high" | "medium", string> = {
  high: "text-success-foreground",
  medium: "text-attention-foreground",
};

// The one UI surface for the AI-assisted fallback described in the exception
// engine: an "unknown-event" email never touches a shipment on its own —
// this card only ever proposes. Nothing is written until Sarit clicks
// "אישור הפעולה" (see approveUnknownEvent in lib/store.ts).
export function UnknownEventCard({
  email,
  matchedShipment,
}: {
  email: IncomingEmail;
  matchedShipment: Shipment | undefined;
}) {
  const approveUnknownEvent = useAppStore((s) => s.approveUnknownEvent);
  const dismissUnknownEvent = useAppStore((s) => s.dismissUnknownEvent);
  const [editing, setEditing] = useState(false);
  const [actionText, setActionText] = useState(email.unknownEvent?.suggestedAction ?? "");

  const ue = email.unknownEvent;
  if (!ue) return null;

  const canApprove = ue.suggestedAction !== null && !!matchedShipment;

  return (
    <div className="rounded-md border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-500/25 dark:bg-violet-500/10">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-violet-700 dark:text-violet-300">
        <Sparkles className="size-4" />
        אירוע חדש שהמערכת לא מכירה — נדרשת החלטה שלך
      </div>

      <p className="text-sm">
        <span className="font-medium text-foreground">מה קרה: </span>
        <span className="text-muted-foreground">{ue.summary}</span>
      </p>

      {ue.suggestedAction !== null ? (
        <div className="mt-2.5">
          <p className="mb-1 text-xs font-medium text-muted-foreground">פעולה מוצעת</p>
          {editing ? (
            <Textarea
              value={actionText}
              onChange={(e) => setActionText(e.target.value)}
              rows={2}
              className="text-sm"
              autoFocus
            />
          ) : (
            <p className="text-sm text-foreground">{actionText}</p>
          )}
        </div>
      ) : (
        <p className="mt-2.5 text-sm font-medium text-attention-foreground">
          לא ניתן לקבוע פעולה בביטחון — נדרשת בדיקה ידנית
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {matchedShipment && (
          <span>
            שויך ל-
            <Link href={`/shipments/${matchedShipment.id}`} className="font-medium text-primary hover:underline">
              <Ltr>{matchedShipment.poNumber}</Ltr>
            </Link>
          </span>
        )}
        {/* Deliberately labeled "בפרשנות" (interpretation), not just "רמת
            ביטחון" — this card sits directly below the email-match confidence
            shown above (how sure we are which shipment this is), and the two
            numbers are unrelated. Reusing the same label for both would read
            as a contradiction when they differ, as they do here (72% match
            vs 78% interpretation). The raw score itself stays a de-emphasized
            parenthetical, not the headline — the word is what Sarit reads. */}
        {ue.confidenceScore !== null && (ue.confidenceLevel === "high" || ue.confidenceLevel === "medium") ? (
          <span className={confidenceTone[ue.confidenceLevel]}>
            רמת ביטחון בפרשנות: {confidenceLabel[ue.confidenceLevel]}{" "}
            <span className="text-muted-foreground/70">(<Ltr>{Math.round(ue.confidenceScore * 100)}%</Ltr>)</span>
          </span>
        ) : (
          <span>רמת ביטחון בפרשנות: נמוכה</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {canApprove && !editing && (
          <>
            <Button size="sm" onClick={() => approveUnknownEvent(email.id, actionText)}>
              <CheckCircle2 className="size-3.5" />
              אישור הפעולה
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" />
              עריכת הפעולה
            </Button>
          </>
        )}
        {canApprove && editing && (
          <Button size="sm" onClick={() => approveUnknownEvent(email.id, actionText)}>
            <CheckCircle2 className="size-3.5" />
            שמירה ואישור
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => dismissUnknownEvent(email.id)}>
          <XCircle className="size-3.5" />
          התעלם
        </Button>
      </div>
    </div>
  );
}
