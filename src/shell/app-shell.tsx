"use client";
import { matchesSearch, type PublicSettings } from "../domain/site-settings";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleCheck,
  CircleHelp,
  Clock3,
  LogOut,
  MapPin,
  Menu,
  Moon,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  groupProducts,
  groupVariants,
  productIdentity,
  sellerCount,
  startingPrice,
  type ProductGroup as Group,
} from "../domain/product-groups";
import {
  CATEGORIES,
  hostelName,
  HOSTELS,
  isHostel,
  locationText,
  matchesPhase,
  money,
  mrpLabel,
  setHostels,
  type Listing,
  type OwnListing,
  type User,
} from "../domain/shared";
import {
  LocationFields,
  PhaseNotice,
} from "../features/account/location-fields";
import { relative, VariantOffers } from "../features/catalogue/compare-offers";
import { demoListings } from "../features/catalogue/demo-listings";
import { PacketPhoto, PhotoCredit } from "../features/catalogue/product-photos";
import { SnackForm } from "../features/catalogue/snack-form";
import { SellerDashboard } from "../features/dashboard/stasher-dashboard";
import { Hero, HostelLanding } from "../features/hostels/hostel-landing";
import { MaintainerWorkspace } from "../features/moderation/maintainer-workspace";
import { PawnMark } from "../features/pawn/pawn-mark";
import { PawnShop } from "../features/pawn/pawn-shop";
import { type PawnSection } from "../features/pawn/pawn-sidebar";
import { SellerPayments } from "../features/payments/payment-qr";
import { ShopShutter } from "../features/stash/shop-shutter";
import { OwnRow } from "../features/stash/stock-row";
import { SupportPanel, WhatsAppLogo } from "../features/support/support-panel";
import { requestJSON as api } from "../shared/lib/api-client";
import { Modal } from "../shared/ui/dialog";
import { Submit } from "../shared/ui/submit";
import { HeaderNavigation } from "./header-navigation";
import {
  legacyPawnSection,
  pawnSectionAt,
  pawnUrl,
  stashPath,
  stashViewAt,
} from "./navigation";
import { Sidebar } from "./sidebar";
export default function Home({
  initialPawnSection,
  initialView,
}: { initialPawnSection?: PawnSection; initialView?: string } = {}) {
  const [pawnSection, setPawnSection] = useState<PawnSection>(
      initialPawnSection || "all",
    ),
    [authReturn, setAuthReturn] = useState("stash");
  const [site, setSite] = useState<PublicSettings | null>(null);
  const [rememberedHostel, setRememberedHostel] = useState("");
  const [hostel, setHostel] = useState(""),
    [phaseGroup, setPhaseGroup] = useState("all");
  const requestVersion = useRef(0);
  const [user, setUser] = useState<User | null>(null),
    [listings, setListings] = useState<Listing[]>([]),
    [own, setOwn] = useState<OwnListing[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState("");
  const [view, setView] = useState(
      initialPawnSection ? "pawn" : initialView || "browse",
    ),
    [modal, setModal] = useState(""),
    [authTab, setAuthTab] = useState("login"),
    [demo, setDemo] = useState(false),
    [demoData, setDemoData] = useState<Listing[]>([]);
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState(CATEGORIES[0]),
    [wing, setWing] = useState("all"),
    [sort, setSort] = useState("popular"),
    [selected, setSelected] = useState<Group | null>(null);
  const [compactViewport, setCompactViewport] = useState(false);
  const [menu, setMenu] = useState(false),
    [now, setNow] = useState(Date.now()),
    [authError, setAuthError] = useState("");
  const [editing, setEditing] = useState<OwnListing | null>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]),
    [adminSearch, setAdminSearch] = useState(""),
    [resetUser, setResetUser] = useState<any>(null),
    [temporaryPassword, setTemporaryPassword] = useState("");
  async function refresh() {
    const version = ++requestVersion.current;
    setError("");
    try {
      const [me, registry, config] = await Promise.all([
        api("me"),
        api("hostels"),
        api("site"),
      ]);
      if (version !== requestVersion.current) return;
      setSite(config.settings);
      setHostels(registry.hostels);
      setUser(me.user);
      let saved = "";
      try {
        saved = localStorage.getItem("stashbox.hostel") || "";
      } catch {}
      if (saved && !isHostel(saved)) {
        try {
          localStorage.removeItem("stashbox.hostel");
        } catch {}
        setRememberedHostel("");
      }
      if (hostel && !isHostel(hostel)) {
        setRememberedHostel("");
        if (view === "pawn") setHostel("");
        else {
          chooseHostel("");
          return;
        }
      }
      if (
        config.settings.maintenanceUntil > Date.now() &&
        me.user?.role !== "admin"
      ) {
        setListings([]);
        return;
      }
      const items =
        hostel && view !== "pawn"
          ? await api("listings?hostel=" + encodeURIComponent(hostel))
          : { listings: [] };
      if (version !== requestVersion.current) return;
      setListings(items.listings);
      if (!hostel) {
        const params = new URLSearchParams(location.search);
        const desired = params.has("hostel") ? params.get("hostel") : saved;
        if (isHostel(desired)) {
          setRememberedHostel(desired);
          if (params.get("choose") !== "hostel") setHostel(desired);
        }
      }
      if (me.user?.must_change_password) setModal("password");
      else if (me.user && !me.user.hostel) setModal("profile");
    } catch (e) {
      if (version === requestVersion.current) setError((e as Error).message);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }
  useEffect(() => {
    const sync = () => {
      const params = new URLSearchParams(location.search),
        pawn = pawnSectionAt(location.pathname);
      const value = params.get("hostel");
      setHostel(isHostel(value) ? value : "");
      setWing("all");
      setPhaseGroup("all");
      setSelected(null);
      setView(pawn ? "pawn" : stashViewAt(location.pathname));
      if (pawn) setPawnSection(pawn);
    };
    if (location.pathname === "/moderator")
      history.replaceState(null, "", "/maintainer" + location.search);
    const params = new URLSearchParams(location.search);
    let saved = "";
    try {
      saved = localStorage.getItem("stashbox.hostel") || "";
    } catch {}
    const pawn =
      pawnSectionAt(location.pathname) ||
      (params.get("app") === "pawn"
        ? legacyPawnSection(params.get("section"))
        : null);
    const initial = params.has("hostel") ? params.get("hostel") : saved;
    if (isHostel(initial)) {
      setRememberedHostel(initial);
      if (params.get("choose") !== "hostel") {
        setHostel(initial);
        if (!pawn) {
          params.set("hostel", initial);
          history.replaceState(
            null,
            "",
            stashPath(stashViewAt(location.pathname)) + "?" + params,
          );
        }
      }
    }
    if (pawn) {
      setView("pawn");
      setPawnSection(pawn);
      history.replaceState(null, "", pawnUrl(pawn));
    }
    if (params.get("demo") === "1") setDemo(true);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  useEffect(() => {
    setLoading(true);
    refresh();
    const focus = () => refresh();
    window.addEventListener("focus", focus);
    return () => {
      requestVersion.current++;
      window.removeEventListener("focus", focus);
    };
  }, [hostel, view]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (demo && hostel) setDemoData(demoListings(hostel));
  }, [demo, hostel]);
  useEffect(() => {
    const update = () =>
      api("site")
        .then((d) => setSite(d.settings))
        .catch(() => {});
    const timer = setInterval(update, 15000);
    window.addEventListener("focus", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, []);
  useEffect(() => {
    if (site && !site.pawnEnabled && view === "pawn") {
      setView("browse");
      setPawnSection("all");
      setSelected(null);
      setModal("");
      history.replaceState(null, "", "/");
    }
  }, [site?.pawnEnabled, view]);
  const resting =
    !!site &&
    site.maintenanceUntil > now &&
    (user?.role !== "admin" || !!user.must_change_password);
  useEffect(() => {
    if (resting) {
      setMenu(false);
      setSelected(null);
      setEditing(null);
      setModal((current) =>
        ["auth", "password", "recovery", "profile", "help"].includes(current)
          ? current
          : "",
      );
    }
    if (site) void refresh();
  }, [resting]);
  function chooseHostel(value: string) {
    requestVersion.current++;
    setListings([]);
    setHostel(value);
    setView("browse");
    setSelected(null);
    setMenu(false);
    setQuery("");
    setWing("all");
    setPhaseGroup("all");
    setCategory(CATEGORIES[0]);
    setError("");
    if (value) setRememberedHostel(value);
    try {
      if (value) localStorage.setItem("stashbox.hostel", value);
    } catch {}
    const params = new URLSearchParams(location.search);
    params.delete("app");
    params.delete("section");
    if (value) {
      params.set("hostel", value);
      params.delete("choose");
    } else {
      params.delete("hostel");
      params.set("choose", "hostel");
    }
    history.pushState(null, "", "/" + (params.size ? "?" + params : ""));
    window.scrollTo({ top: 0 });
  }
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (view === "stash" && user && !user.must_change_password)
      api("mine")
        .then((r) => setOwn(r.listings))
        .catch((e) => setToast(e.message));
    if (view === "admin" && user?.role === "admin") loadAdmin();
  }, [view, user?.id]);
  useEffect(() => {
    if (!selected) return;
    const rows = (demo ? demoData : listings).filter(
      (l) =>
        l.hostel === hostel &&
        productIdentity(l) === selected.key &&
        now - l.confirmed_at < 86400000 &&
        matchesPhase(l.phase, phaseGroup) &&
        (wing === "all" || l.wing === wing) &&
        !!l.is_open,
    );
    setSelected((s) => (s ? { ...s, offers: rows } : null));
  }, [listings, demo, demoData, now, hostel, phaseGroup, wing]);
  async function action(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function loadOwn() {
    setOwn((await api("mine")).listings);
    await refresh();
  }
  async function loadAdmin() {
    try {
      setAdminUsers(
        (await api(`admin/users?search=${encodeURIComponent(adminSearch)}`))
          .users,
      );
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  function startDemo() {
    setDemo(true);
    setView("browse");
  }
  function pawnPane(pane: PawnSection) {
    if (!site?.pawnEnabled) return;
    setMenu(false);
    setPawnSection(pane);
    setView("pawn");
    setToast("");
    history.pushState(null, "", pawnUrl(pane));
    if (pane !== "all" && pane !== "rules" && !user) {
      setAuthReturn("pawn");
      setAuthTab("login");
      setModal("auth");
    }
  }
  function navigate(v: string) {
    if (v === "pawn") {
      pawnPane("all");
      return;
    }
    if (v === "browse" && !hostel && isHostel(rememberedHostel)) {
      setAuthReturn("stash");
      chooseHostel(rememberedHostel);
      return;
    }
    const p = new URLSearchParams(location.search);
    p.delete("app");
    p.delete("section");
    if (v !== "browse") p.delete("choose");
    history.pushState(null, "", stashPath(v) + (p.size ? "?" + p : ""));
    setAuthReturn("stash");
    setMenu(false);
    if (v === "browse") void refresh();
    if (v !== "browse" && v !== "pawn" && !user) {
      setView(v);
      setAuthTab("login");
      setAuthError("");
      setModal("auth");
      return;
    }
    if (v === "stash" && user?.hostel && user.hostel !== hostel)
      chooseHostel(user.hostel);
    history.replaceState(
      null,
      "",
      stashPath(v) + (hostel ? "?hostel=" + encodeURIComponent(hostel) : ""),
    );
    setView(v);
  }
  function sell() {
    if (!user) {
      setAuthTab("signup");
      setAuthError("");
      setModal("auth");
    } else {
      navigate("stash");
      setDemo(false);
    }
  }
  const source = (demo ? demoData : listings).filter(
    (l) => l.hostel === hostel,
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width:720px)"),
      update = () => setCompactViewport(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!menu || !compactViewport) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const aside = document.querySelector<HTMLElement>(".sidebar");
    if (aside) aside.scrollTop = 0;
    aside
      ?.querySelector<HTMLElement>(".mobile-drawer-close")
      ?.focus({ preventScroll: true });
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", escape);
    };
  }, [menu, compactViewport]);
  const availableWings = Array.from(
    new Set(
      source
        .filter((l) => matchesPhase(l.phase, phaseGroup))
        .map((l) => l.wing),
    ),
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const groups = useMemo(() => {
    const filtered = source.filter(
      (l) =>
        now - l.confirmed_at < 86400000 &&
        matchesPhase(l.phase, phaseGroup) &&
        !!l.is_open &&
        (wing === "all" || l.wing === wing) &&
        (category === CATEGORIES[0] || category === l.category) &&
        matchesSearch(
          `${l.name} ${mrpLabel(l.mrp)} ${l.size} ${l.room} ${l.seller_name}`,
          query,
          site?.searchAliases || [],
        ),
    );
    return groupProducts(filtered).sort(
      sort === "price"
        ? (a, b) => startingPrice(a.offers) - startingPrice(b.offers)
        : sort === "name"
          ? (a, b) => a.name.localeCompare(b.name)
          : (a, b) => sellerCount(b.offers) - sellerCount(a.offers),
    );
  }, [
    source,
    wing,
    category,
    query,
    sort,
    now,
    phaseGroup,
    site?.searchAliases,
  ]);
  const activeSellers = new Set(
    source
      .filter(
        (l) =>
          l.is_open &&
          now - l.confirmed_at < 86400000 &&
          matchesPhase(l.phase, phaseGroup) &&
          (wing === "all" || l.wing === wing),
      )
      .map((l) => l.seller_id),
  ).size;
  const closeModal = () => {
    if (user?.must_change_password && modal === "password") return;
    setModal("");
    setAuthError("");
  };
  if (!site || (!site.pawnEnabled && view === "pawn"))
    return (
      <div className="maintenance-screen" role="status">
        {error || "Opening StashBox…"}
        {error && (
          <button className="button ghost" onClick={() => void refresh()}>
            Try again
          </button>
        )}
      </div>
    );
  return (
    <div
      className={`app-shell ${resting ? "site-resting" : ""} ${view === "pawn" ? "pawn-mode" : ""}`}
    >
      <button
        className={`drawer-backdrop ${menu ? "is-visible" : ""}`}
        aria-label="Close navigation"
        aria-hidden={!menu}
        tabIndex={menu ? 0 : -1}
        onClick={() => setMenu(false)}
      />
      {!resting && (
        <Sidebar
          pawnEnabled={site.pawnEnabled}
          menu={menu}
          compactViewport={compactViewport}
          view={view}
          hostel={hostel}
          user={user}
          pawnSection={pawnSection}
          onClose={() => setMenu(false)}
          onModal={setModal}
          onChooseHostel={chooseHostel}
          onNavigate={navigate}
          onPawnSection={pawnPane}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-btn mobile-menu"
              onClick={() => setMenu(!menu)}
              aria-label="Toggle menu"
              aria-expanded={menu}
              aria-controls="main-sidebar"
            >
              <Menu size={21} />
            </button>
            {view === "pawn" ? <PawnMark size={22} /> : <MapPin size={16} />}
            <button
              className="location-title hostel-switch desktop-hostel-switch"
              disabled={view === "pawn"}
              onClick={() => chooseHostel("")}
            >
              <span>
                {view === "pawn"
                  ? "The campus exchange"
                  : hostel
                    ? hostelName(hostel)
                    : "Choose your hostel"}
              </span>
              <ChevronDown size={13} />
            </button>
            <HeaderNavigation
              pawnEnabled={site.pawnEnabled}
              label={
                view === "pawn"
                  ? "The Pawn Shop"
                  : hostel
                    ? HOSTELS.find((h) => h.id === hostel)?.short ||
                      hostelName(hostel)
                    : "Explore StashBox"
              }
              pawn={view === "pawn"}
              onNavigate={navigate}
              onPawn={pawnPane}
            />
            <span className="top-divider">/</span>
            <span className="muted">
              {view === "browse"
                ? hostel
                  ? "The snack scene"
                  : "The hostel network"
                : view === "stash"
                  ? "Your little shop"
                  : view === "seller"
                    ? "Your private notebook"
                    : view === "pawn"
                      ? {
                          all: "Shop floor",
                          mine: "Your listings",
                          sell: "Deploy The Pawn",
                          rules: "Shop rules",
                          maintainer: "Maintainer desk",
                        }[pawnSection]
                      : "Maintainer desk"}
            </span>
          </div>
          <div className="topbar-actions">
            {view !== "pawn" && !demo && user && !user.must_change_password && (
              <ShopShutter
                user={user}
                onChanged={refresh}
                onDashboard={() => navigate("seller")}
              />
            )}
            <span className="no-fees">
              <i />
              Zero fees. Always.
            </span>
            {user ? (
              <button
                className="account-button"
                onClick={() => setModal("profile")}
              >
                <span className="avatar">
                  {user.name
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span>
                  {user.name.split(" ")[0]}
                  <small>Room {user.room}</small>
                </span>
                <ChevronDown size={14} />
              </button>
            ) : (
              <button
                className="button ghost"
                onClick={() => {
                  setAuthReturn(view === "pawn" ? "pawn" : "stash");
                  setAuthTab("login");
                  setModal("auth");
                }}
              >
                Log in <ArrowUpRight size={15} />
              </button>
            )}
          </div>
        </header>
        <main>
          {resting ? (
            <section className="maintenance-screen">
              <Clock3 size={36} />
              <h1>We’ll be back shortly.</h1>
              <p>{site.maintenanceMessage}</p>
              <p>
                Reopens automatically by{" "}
                {new Date(site.maintenanceUntil).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                .
              </p>
              <p>Maintainers can use the account button above to log in.</p>
            </section>
          ) : (
            <>
              {site.maintenanceUntil > now && user?.role === "admin" && (
                <p className="site-maintainer-notice" role="status">
                  Maintenance is active for visitors. Your Maintainer access
                  stays open until it ends automatically.
                </p>
              )}
              {site.announcement && (
                <p className="site-announcement" role="status">
                  {site.announcement}
                </p>
              )}
              {demo && view !== "pawn" && (
                <div className="demo-banner">
                  <span>
                    <Sparkles size={15} />
                    Demo mode · These listings and Stashers are fictional.
                  </span>
                  <button
                    onClick={() => {
                      setDemo(false);
                      setSelected(null);
                    }}
                  >
                    Show real listings <ArrowRight size={14} />
                  </button>
                </div>
              )}

              {["stash", "seller", "admin"].includes(view) &&
                !user &&
                !loading && (
                  <section className="empty-state">
                    <ShieldCheck size={34} />
                    <h1>Log in to continue.</h1>
                    <p>Your account keeps this section private.</p>
                    <button
                      className="button primary"
                      onClick={() => {
                        setAuthTab("login");
                        setModal("auth");
                      }}
                    >
                      Log in
                    </button>
                  </section>
                )}
              {view === "seller" && user && (
                <SellerDashboard onBrowse={() => navigate("browse")} />
              )}
              {view === "browse" && !hostel && (
                <HostelLanding
                  selectedHostel={rememberedHostel}
                  onChoose={chooseHostel}
                  onDemo={() => {
                    setDemo(true);
                    document
                      .getElementById("hostel-choices")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                />
              )}
              {view === "browse" && hostel && (
                <>
                  <div className="stock-heading">
                    <div>
                      <span className="eyebrow orange">
                        YOUR HOSTEL’S SNACK SCENE
                      </span>
                      <h1>{hostelName(hostel)}</h1>
                      <p>
                        Find what’s stocked. Compare prices. Head to the room.
                      </p>
                    </div>
                  </div>
                  {hostel === "mandakini" && (
                    <>
                      <PhaseNotice />
                      <div
                        className="phase-tabs"
                        aria-label="Mandakini phase filters"
                      >
                        {[
                          ["all", "All phases"],
                          ["connected", "Phases 1 & 2"],
                          ["3", "Phase 3"],
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            className={phaseGroup === value ? "selected" : ""}
                            onClick={() => {
                              setPhaseGroup(value);
                              setWing("all");
                            }}
                          >
                            {label}
                            {value === "3" && <span>Separate access</span>}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <section className="directory" aria-label="Snack directory">
                    <div className="section-top">
                      <div>
                        <span className="eyebrow orange">THE LOCAL SUPPLY</span>
                        <h2>
                          What’s in the stash<span className="orange">?</span>
                        </h2>
                      </div>
                      <div className="live-count">
                        <i />
                        <strong>{activeSellers}</strong>{" "}
                        {activeSellers === 1 ? "Stasher" : "Stashers"} open now
                        <button
                          className="icon-btn"
                          aria-label="Refresh listings"
                          onClick={() => action(refresh)}
                          disabled={busy}
                        >
                          <RefreshCw size={15} className={busy ? "spin" : ""} />
                        </button>
                      </div>
                    </div>
                    <div className="search-row">
                      <label className="search-box">
                        <Search size={20} />
                        <input
                          aria-label="Search snacks, rooms or Stashers"
                          placeholder="What are you craving? Try Oreo, Maggi, room 224..."
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                        {query && (
                          <button
                            onClick={() => setQuery("")}
                            aria-label="Clear search"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </label>
                    </div>
                    <div className="filter-row">
                      <div className="categories" aria-label="Snack categories">
                        {CATEGORIES.map((c, i) => (
                          <button
                            key={c}
                            className={category === c ? "selected" : ""}
                            onClick={() => setCategory(c)}
                          >
                            <span aria-hidden="true">
                              {["✳", "◒", "◈", "♨", "◉"][i]}
                            </span>
                            {c}
                          </button>
                        ))}
                      </div>
                      <div className="availability-filters">
                        <label className="wing-select">
                          <SlidersHorizontal size={17} />
                          <select
                            aria-label="Filter by wing"
                            value={wing}
                            onChange={(e) => setWing(e.target.value)}
                          >
                            <option value="all">All wings</option>
                            {availableWings.map((w) => (
                              <option key={w} value={w}>
                                Wing {w}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                    <div className="results-row">
                      <span>
                        {loading
                          ? "Checking the cupboards…"
                          : `${groups.length} ${groups.length === 1 ? "snack" : "snacks"} worth staying up for`}
                      </span>
                      <label>
                        Sort by{" "}
                        <select
                          aria-label="Sort listings"
                          value={sort}
                          onChange={(e) => setSort(e.target.value)}
                        >
                          <option value="popular">Most Stashers</option>
                          <option value="price">Lowest price</option>
                          <option value="name">Name A–Z</option>
                        </select>
                        <ChevronDown size={13} />
                      </label>
                    </div>
                    {error && !demo ? (
                      <div className="empty-state">
                        <CircleHelp size={32} />
                        <h3>Couldn’t check the stash.</h3>
                        <p role="alert">{error}</p>
                        <button
                          className="button primary"
                          onClick={() => {
                            setLoading(true);
                            refresh();
                          }}
                        >
                          Try again
                        </button>
                      </div>
                    ) : loading && !demo ? (
                      <div className="product-grid">
                        {[0, 1, 2].map((n) => (
                          <div key={n} className="skeleton-card" />
                        ))}
                      </div>
                    ) : groups.length ? (
                      <div className="product-grid">
                        {groups.map((g, i) => {
                          const variants = groupVariants(g.offers),
                            sellers = sellerCount(g.offers),
                            lowest = startingPrice(g.offers),
                            open = g.offers.some((o) => o.is_open),
                            rooms = new Set(
                              g.offers.map(
                                (o) => `${o.phase || ""}|${o.wing}|${o.room}`,
                              ),
                            ).size;
                          return (
                            <button
                              key={g.key}
                              className="product-card"
                              onClick={() => setSelected(g)}
                              aria-label={`View ${g.name} · ${variants.length} pack options · ${sellers} sellers`}
                            >
                              <div className={`product-art tone-${i % 4}`}>
                                <span className="pack-size">
                                  {variants.length > 1
                                    ? `${variants.length} pack options`
                                    : variants[0]?.label}
                                </span>
                                {sellers > 1 && (
                                  <span className="compare-badge">
                                    <SlidersHorizontal size={12} />
                                    {sellers} Stashers
                                  </span>
                                )}
                                <PacketPhoto
                                  item={
                                    g.offers.find((o) => o.photo_id) ||
                                    g.offers[0]
                                  }
                                />
                              </div>
                              <div className="product-info">
                                <span className="product-category">
                                  {g.category}
                                </span>
                                {g.offers.some(
                                  (o) => o.photo_source === "openfoodfacts",
                                ) && (
                                  <small className="card-photo-credit">
                                    Photo: Open Food Facts · CC BY-SA
                                  </small>
                                )}
                                <h3>{g.name}</h3>
                                <span className="product-options">
                                  {variants.length > 1
                                    ? `${variants.length} MRP / pack options`
                                    : "Compare Stasher prices"}
                                </span>
                                {hostel === "mandakini" && (
                                  <div className="phase-chips">
                                    {Array.from(
                                      new Set(g.offers.map((o) => o.phase)),
                                    )
                                      .sort()
                                      .map((p) => (
                                        <span
                                          key={p}
                                          className={
                                            p === "3" ? "phase-three" : ""
                                          }
                                        >
                                          Phase {p}
                                        </span>
                                      ))}
                                  </div>
                                )}
                                <div className="product-price">
                                  <span>
                                    {(variants.length > 1 || sellers > 1) && (
                                      <small>from </small>
                                    )}
                                    {money(lowest)}
                                  </span>
                                  <span className="product-arrow">
                                    <ArrowUpRight size={20} />
                                  </span>
                                </div>
                                <div className="product-meta">
                                  <span>
                                    <MapPin size={13} />
                                    {rooms === 1
                                      ? `Room ${g.offers[0].room} · ${g.offers[0].wing}`
                                      : `${rooms} room locations`}
                                  </span>
                                  <span
                                    className={open ? "in-stock" : "closed"}
                                  >
                                    <i />
                                    {open ? "Available" : "Closed"}
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <div className="empty-icon">
                          <Package size={33} />
                        </div>
                        <h3>
                          {source.length
                            ? "That craving is still out there."
                            : "No stashes open right now."}
                        </h3>
                        <p>
                          {source.length
                            ? "Try another snack or wing."
                            : "Check back later, or list your own stash for the hostel."}
                        </p>
                        <div className="empty-actions">
                          <button
                            className="button primary"
                            onClick={
                              source.length
                                ? () => {
                                    setQuery("");
                                    setWing("all");
                                    setCategory(CATEGORIES[0]);
                                    setPhaseGroup("all");
                                  }
                                : sell
                            }
                          >
                            {source.length
                              ? "Clear filters"
                              : "List your first snack"}
                            <ArrowUpRight size={16} />
                          </button>
                          {!source.length && !demo && (
                            <button
                              className="button ghost"
                              onClick={startDemo}
                            >
                              Explore a demo
                              <ArrowRight size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="directory-footnote">
                      <Clock3 size={14} />
                      <span>
                        Fresh stock, less guesswork. Listings hide after 24
                        hours without a Stasher update.
                      </span>
                    </div>
                  </section>
                  <section className="how-strip">
                    {[
                      [
                        "01",
                        "Find your fix.",
                        "Search snacks across the hostel.",
                      ],
                      [
                        "02",
                        "Pick your room.",
                        "Compare the same pack, fairly.",
                      ],
                      [
                        "03",
                        "Walk. Pay. Munch.",
                        "Settle up directly with the Stasher.",
                      ],
                    ].map(([n, t, p]) => (
                      <div key={n}>
                        <span>{n}</span>
                        <p>
                          <strong>{t}</strong>
                          {p}
                        </p>
                      </div>
                    ))}
                  </section>
                  <Hero onSell={sell} />
                </>
              )}
              {view === "pawn" &&
                pawnSection === "maintainer" &&
                (user?.role === "admin" ? (
                  <MaintainerWorkspace experience="pawn" onChanged={refresh} />
                ) : (
                  <section className="pawn-settings">
                    <h1>Maintainer access</h1>
                    <p>
                      {loading
                        ? "Opening the maintainer desk..."
                        : "This area is available to campus maintainers."}
                    </p>
                    {!user && !loading && (
                      <button
                        className="button pawn-primary"
                        onClick={() => {
                          setAuthReturn("pawn");
                          setAuthTab("login");
                          setModal("auth");
                        }}
                      >
                        Log in
                      </button>
                    )}
                  </section>
                ))}
              {view === "pawn" && pawnSection !== "maintainer" && (
                <PawnShop
                  searchAliases={site.searchAliases}
                  user={user}
                  section={pawnSection}
                  onSection={pawnPane}
                  onLogin={() => {
                    setAuthReturn("pawn");
                    setAuthTab("login");
                    setModal("auth");
                  }}
                  onProfile={() =>
                    setModal(
                      user?.must_change_password ? "password" : "profile",
                    )
                  }
                />
              )}
              {view === "stash" && user && (
                <section className="dashboard">
                  <div className="dashboard-heading">
                    <div>
                      <span className="eyebrow orange">
                        {hostelName(user.hostel)} · {locationText(user)}
                      </span>
                      <h1>
                        Your stash.
                        <br />
                        <em>Your little empire.</em>
                      </h1>
                      <p>Keep your stock fresh. Keep your neighbours fed.</p>
                    </div>
                    <button
                      className="button primary"
                      onClick={() => setModal("add")}
                    >
                      <Plus size={18} />
                      Add a snack
                    </button>
                  </div>
                  <div
                    className={`stock-status-panel ${user.shop_sleeping || !user.is_open ? "status-paused" : now - user.confirmed_at >= 86400000 ? "status-stale" : "status-live"}`}
                  >
                    <div className="stock-status-icon">
                      {user.shop_sleeping || !user.is_open ? (
                        <Moon size={21} />
                      ) : (
                        <Clock3 size={21} />
                      )}
                    </div>
                    <div>
                      <strong>
                        {user.shop_sleeping || !user.is_open
                          ? "Your shop is resting"
                          : now - user.confirmed_at >= 86400000
                            ? "Time for a stock check"
                            : "Your stash is live"}
                      </strong>
                      <p>
                        {user.shop_sleeping || !user.is_open
                          ? "Your items are hidden. Reopen from the header when you’re ready."
                          : now - user.confirmed_at >= 86400000
                            ? "Review your items to show your stash again."
                            : `Stock checked ${relative(user.confirmed_at)}.`}
                      </p>
                    </div>
                    <button
                      className="button ghost"
                      onClick={() => setModal("confirm")}
                    >
                      <Check size={16} />
                      Review stock
                    </button>
                  </div>
                  <SellerPayments onChanged={refresh} />
                  <div className="stash-heading">
                    <h2>{own.length} snacks in your cupboard</h2>
                  </div>
                  {own.length ? (
                    <div className="own-list">
                      {own.map((item) => (
                        <OwnRow
                          key={item.id}
                          item={item}
                          busy={busy}
                          onEdit={() => setEditing(item)}
                          onSave={(price, available) =>
                            action(async () => {
                              await api(`mine/${item.id}`, "PUT", {
                                price,
                                available,
                              });
                              await loadOwn();
                              setToast("Stash updated.");
                            })
                          }
                          onDelete={() =>
                            action(async () => {
                              await api(`mine/${item.id}`, "DELETE");
                              await loadOwn();
                              setToast("Listing removed.");
                            })
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <Package size={36} />
                      <h3>An empty cupboard has potential.</h3>
                      <p>
                        Add your first item and let your neighbours know what is
                        available.
                      </p>
                      <button
                        className="button primary"
                        onClick={() => setModal("add")}
                      >
                        <Plus size={16} />
                        Add a snack
                      </button>
                    </div>
                  )}
                </section>
              )}
              {view === "admin" && user && user.role !== "admin" && (
                <section className="empty-state">
                  <ShieldCheck size={34} />
                  <h1>Maintainer access</h1>
                  <p>This section is available to campus maintainers.</p>
                  <button
                    className="button primary"
                    onClick={() => navigate("browse")}
                  >
                    Back to snacks
                  </button>
                </section>
              )}
              {view === "admin" && user?.role === "admin" && (
                <MaintainerWorkspace
                  experience="stashbox"
                  onChanged={refresh}
                  accountTools={
                    <section className="admin-users-tool">
                      <h2>Account recovery</h2>
                      <form
                        className="admin-search"
                        onSubmit={(e) => {
                          e.preventDefault();
                          loadAdmin();
                        }}
                      >
                        <label className="search-box">
                          <Search size={19} />
                          <input
                            aria-label="Find student account"
                            value={adminSearch}
                            onChange={(e) => setAdminSearch(e.target.value)}
                            placeholder="Search name, student ID or email"
                          />
                        </label>
                        <button className="button primary">Find student</button>
                      </form>
                      <div className="admin-users">
                        {adminUsers.map((u) => (
                          <div key={u.id}>
                            <span className="avatar">
                              {u.name.slice(0, 2).toUpperCase()}
                            </span>
                            <p>
                              <strong>{u.name}</strong>
                              <span>
                                {u.student_id} · {hostelName(u.hostel)}
                                <br />
                                {locationText(u)}
                                <br />
                                {u.email}
                              </span>
                            </p>
                            {u.role === "admin" ? (
                              <span className="tag">Maintainer</span>
                            ) : (
                              <button
                                className="button ghost"
                                onClick={() => {
                                  setResetUser(u);
                                  setTemporaryPassword("");
                                  setModal("reset");
                                }}
                              >
                                Reset access
                                <ArrowUpRight size={15} />
                              </button>
                            )}
                          </div>
                        ))}
                        {!adminUsers.length && (
                          <p>No matching student accounts.</p>
                        )}
                      </div>
                    </section>
                  }
                />
              )}
              {view === "pawn" ? (
                <footer className="main-footer pawn-footer">
                  <span className="footer-brand">The Pawn Shop</span>
                  <span>Good things. Second chapters.</span>
                  <button onClick={() => navigate("browse")}>
                    Back to StashBox
                    <ArrowRight size={14} />
                  </button>
                  <button onClick={() => setModal("help")}>
                    Shop help & support
                    <ArrowUpRight size={13} />
                  </button>
                </footer>
              ) : (
                <footer className="main-footer">
                  <span className="footer-brand">
                    stashbox<sup>®</sup>
                  </span>
                  <span>
                    A little hostel hustle. A lot of late-night happiness.
                  </span>
                  <button onClick={() => setModal("help")}>
                    Help & support
                    <ArrowUpRight size={13} />
                  </button>
                </footer>
              )}
            </>
          )}
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CircleCheck size={18} />
          <span>{toast}</span>
          <button
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {selected && (
        <Modal
          title="Compare rooms & prices"
          onClose={() => setSelected(null)}
          wide
          className="modal-compare"
        >
          <div className="compare-intro">
            <div className="compare-art">
              <PacketPhoto
                item={
                  selected.offers.find((o) => o.photo_id) || {
                    name: selected.name,
                    photo_id: null,
                  }
                }
              />
            </div>
            <div>
              <span className="eyebrow orange">COMPARE THE STASHES</span>
              <h3>{selected.name}</h3>
              <p>
                {groupVariants(selected.offers).length} pack options ·{" "}
                {sellerCount(selected.offers)} Stashers
              </p>
            </div>
          </div>
          {demo && (
            <div className="inline-note">
              Demo Stashers and prices. No real items are for sale.
            </div>
          )}
          {hostel === "mandakini" && <PhaseNotice compact />}
          <PhotoCredit
            item={selected.offers.find((o) => o.photo_id) || { photo_id: null }}
          />
          <VariantOffers
            offers={selected.offers}
            mandakini={hostel === "mandakini"}
          />
          {!selected.offers.length && (
            <p className="inline-note">
              These listings have expired. Check back after Stashers confirm
              stock.
            </p>
          )}
          <div className="modal-note">
            <MapPin size={17} />
            <p>
              Head to the room and pay the Stasher directly. Prices and
              availability are set by each Stasher.
            </p>
          </div>
        </Modal>
      )}
      {modal === "auth" && (
        <Modal
          title={
            authReturn === "pawn"
              ? authTab === "login"
                ? "Welcome back to the shop."
                : "A new face in the shop."
              : authTab === "login"
                ? "Back for a little midnight fuel?"
                : "Every good stash starts somewhere."
          }
          onClose={closeModal}
        >
          <div className="auth-tabs">
            <button
              className={authTab === "login" ? "selected" : ""}
              onClick={() => {
                setAuthTab("login");
                setAuthError("");
              }}
            >
              Log in
            </button>
            <button
              className={authTab === "signup" ? "selected" : ""}
              onClick={() => {
                setAuthTab("signup");
                setAuthError("");
              }}
            >
              Create account
            </button>
          </div>
          <form
            key={authTab}
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              setAuthError("");
              if (busy) return;
              setBusy(true);
              const data = Object.fromEntries(new FormData(e.currentTarget));
              try {
                const destination = ["stash", "seller", "admin"].includes(view)
                  ? view
                  : "stash";
                const r = await api(
                  authTab === "login" ? "login" : "signup",
                  "POST",
                  data,
                );
                setUser(r.user);
                setDemo(false);
                if (r.user.hostel) chooseHostel(r.user.hostel);
                setView("stash");
                history.replaceState(
                  null,
                  "",
                  "/stash" +
                    (r.user.hostel
                      ? "?hostel=" + encodeURIComponent(r.user.hostel)
                      : ""),
                );
                setModal(
                  r.user.must_change_password
                    ? "password"
                    : !r.user.hostel
                      ? "profile"
                      : "",
                );
                if (!r.user.must_change_password)
                  setOwn((await api("mine")).listings);
                if (authReturn !== "pawn") {
                  setView(destination);
                  history.replaceState(
                    null,
                    "",
                    stashPath(destination) +
                      (r.user.hostel
                        ? "?hostel=" + encodeURIComponent(r.user.hostel)
                        : ""),
                  );
                }
                if (authReturn === "pawn") {
                  setView("pawn");
                  setPawnSection("sell");
                  history.replaceState(null, "", pawnUrl("sell"));
                }
                setToast(
                  authTab === "signup"
                    ? "Your account is ready. Welcome aboard!"
                    : "Welcome back.",
                );
              } catch (err) {
                setAuthError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {authTab === "signup" ? (
              <>
                <div className="form-grid">
                  <label>
                    Your name
                    <input
                      name="name"
                      required
                      minLength={2}
                      maxLength={60}
                      autoComplete="name"
                      placeholder="What should we call you?"
                    />
                  </label>
                  <label>
                    Student ID
                    <input
                      name="studentId"
                      required
                      minLength={3}
                      maxLength={40}
                      placeholder="Your student ID"
                    />
                  </label>
                </div>
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    required
                    maxLength={120}
                    autoComplete="email"
                    placeholder="you@college.edu"
                  />
                </label>
                <div className="form-grid phone-grid">
                  <label>
                    Phone number
                    <input
                      name="phone"
                      type="tel"
                      required
                      pattern="\+?[0-9 ()-]{10,20}"
                      autoComplete="tel"
                      placeholder="10-digit mobile number"
                    />
                  </label>
                </div>
                <LocationFields preferredHostel={hostel} />
              </>
            ) : (
              <label>
                Email or student ID
                <input
                  name="identifier"
                  required
                  autoComplete="username"
                  placeholder="Email or student ID"
                />
              </label>
            )}
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                minLength={authTab === "signup" ? 10 : 1}
                maxLength={128}
                autoComplete={
                  authTab === "signup" ? "new-password" : "current-password"
                }
                placeholder={
                  authTab === "signup"
                    ? "At least 10 characters"
                    : "Your password"
                }
              />
            </label>
            {authError && (
              <p className="form-error" role="alert">
                {authError}
              </p>
            )}
            <Submit busy={busy}>
              {authTab === "signup"
                ? "Create my account"
                : authReturn === "pawn"
                  ? "Log in to the shop"
                  : "Log in to my stash"}
              <ArrowUpRight size={17} />
            </Submit>
            <p className="form-fine-print">
              {authTab === "signup"
                ? "Your email and student ID stay private. Your phone stays hidden unless you enable calls."
                : "Forgot your password?"}
              {authTab === "login" && (
                <button type="button" onClick={() => setModal("recovery")}>
                  Reset password
                  <ArrowUpRight size={12} />
                </button>
              )}
            </p>
          </form>
        </Modal>
      )}
      {modal === "add" && (
        <Modal title="Add a little midnight fuel." onClose={closeModal}>
          <SnackForm
            onSave={async (data) => {
              await api("mine", "POST", data);
              await loadOwn();
              setModal("");
              setToast("Snack added to your stash.");
            }}
          />
        </Modal>
      )}
      {editing && (
        <Modal title="Update your snack." onClose={() => setEditing(null)}>
          <SnackForm
            initial={editing}
            onSave={async (data) => {
              await api(`mine/${editing.id}`, "PUT", data);
              await loadOwn();
              setEditing(null);
              setToast("Snack updated.");
            }}
          />
        </Modal>
      )}
      {modal === "confirm" && (
        <Modal title="Review & refresh your stock" onClose={closeModal}>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              action(async () => {
                await api("confirm", "POST", {});
                await refresh();
                setModal("");
                setToast("Stock confirmed. Listings renewed for 24 hours.");
              });
            }}
          >
            <p>
              Check each item’s price and availability in your stash, then
              refresh your listings for 24 hours.
            </p>
            <label className="checkbox-label">
              <input type="checkbox" required />
              I’ve checked my stock and prices today.
            </label>
            <Submit busy={busy}>
              <Check size={17} />
              Refresh my stock
            </Submit>
          </form>
        </Modal>
      )}
      {modal === "profile" && user && (
        <Modal
          title={
            view === "pawn"
              ? "Your campus profile."
              : "Your corner of the hostel."
          }
          onClose={closeModal}
        >
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              action(async () => {
                await api("profile", "PUT", {
                  name: d.get("name"),
                  phone: d.get("phone"),
                  room: d.get("room"),
                  hostel: d.get("hostel"),
                  wing: d.get("wing"),
                  phase: d.get("phase"),
                  showPhone: d.get("showPhone") === "on",
                  isOpen: d.get("isOpen") === "on",
                });
                await refresh();
                setModal("");
                setToast("Profile updated.");
              });
            }}
          >
            <label>
              Name
              <input
                name="name"
                required
                minLength={2}
                maxLength={60}
                defaultValue={user.name}
              />
            </label>
            {!user.hostel && (
              <p className="inline-note">
                Choose your hostel and enter your location to make your saved
                stash visible.
              </p>
            )}
            <LocationFields initial={user} preferredHostel={hostel} />
            <label>
              Phone number
              <input
                name="phone"
                type="tel"
                required
                defaultValue={user.phone}
              />
            </label>
            <label className="checkbox-label">
              <input
                name="showPhone"
                type="checkbox"
                defaultChecked={!!user.show_phone}
              />
              Show a Call button on my listings
            </label>
            {view !== "pawn" ? (
              <label className="checkbox-label">
                <input
                  name="isOpen"
                  type="checkbox"
                  defaultChecked={!!user.is_open}
                />
                I’m open for snack seekers
              </label>
            ) : (
              <input
                name="isOpen"
                type="hidden"
                value={user.is_open ? "on" : "off"}
              />
            )}
            <Submit busy={busy}>
              Save changes
              <Check size={17} />
            </Submit>
          </form>
          <div className="profile-actions">
            <button onClick={() => setModal("password")}>
              Change password
            </button>
            <button
              onClick={() =>
                action(async () => {
                  await api("logout", "POST", {});
                  setUser(null);
                  setOwn([]);
                  setView(view === "pawn" ? "pawn" : "browse");
                  setPawnSection("all");
                  history.replaceState(
                    null,
                    "",
                    view === "pawn"
                      ? pawnUrl("all")
                      : "/" +
                          (hostel
                            ? "?hostel=" + encodeURIComponent(hostel)
                            : ""),
                  );
                  setModal("");
                })
              }
            >
              <LogOut size={15} />
              Log out
            </button>
          </div>
        </Modal>
      )}
      {modal === "password" && user && (
        <Modal
          title={
            user.must_change_password
              ? "Make this account yours again."
              : "Change your password."
          }
          onClose={closeModal}
        >
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const data = Object.fromEntries(new FormData(e.currentTarget));
              action(async () => {
                const r = await api("password", "POST", data);
                setUser(r.user);
                setModal("");
                setOwn((await api("mine")).listings);
                setToast(
                  "Password changed. Other sessions have been logged out.",
                );
              });
            }}
          >
            {!!user.must_change_password && (
              <p className="inline-note">
                Enter the temporary password Punyam gave you, then choose your
                own before using your account.
              </p>
            )}
            <label>
              {user.must_change_password
                ? "Temporary password"
                : "Current password"}
              <input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            <label>
              New password
              <input
                name="password"
                type="password"
                minLength={10}
                maxLength={128}
                required
                autoComplete="new-password"
                placeholder="At least 10 characters"
              />
            </label>
            <Submit busy={busy}>
              Save my password
              <Check size={17} />
            </Submit>
            <button
              type="button"
              className="button ghost"
              onClick={() => setModal("recovery")}
            >
              Reset password · Get help
            </button>
          </form>
        </Modal>
      )}
      {modal === "recovery" && (
        <Modal
          title="Reset your password"
          onClose={() => setModal(user?.must_change_password ? "password" : "")}
        >
          <div className="form">
            <h2>Let’s get you back in.</h2>
            <p>
              Contact Punyam Chauhan with your student ID card. Visit Patel
              Bhawan, Wing 9, Room 224, or send a message on WhatsApp.
            </p>
            <p>
              Your current password is never visible to the maintainer. After
              checking your identity, Punyam will issue a new temporary
              password. Use it to log in and choose your own new password.
            </p>
            <a
              className="button primary"
              href="https://wa.me/919368930104?text=Hi%20Punyam%2C%20I%20need%20help%20resetting%20my%20password.%20I%20have%20my%20student%20ID%20card."
              target="_blank"
              rel="noreferrer"
            >
              <WhatsAppLogo />
              Contact Punyam
              <ArrowUpRight size={17} />
            </a>
            <button
              className="button ghost"
              onClick={() => setModal(user ? "password" : "auth")}
            >
              Back to {user ? "change password" : "log in"}
            </button>
          </div>
        </Modal>
      )}
      {modal === "how" && (
        <Modal title="A snack run, minus the group spam." onClose={closeModal}>
          <div className="how-modal">
            {[
              [
                "01",
                "Find what you’re craving.",
                "Search by snack, Stasher or room. Filter by wing and compare the available stashes.",
              ],
              [
                "02",
                "Compare the exact same pack.",
                "Tap a product, expand its MRP and pack option, then compare room prices for that exact variant.",
              ],
              [
                "03",
                "Walk over. Pay directly.",
                "Visit the Stasher or call if they’ve enabled it. Pay directly. There are no app orders or reservations.",
              ],
            ].map(([n, t, p]) => (
              <div key={n}>
                <span>{n}</span>
                <p>
                  <strong>{t}</strong>
                  {p}
                </p>
              </div>
            ))}
          </div>
          <button className="button primary full" onClick={closeModal}>
            Got it. Find me a snack
            <ArrowRight size={17} />
          </button>
        </Modal>
      )}
      {modal === "help" && (
        <Modal
          title="Help & support"
          onClose={closeModal}
          className={`modal-support support-theme-${view === "pawn" ? "pawn" : "stashbox"}`}
        >
          <SupportPanel experience={view === "pawn" ? "pawn" : "stashbox"} />
          {user && String(user.room) === "224" && user.role !== "admin" && (
            <form
              className="form setup-form"
              onSubmit={(e) => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(e.currentTarget));
                action(async () => {
                  await api("admin/bootstrap", "POST", data);
                  await refresh();
                  setModal("");
                  if (view === "pawn") {
                    setPawnSection("maintainer");
                    history.replaceState(null, "", pawnUrl("maintainer"));
                  } else {
                    setView("admin");
                    history.replaceState(null, "", "/maintainer");
                  }
                  setToast("Maintainer account activated.");
                });
              }}
            >
              <label>
                Maintainer setup key
                <input
                  type="password"
                  name="token"
                  required
                  autoComplete="off"
                  placeholder="Private key supplied during setup"
                />
              </label>
              <Submit busy={busy}>
                <ShieldCheck size={16} />
                Activate maintainer access
              </Submit>
            </form>
          )}
        </Modal>
      )}
      {modal === "reset" && resetUser && (
        <Modal title="Help a student get back in." onClose={closeModal}>
          {temporaryPassword ? (
            <div className="form">
              <p>
                Give this temporary password to{" "}
                <strong>{resetUser.name}</strong> in person. It is only shown
                here once.
              </p>
              <code className="temporary-password">{temporaryPassword}</code>
              <p className="inline-note">
                Previous sessions are signed out. The student must choose a new
                password after logging in.
              </p>
              <button className="button primary" onClick={closeModal}>
                Done
                <Check size={17} />
              </button>
            </div>
          ) : (
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                action(async () => {
                  const r = await api("admin/reset", "POST", {
                    userId: resetUser.id,
                    identityChecked: true,
                  });
                  setTemporaryPassword(r.temporaryPassword);
                });
              }}
            >
              <p>
                <strong>{resetUser.name}</strong>
                <br />
                Student ID: {resetUser.student_id}
                <br />
                {hostelName(resetUser.hostel)}
                <br />
                {locationText(resetUser)}
              </p>
              <label className="checkbox-label">
                <input type="checkbox" required />I verified this student’s
                identity using their ID card.
              </label>
              <Submit busy={busy}>
                Issue temporary password
                <ArrowRight size={17} />
              </Submit>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
