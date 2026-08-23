import { Shipment } from "@/lib/types";
import { JOURNEY_STAGES, journeyStageIndex } from "@/lib/journey";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function JourneyStepper({ shipment }: { shipment: Shipment }) {
  const current = journeyStageIndex(shipment);

  return (
    <div className="flex items-center">
      {JOURNEY_STAGES.map((stage, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={stage} className="flex items-center last:flex-initial flex-1">
            <div className="flex flex-col items-center gap-2">
              <span
                className={cn(
                  "relative flex size-7 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300",
                  done && "bg-teal text-white shadow-[0_0_9px_-2px_var(--teal)]",
                  active && "bg-cyan text-white ring-4 ring-cyan/14 shadow-[0_0_11px_-2px_var(--cyan)]",
                  !done && !active && "border border-border bg-muted text-muted-foreground"
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
                {active && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan opacity-20" />
                )}
              </span>
              <span
                className={cn(
                  "text-[11px] whitespace-nowrap",
                  active ? "font-semibold text-cyan" : done ? "text-foreground/70" : "text-muted-foreground"
                )}
              >
                {stage}
              </span>
            </div>
            {i < JOURNEY_STAGES.length - 1 && (
              <div className="relative mx-1.5 h-0.5 flex-1 overflow-hidden rounded-full bg-border">
                {done && <div className="absolute inset-0 bg-gradient-to-l from-teal to-cyan" />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
