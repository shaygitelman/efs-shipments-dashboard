import { cn } from "@/lib/utils";

// Full-page cargo-ship photo, fixed behind the entire page — not scoped to
// the hero card. `position: fixed` (not the `background-attachment: fixed`
// CSS property) is deliberate: it gives the same "doesn't scroll with the
// page" result while avoiding mobile Safari's well-known poor support for
// fixed-attachment backgrounds. Negative z-index keeps it behind every
// normal-flow element (cards, table, nav) without any of them needing their
// own z-index. Purely decorative (aria-hidden), never carries information.
//
// A single theme-aware tint (bg-background at high opacity) sits on top of
// the photo — light card color in Light Mode, the dusk-navy card color in
// Dark Mode — so the same two layers work on both themes with zero
// dark-mode-specific logic: it's just whatever --background already resolves
// to. Individual cards add their own additional translucency on top of this
// (see kpi-band.tsx, needs-attention.tsx, shipments-table.tsx,
// inbox/email-card.tsx, and each page's hero), so text areas end up
// comfortably opaque while gaps between cards clearly show the photo.
export function PageOceanBackground({ positionClassName = "bg-center" }: { positionClassName?: string }) {
  return (
    <div className="fixed inset-0 -z-10" aria-hidden>
      <div
        className={cn("absolute inset-0 bg-cover bg-no-repeat dark:brightness-[0.55] dark:saturate-[0.7]", positionClassName)}
        style={{ backgroundImage: "url('/efs-cargo-ship.jpg')" }}
      />
      <div className="absolute inset-0 bg-background/64 dark:bg-background/85" />
    </div>
  );
}
