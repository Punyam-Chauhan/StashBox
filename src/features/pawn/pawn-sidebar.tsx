"use client";
import {
  ArrowLeft,
  ArrowUpRight,
  CircleHelp,
  Plus,
  ShieldCheck,
  Store,
} from "lucide-react";
import type { PawnSection } from "../../shell/navigation";
import { PawnMark } from "./pawn-mark";
export type { PawnSection } from "../../shell/navigation";
export function PawnSidebar({
  section,
  onSection,
  onBack,
  onHelp,
  isMaintainer = false,
}: {
  isMaintainer?: boolean;
  section: PawnSection;
  onSection: (s: PawnSection) => void;
  onBack: () => void;
  onHelp: () => void;
}) {
  const entries = [
    ["all", "Shop floor", Store],
    ["sell", "Deploy The Pawn", Plus],
    ["rules", "Shop rules", ShieldCheck],
  ] as const;
  return (
    <>
      <button
        className="pawn-sidebar-brand"
        onClick={() => onSection("all")}
        aria-label="The Pawn Shop home"
      >
        <span className="pawn-brand-seal">
          <PawnMark size={31} />
        </span>
        <span>
          <strong>The Pawn Shop</strong>
          <small>THE CAMPUS EXCHANGE</small>
        </span>
      </button>
      <button className="pawn-back-link" onClick={onBack}>
        <ArrowLeft size={16} />
        Back to StashBox
      </button>
      <p className="nav-caption">YOUR CORNER OF THE SHOP</p>
      <nav aria-label="Pawn Shop navigation">
        {entries.map(([key, label, Icon]) => (
          <button
            key={key}
            className={`nav-item ${section === key ? "active" : ""}`}
            onClick={() => onSection(key)}
            aria-current={section === key ? "page" : undefined}
          >
            <Icon size={19} />
            {label}
          </button>
        ))}
        {isMaintainer && (
          <button
            className={`nav-item ${section === "maintainer" ? "active" : ""}`}
            onClick={() => onSection("maintainer")}
          >
            <ShieldCheck size={19} />
            Maintainer
          </button>
        )}
      </nav>
      <div className="pawn-sidebar-note">
        <span aria-hidden="true">✳</span>
        <p>
          Good things.
          <br />
          <em>Second chapters.</em>
        </p>
        <small>
          Buy, sell, pass it on.
          <br />
          Across every hostel.
        </small>
      </div>
      <div className="sidebar-bottom">
        <button onClick={onHelp}>
          <CircleHelp size={21} />
          <span>
            Maintainer ·<strong>Punyam Chauhan</strong>
          </span>
          <ArrowUpRight size={16} />
        </button>
        <div className="sidebar-footer">
          <span>A STASHBOX SIDE STREET.</span>
          <span>EST. 2026</span>
        </div>
      </div>
    </>
  );
}
export function PawnAppSwitch({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      className="pawn-app-switch"
      aria-label="The Pawn Shop"
      onClick={onOpen}
    >
      <span>
        <PawnMark size={21} />
        The Pawn Shop
        <ArrowUpRight size={16} />
      </span>
      <small>Buy & sell across campus</small>
    </button>
  );
}
