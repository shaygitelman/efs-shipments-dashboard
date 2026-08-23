"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCcw, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Demo-only utility — not part of Sarit's normal workflow, so it's styled to
// blend quietly into the header rather than look like a product feature.
// Rebuilds shipments/emails from lib/mock-data.ts via the exact same
// pipeline run as first load (lib/store.ts resetDemo/createInitialState) —
// every store action is immutable, so the original mock data was never
// mutated in the first place; this just re-derives from it again.
export function DemoReset({ className }: { className?: string }) {
  const resetDemo = useAppStore((s) => s.resetDemo);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  const handleReset = () => {
    resetDemo();
    setDone(true);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setDone(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="איפוס הדמו"
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-header-foreground-muted/70 transition-colors hover:bg-header-foreground/8 hover:text-header-foreground-muted",
          className
        )}
      >
        <RotateCcw className="size-3.5" />
        <span className="hidden sm:inline">איפוס הדמו</span>
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-sm">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="size-6" />
              </span>
              <p className="text-base font-semibold text-foreground">הדמו אופס בהצלחה</p>
              <Button onClick={() => handleOpenChange(false)} className="mt-1">
                סגירה
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>לאפס את הדמו?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                כל הפעולות שבוצעו במהלך הדמו יימחקו והמערכת תחזור למצב ההתחלתי.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  ביטול
                </Button>
                <Button variant="destructive" onClick={handleReset}>
                  איפוס הדמו
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
