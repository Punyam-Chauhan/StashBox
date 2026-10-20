"use client";
import {
  ArrowUpRight,
  Box,
  Building2,
  CircleHelp,
  Compass,
  Moon,
  Package,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";
import { type User } from "../domain/shared";
import {
  PawnAppSwitch,
  PawnSidebar,
  type PawnSection,
} from "../features/pawn/pawn-sidebar";
export function Sidebar({
  pawnEnabled = false,
  menu,
  compactViewport,
  view,
  hostel,
  user,
  pawnSection,
  onClose,
  onModal,
  onChooseHostel,
  onNavigate,
  onPawnSection,
}: {
  pawnEnabled?: boolean;
  menu: boolean;
  compactViewport: boolean;
  view: string;
  hostel: string;
  user: User | null;
  pawnSection: PawnSection;
  onClose: () => void;
  onModal: (name: string) => void;
  onChooseHostel: (id: string) => void;
  onNavigate: (view: string) => void;
  onPawnSection: (section: PawnSection) => void;
}) {
  return (
    <aside
      id="main-sidebar"
      aria-hidden={compactViewport && !menu ? true : undefined}
      inert={compactViewport && !menu ? true : undefined}
      className={`sidebar ${menu ? "mobile-open" : ""}`}
    >
      <button
        className="mobile-drawer-close"
        onClick={() => onClose()}
        aria-label="Close navigation menu"
      >
        <X size={22} />
      </button>
      {view === "pawn" ? (
        <PawnSidebar
          isMaintainer={user?.role === "admin"}
          section={pawnSection}
          onSection={onPawnSection}
          onBack={() => onNavigate("browse")}
          onHelp={() => {
            onClose();
            onModal("help");
          }}
        />
      ) : (
        <>
          <a href="/" className="brand" aria-label="StashBox home">
            <span className="brand-mark">
              <Box size={25} />
            </span>
            stash<span>box</span>
            <sup>®</sup>
          </a>
          {pawnEnabled && <PawnAppSwitch onOpen={() => onNavigate("pawn")} />}
          <div className="hostel-label">
            <i />
            YOUR CAMPUS. MANY STASHES.
          </div>
          <p className="nav-caption">YOUR NIGHT SHIFT</p>
          <nav aria-label="Main navigation">
            <button
              className={`nav-item ${!hostel && view === "browse" ? "active" : ""}`}
              onClick={() => onChooseHostel("")}
            >
              <Building2 size={19} />
              Choose hostel
            </button>
            <button
              className={`nav-item ${view === "browse" && hostel ? "active" : ""}`}
              onClick={() => onNavigate("browse")}
            >
              <Compass size={19} />
              Find a snack<span>↗</span>
            </button>
            <button
              className={`nav-item ${view === "stash" ? "active" : ""}`}
              onClick={() => onNavigate("stash")}
            >
              <Store size={19} />
              My stash
            </button>
            <button
              className={`nav-item ${view === "seller" ? "active" : ""}`}
              onClick={() => onNavigate("seller")}
            >
              <Package size={19} />
              Stasher dashboard
            </button>
            <button
              className="nav-item"
              onClick={() => {
                onClose();
                onModal("how");
              }}
            >
              <CircleHelp size={19} />
              How it works
            </button>
            {user?.role === "admin" && (
              <button
                className={`nav-item ${view === "admin" ? "active" : ""}`}
                onClick={() => onNavigate("admin")}
              >
                <ShieldCheck size={19} />
                Maintainer
              </button>
            )}
          </nav>
          <div className="sidebar-note">
            <Moon size={25} />
            <p>
              Gates closed.
              <br />
              <strong>Cravings open.</strong>
            </p>
            <span>Made for life after in-time.</span>
          </div>
          <div className="sidebar-bottom">
            <button
              onClick={() => {
                onClose();
                onModal("help");
              }}
            >
              <span className="avatar">PC</span>
              <span>
                Maintainer ·<strong>Punyam Chauhan</strong>
              </span>
              <ArrowUpRight size={16} />
            </button>
            <div className="sidebar-footer">
              <span>MADE FOR HOSTEL LIFE.</span>
              <span>V 1.0</span>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
