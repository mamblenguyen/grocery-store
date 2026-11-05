export interface Job {
  id: number; status: string; fee: number; codAmount: number; distanceKm: number | null;
  pickupAddress: string; pickupLat: number | null; pickupLng: number | null;
  dropoffAddress: string; dropoffLat: number | null; dropoffLng: number | null;
  shipperLat?: number | null; shipperLng?: number | null; failReason?: string | null;
  assignedAt?: string | null; pickedUpAt?: string | null; deliveredAt?: string | null; createdAt: string;
  toPickupKm?: number | null; etaPickupMin?: number | null; itemCount: number;
  store: { id: number; name: string; slug: string; phone: string | null; address: string | null; lat: number | null; lng: number | null };
  order: {
    id: number; code: string; customerName: string; phone: string; address: string; note: string | null; total: number;
    paymentMethod: string; paymentStatus: string; deliveryDate: string | null; deliverySlot: string | null; status: string; createdAt: string;
    items: { id: number; productName: string; variantName: string; quantity: number; image: string | null; sku: string }[];
  };
}

export interface ShipperMe {
  id: number; fullName: string; email: string; phone: string | null;
  profile: { vehicleType: string; plateNumber: string | null; area: string | null; isOnline: boolean; lat: number | null; lng: number | null };
  stats: { todayTrips: number; todayEarnings: number; todayCod: number; active: number; totalTrips: number; totalEarnings: number };
}
