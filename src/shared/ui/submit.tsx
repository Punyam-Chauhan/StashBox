"use client";
import { LoaderCircle } from "lucide-react";
import { type ReactNode } from "react";

export function Submit({
  busy,
  children,
}: {
  busy: boolean;
  children: ReactNode;
}) {
  return (
    <button className="button primary full" type="submit" disabled={busy}>
      {busy ? <LoaderCircle size={18} className="spin" /> : children}
    </button>
  );
}
