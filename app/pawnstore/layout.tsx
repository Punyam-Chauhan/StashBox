import type { Metadata } from "next";
import type { ReactNode } from "react";
export const metadata: Metadata = {
  title: "The Pawn Shop — Campus exchange",
  description: "Buy, sell and pass useful things on across campus.",
  icons: { icon: "/pawn-shop-mark.svg" },
};
export default function PawnLayout({ children }: { children: ReactNode }) {
  return children;
}
