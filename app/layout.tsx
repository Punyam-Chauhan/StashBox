import type { Metadata } from "next";
import "./stashbox.css";
import "./hostels.css";
import "./photos.css";
import "./readability.css";

export const metadata: Metadata = {
  title: "StashBox — Your hostel’s midnight menu",
  description: "Find your next snack, compare prices across rooms, and meet your hostel’s midnight suppliers. Walk over. Pay directly. Craving sorted.",
  icons: {
    icon: "/stashbox-icon.svg",
    shortcut: "/stashbox-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
