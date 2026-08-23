"use client";

import { useParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import {
  ShipmentHeader,
  ShipmentOverview,
  ShipmentTimeline,
  ShipmentEmails,
  ShipmentTasks,
} from "@/components/shipment-detail";
import { OrderDetails } from "@/components/order-details";

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const shipment = useAppStore((s) => s.shipments.find((sh) => sh.id === id));

  if (!shipment) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        המשלוח לא נמצא.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ShipmentHeader shipment={shipment} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <ShipmentOverview shipment={shipment} />
          <ShipmentTimeline shipment={shipment} />
          <OrderDetails shipment={shipment} />
        </div>
        <div className="flex flex-col gap-6">
          <ShipmentEmails shipment={shipment} />
          <ShipmentTasks shipment={shipment} />
        </div>
      </div>
    </div>
  );
}
