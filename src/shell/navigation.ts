export type PawnSection = "all" | "mine" | "sell" | "rules" | "maintainer";
export const pawnUrl = (section: PawnSection) =>
  ({
    all: "/pawn",
    mine: "/pawn/deploy",
    sell: "/pawn/deploy",
    rules: "/pawn/rules",
    maintainer: "/pawn/maintainer",
  })[section];
export function pawnSectionAt(path: string): PawnSection | null {
  const normalized = path
    .replace(/\/$/, "")
    .replace(/\/moderator$/, "/maintainer")
    .replace(/^\/pawn(?:store|shop)(?=\/|$)/, "/pawn");
  return (
    (
      {
        "/pawn": "all",
        "/pawn/deploy": "sell",
        "/pawn/your-listings": "sell",
        "/pawn/sell": "sell",
        "/pawn/rules": "rules",
        "/pawn/maintainer": "maintainer",
      } as Record<string, PawnSection>
    )[normalized] || null
  );
}
export function legacyPawnSection(section: string | null): PawnSection {
  if (section === "moderator") return "maintainer";
  return section === "payments" || section === "sell" || section === "mine"
    ? "sell"
    : section === "rules" || section === "maintainer"
      ? section
      : "all";
}
export const stashPath = (view: string) =>
  ({
    stash: "/stash",
    seller: "/dashboard",
    admin: "/maintainer",
    browse: "/",
  })[view] || "/";
export const stashViewAt = (path: string) =>
  ({ "/stash": "stash", "/dashboard": "seller", "/maintainer": "admin" })[
    path.replace(/\/$/, "").replace(/\/moderator$/, "/maintainer")
  ] || "browse";
