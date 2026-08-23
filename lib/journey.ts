// Derives a friendlier 5-stage visual journey from the existing shipment
// status/fields, purely for display. This does NOT replace or alter
// ShipmentStatus, effectiveStatus, or any exception/filtering logic — it's
// an additional read-only view computed from the same source fields.
import { Shipment } from "./types";
import { effectiveStatus, isArrivingSoon } from "./rules";

export const JOURNEY_STAGES = ["בייצור", "מוכן לשילוח", "בדרך", "בנמל", "הגיע"] as const;

export function journeyStageIndex(shipment: Shipment): number {
  const status = effectiveStatus(shipment);

  if (status === "arrived") return 4;
  if (status === "in-transit" || status === "delayed") {
    return isArrivingSoon(shipment) ? 3 : 2;
  }
  if (status === "arriving-soon") return 3;
  // still "production": ready-to-ship once a departure date has been booked
  return shipment.etd ? 1 : 0;
}

// Pure lifecycle label ("where is it") — deliberately independent of any
// exception/delay state. Use this instead of statusLabel(effectiveStatus())
// wherever "delayed" must not overwrite the shipment's actual stage.
export function journeyStageLabel(shipment: Shipment): string {
  return JOURNEY_STAGES[journeyStageIndex(shipment)];
}
