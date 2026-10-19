"use client";
import { CATALOG, type Listing } from "../../domain/shared";

export function demoListings(hostel: string): Listing[] {
  const offers = [
    [
      [224, "Demo Stasher A", 2500],
      [179, "Demo Stasher B", 2000],
      [212, "Demo Stasher C", 2200],
    ],
    [
      [146, "Demo Stasher D", 3500],
      [224, "Demo Stasher A", 4000],
    ],
    [
      [265, "Demo Stasher E", 1800],
      [179, "Demo Stasher B", 2000],
    ],
    [[212, "Demo Stasher C", 2000]],
    [
      [224, "Demo Stasher A", 3500],
      [146, "Demo Stasher D", 3000],
    ],
    [[265, "Demo Stasher E", 4000]],
  ] as const;
  return offers.flatMap((rows, i) =>
    rows.map(([room, name, price], j) => ({
      id: `demo-${i}-${j}`,
      product_key: CATALOG[i].key,
      name: CATALOG[i].name,
      size: CATALOG[i].size,
      mrp: [2000, 3000, 1400, 2000, 3000, 4000][i],
      photo_id: null,
      category: CATALOG[i].category,
      price,
      available: 1,
      seller_id: `demo-${room}`,
      seller_name: name,
      room: String(room),
      hostel,
      wing: ["A", "B", "East"][j % 3],
      phase: hostel === "mandakini" ? ["1", "3", "2"][j % 3] : null,
      phone: null,
      is_open: room === 146 ? 0 : 1,
      confirmed_at: Date.now() - (j + 1) * 600000,
    })),
  );
}
