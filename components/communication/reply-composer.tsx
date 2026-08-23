"use client";

import { useState } from "react";
import { Shipment, RecommendedAction, DraftEmail, IncomingEmail } from "@/lib/types";
import { generateDraftForAction, generateReplyForIncomingEmail } from "@/lib/communication-agent";
import { useAppStore } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Ltr } from "@/components/ltr";
import { Sparkles, RefreshCw, Pencil, Eye, Send, CheckCircle2 } from "lucide-react";

interface ReplyComposerProps {
  // Nullable so a caller that only resolves the shipment once a target is
  // picked (see app/inbox/page.tsx) can still mount this component
  // unconditionally from the start — see the note on `wasOpen` below for why
  // that unconditional mount matters.
  shipment: Shipment | null;
  action: RecommendedAction | null;
  // When set, the draft is grounded in this specific incoming email (who
  // sent it, what it said) instead of the shipment's own top exception, and
  // sending routes through replyToEmail so the originating inbox card moves
  // to "ממתין לתשובה". Absent for the Shipment 360 "ביצוע" entry point,
  // which has no single triggering email in mind.
  email?: IncomingEmail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function buildDraft(shipment: Shipment, action: RecommendedAction | null, email: IncomingEmail | null | undefined, variant: 0 | 1): DraftEmail | null {
  // A follow-up always uses the shipment-level follow-up template, even when
  // triggered alongside an email (see the "ממתין לתשובה" card) — it's a
  // nudge on the whole thread, not a reply grounded in one message.
  if (action?.kind === "no-response") return generateDraftForAction(shipment, action, variant);
  if (email) return generateReplyForIncomingEmail(shipment, email, variant);
  if (!action) return null;
  return generateDraftForAction(shipment, action, variant);
}

export function ReplyComposer({ shipment, action, email, open, onOpenChange }: ReplyComposerProps) {
  const sendReply = useAppStore((s) => s.sendReply);
  const replyToEmail = useAppStore((s) => s.replyToEmail);
  const [variant, setVariant] = useState<0 | 1>(0);
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [draft, setDraft] = useState<DraftEmail | null>(null);
  const [sent, setSent] = useState(false);

  // Each fresh open should start from a clean, freshly-generated draft
  // rather than whatever was left over from a previous session. Resetting
  // state during render (not in an effect) on the open-prop's rising edge
  // is the pattern React recommends for this — it avoids an extra
  // effect-triggered render pass. This ONLY detects a transition if the
  // component was already mounted beforehand with open=false — a caller
  // that conditionally mounts this component exactly when it becomes
  // openable would mount it already "open", so this edge would never fire
  // and draft would stay null forever. Callers must mount it unconditionally
  // (shipment/email may be null while closed) for this to work.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && shipment) {
      setDraft(buildDraft(shipment, action, email, 0));
      setVariant(0);
      setMode("preview");
      setSent(false);
    }
  }

  if (!shipment || !draft) return null;

  const regenerate = () => {
    const nextVariant: 0 | 1 = variant === 0 ? 1 : 0;
    setVariant(nextVariant);
    setDraft(buildDraft(shipment, action, email, nextVariant));
    setMode("preview");
  };

  const handleSend = () => {
    if (!draft) return;
    if (email) replyToEmail(email.id, draft, action ?? null);
    else sendReply(shipment.id, draft, action ?? null);
    setSent(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="size-6" />
            </span>
            <div>
              <p className="text-base font-semibold text-foreground">התשובה נרשמה במערכת</p>
              <p className="mt-1 text-sm text-muted-foreground">
                סטטוס התקשורת עודכן ל&quot;ממתין לתשובה&quot;, ציר הזמן עודכן, ונוצרה משימת מעקב.
              </p>
            </div>
            <Button onClick={() => onOpenChange(false)} className="mt-2">
              סגירה
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                יצירת תשובה
              </DialogTitle>
              {action && (
                <p className="text-xs text-muted-foreground">
                  פעולה מומלצת: <span className="font-medium text-foreground">{action.label}</span>
                </p>
              )}
            </DialogHeader>

            <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              טיוטה שנוצרה על סמך נתוני המשלוח — יש לבדוק לפני שליחה.
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-14 shrink-0 text-muted-foreground">אל:</span>
                {mode === "edit" ? (
                  <Input
                    dir="ltr"
                    value={draft.to}
                    onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                    className="h-8 flex-1 text-start text-sm"
                  />
                ) : (
                  <Ltr className="text-sm font-medium text-foreground">{draft.to}</Ltr>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-14 shrink-0 text-muted-foreground">נושא:</span>
                {mode === "edit" ? (
                  <Input
                    dir="ltr"
                    value={draft.subject}
                    onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                    className="h-8 flex-1 text-start text-sm"
                  />
                ) : (
                  <p dir="ltr" className="flex-1 text-start text-sm font-medium text-foreground">
                    {draft.subject}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-14 shrink-0 text-muted-foreground">הזמנה:</span>
                <Ltr className="text-sm font-medium text-primary">{shipment.poNumber}</Ltr>
              </div>
              {mode === "edit" ? (
                <Textarea
                  dir="ltr"
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  rows={9}
                  className="text-start text-sm"
                />
              ) : (
                <div
                  dir="ltr"
                  className="max-h-64 overflow-y-auto rounded-md border border-border bg-muted/30 px-3 py-2.5 text-start text-sm whitespace-pre-line text-foreground"
                >
                  {draft.body}
                </div>
              )}
            </div>

            <DialogFooter>
              {mode === "preview" ? (
                <Button variant="outline" onClick={() => setMode("edit")}>
                  <Pencil className="size-3.5" />
                  עריכה
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setMode("preview")}>
                  <Eye className="size-3.5" />
                  תצוגה מקדימה
                </Button>
              )}
              <Button variant="outline" onClick={regenerate}>
                <RefreshCw className="size-3.5" />
                ניסוח מחדש
              </Button>
              <Button onClick={handleSend}>
                <Send className="size-3.5" />
                שליחה
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
