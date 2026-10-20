"use client";
import { ArrowLeft, ChevronDown, Compass, Package, Store } from "lucide-react";
import { useDetailsMotion } from "../shared/hooks/use-details-motion";
type Action = { label: string; run: () => void; Icon: typeof Store };
export function HeaderNavigation({
  label,
  pawn = false,
  pawnEnabled = false,
  onNavigate,
  onPawn,
}: {
  label: string;
  pawn?: boolean;
  pawnEnabled?: boolean;
  onNavigate: (view: string) => void;
  onPawn: (section: "all" | "sell" | "rules" | "maintainer") => void;
}) {
  const { ref, toggle, close } = useDetailsMotion();
  const actions: Action[] = pawn
    ? [
        { label: "Shop floor", run: () => onPawn("all"), Icon: Store },
        { label: "Deploy The Pawn", run: () => onPawn("sell"), Icon: Package },
        {
          label: "Back to StashBox",
          run: () => onNavigate("browse"),
          Icon: ArrowLeft,
        },
      ]
    : [
        {
          label: "Find a snack",
          run: () => onNavigate("browse"),
          Icon: Compass,
        },
        { label: "My stash", run: () => onNavigate("stash"), Icon: Store },
        {
          label: "Stasher dashboard",
          run: () => onNavigate("seller"),
          Icon: Package,
        },
        { label: "The Pawn Shop", run: () => onPawn("all"), Icon: Store },
      ];
  return (
    <details className="header-quick-nav" ref={ref}>
      <summary onClick={toggle} aria-label="Quick navigation" title={label}>
        <span>{label}</span>
        <ChevronDown size={14} />
      </summary>
      <nav aria-label="Quick navigation links">
        {actions
          .filter((action) => pawnEnabled || action.label !== "The Pawn Shop")
          .map(({ label, run, Icon }) => (
            <button
              key={label}
              onClick={() => {
                close(true);
                run();
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
      </nav>
    </details>
  );
}
