import { cn } from "@/lib/utils";

// Wraps identifiers, dates, and other Latin/numeric content so the RTL bidi
// algorithm doesn't reorder them inside Hebrew sentence flow.
export function Ltr({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span dir="ltr" className={cn("ltr-isolate inline-block", className)}>
      {children}
    </span>
  );
}
