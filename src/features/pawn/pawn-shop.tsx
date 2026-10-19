"use client";
import {
  ArrowUpRight,
  MapPin,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  hostelName,
  locationText,
  money,
  type User,
} from "../../domain/shared";
import { requestJSON as call } from "../../shared/lib/api-client";
import { Modal } from "../../shared/ui/dialog";
import { PaymentQR, SellerPayments } from "../payments/payment-qr";
import { PawnForm } from "./pawn-form";
import type { PawnSection } from "./pawn-sidebar";
type PawnItem = {
  id: string;
  title: string;
  description: string;
  condition: string;
  price: number;
  photo_id: string | null;
  status: string;
  available: number;
  seller_id: string;
  seller_name: string;
  hostel: string;
  wing: string;
  room: string;
  phase: string | null;
  phone: string | null;
  upi_qr_id?: string | null;
};
function PawnArt({ item }: { item: PawnItem }) {
  return item.photo_id ? (
    <img
      src={"/api/market/media/" + item.photo_id}
      alt={item.title}
      loading="lazy"
    />
  ) : (
    <div className="pawn-placeholder">
      <Package size={48} strokeWidth={1} />
      <span>THE PAWN SHOP</span>
      <strong>{item.title}</strong>
    </div>
  );
}
export function PawnShop({
  user,
  onLogin,
  onProfile,
  section = "all",
  onSection,
}: {
  user: User | null;
  onLogin: () => void;
  onProfile: () => void;
  section?: PawnSection;
  onSection?: (s: PawnSection) => void;
}) {
  const [items, setItems] = useState<PawnItem[]>([]),
    [own, setOwn] = useState<PawnItem[]>([]),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("new"),
    [selected, setSelected] = useState<PawnItem | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [formVersion, setFormVersion] = useState(0),
    [ownQR, setOwnQR] = useState<string | null>(user?.upi_qr_id || null);
  async function refresh() {
    try {
      const d = await call("pawn");
      setItems(d.listings);
      if (user) {
        setOwn((await call("pawn/mine")).listings);
        setOwnQR((await call("payment-qr")).qr?.id || null);
      }
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
    const f = () => void refresh();
    window.addEventListener("focus", f);
    return () => window.removeEventListener("focus", f);
  }, [user?.id]);

  const tab = section === "mine" ? "mine" : "all";
  const rows = (tab === "mine" ? own : items)
    .filter((i) =>
      `${i.title} ${i.description} ${i.seller_name || ""} ${hostelName(i.hostel)}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort(sort === "price" ? (a, b) => a.price - b.price : () => 0);
  function sell() {
    if (!user) {
      onLogin();
      return;
    }
    if (!user.hostel || !user.wing || user.must_change_password) {
      onProfile();
      return;
    }
    onSection?.("sell");
  }
  useEffect(() => {
    setQuery("");
    window.scrollTo({ top: 0 });
  }, [section]);
  if (section === "sell" || section === "mine")
    return (
      <section className="pawn-shop pawn-settings pawn-sell-page">
        <span className="pawn-kicker">YOUR CORNER OF THE SHOP</span>
        <h1>
          Deploy <em>The Pawn.</em>
        </h1>
        <p>
          Add your item, check your contact details and choose how buyers can
          reach you.
        </p>
        {!user ? (
          <button className="button pawn-primary" onClick={onLogin}>
            Log in to list an item
          </button>
        ) : (
          <>
            <div className="pawn-sell-location">
              <MapPin size={20} />
              <div>
                <strong>{hostelName(user.hostel)}</strong>
                <span>
                  {locationText(user)} ·{" "}
                  {user.show_phone ? "Calls enabled" : "Meet at your room"}
                </span>
              </div>
              <button className="button ghost" onClick={onProfile}>
                Edit my details
              </button>
            </div>
            <div className="pawn-sell-columns">
              <section className="pawn-sell-card">
                <h2>1. Your item</h2>
                {!user.hostel || !user.wing || user.must_change_password ? (
                  <button className="button pawn-primary" onClick={onProfile}>
                    Complete my profile
                  </button>
                ) : (
                  <PawnForm
                    key={formVersion}
                    onSave={async (b) => {
                      await call("pawn", "POST", b);
                      await refresh();
                      setNotice("Your item is on the shop floor.");
                      setFormVersion((v) => v + 1);
                    }}
                  />
                )}
              </section>
              <aside className="pawn-sell-card">
                <h2>2. Payment & contact</h2>
                <p>
                  Buyers arrange the exchange directly with you. Adding a
                  payment code is optional.
                </p>
                <SellerPayments onChanged={refresh} />
                <p className="field-hint">
                  Check the item and agree on the price before exchanging money.
                </p>
              </aside>
            </div>
            <section className="pawn-owned-section">
              <h2>
                Your listed items <span>({own.length})</span>
              </h2>
              {notice && (
                <p role="status" className="pawn-notice">
                  {notice}
                </p>
              )}
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              {own.length ? (
                <div className="pawn-grid">
                  {own.map((i) => (
                    <article className="pawn-card" key={i.id}>
                      <button
                        className="pawn-open"
                        onClick={() => setSelected(i)}
                      >
                        <div className="pawn-art">
                          <PawnArt item={i} />
                        </div>
                        <div className="pawn-card-copy">
                          <h3>{i.title}</h3>
                          <strong>{money(i.price)}</strong>
                          <p>
                            {i.status === "rejected"
                              ? "Hidden by moderator"
                              : i.available
                                ? "On the shop floor"
                                : "Sold"}
                          </p>
                        </div>
                      </button>
                      <div className="pawn-owner-controls">
                        <button
                          disabled={busy || i.status === "rejected"}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              await call("pawn/mine/" + i.id, "PUT", {
                                available: !i.available,
                              });
                              await refresh();
                            } catch (e) {
                              setError((e as Error).message);
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          {i.available ? "Mark sold" : "Relist"}
                        </button>
                        <button
                          aria-label={"Remove " + i.title}
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              await call("pawn/mine/" + i.id, "DELETE");
                              await refresh();
                            } catch (e) {
                              setError((e as Error).message);
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p>
                  Your listed items will appear here. Add your first item above.
                </p>
              )}
            </section>
            {selected && (
              <Modal title={selected.title} onClose={() => setSelected(null)}>
                <div className="form">
                  <div className="pawn-detail-art">
                    <PawnArt item={selected} />
                  </div>
                  <h3>{money(selected.price)}</h3>
                  <p>{selected.description}</p>
                  <PaymentQR id={ownQR} />
                </div>
              </Modal>
            )}
          </>
        )}
      </section>
    );
  if (section === "rules")
    return (
      <section className="pawn-shop pawn-settings">
        <span className="pawn-kicker">A GOOD SHOP RUNS ON TRUST</span>
        <h1>Shop rules</h1>
        <div className="pawn-guidelines">
          <article>
            <h2>Useful things. Honest descriptions.</h2>
            <p>
              List items you own, describe their condition and use your own
              photos. Meet the Stasher and check the item before you pay.
            </p>
          </article>
          <article>
            <h2>Keep it clean.</h2>
            <p>
              No tobacco, cigarettes, vapes, intoxicants, controlled substances
              or weapons. Prescription medicines and loose tablets are not
              allowed. Medicine items must be sealed and non-prescription.
            </p>
          </article>
          <article>
            <h2>A direct deal.</h2>
            <p>
              There are no app orders, reservations or fees. Payment happens
              directly between buyer and Stasher. Check the UPI recipient before
              confirming a payment.
            </p>
          </article>
          <article>
            <h2>Look out for each other.</h2>
            <p>
              Keep listings honest and respectful. If something does not seem
              right, contact your moderator through Help & support.
            </p>
          </article>
        </div>
      </section>
    );
  return (
    <section className="pawn-shop">
      <header className="pawn-masthead pawn-masthead-vintage">
        <div className="pawn-title-row">
          <div>
            <h1>The Pawn Shop</h1>
            <p className="pawn-shop-motto">Good things. Second chapters.</p>
          </div>
          <div className="pawn-stamp" aria-label="Buy and sell">
            BUY<span>&</span>SELL
          </div>
        </div>
        <div className="pawn-intro">
          <p>
            Buy and sell useful things across campus. Find a cycle, pass on a
            book, or give an old favourite a new home.
          </p>
          <button className="button pawn-primary" onClick={sell}>
            <Plus size={18} />
            List an item
          </button>
        </div>
      </header>
      <div className="pawn-toolbar">
        <h2>Browse the shop</h2>
        <button
          className="icon-btn"
          aria-label="Refresh Pawn Shop"
          onClick={() => void refresh()}
        >
          <RefreshCw size={18} />
        </button>
      </div>
      <div className="pawn-search">
        <label>
          <Search size={19} />
          <input
            aria-label="Search The Pawn Shop"
            placeholder="Search for something worth keeping..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Sort Pawn Shop"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="new">Newest finds</option>
          <option value="price">Lowest price</option>
        </select>
      </div>
      {notice && (
        <p className="pawn-notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="pawn-notice" role="alert">
          {error}
        </p>
      )}
      <div className="pawn-count">
        {loading
          ? "Opening the shop..."
          : `${rows.length} ${rows.length === 1 ? "find" : "finds"} on the shelf`}
        <span>No fees. A direct deal.</span>
      </div>
      {rows.length ? (
        <div className="pawn-grid">
          {rows.map((i) => (
            <article className="pawn-card" key={i.id}>
              <button className="pawn-open" onClick={() => setSelected(i)}>
                <div className="pawn-art">
                  <PawnArt item={i} />
                  <span className="pawn-condition">{i.condition}</span>
                </div>
                <div className="pawn-card-copy">
                  <h2>{i.title}</h2>
                  <p>
                    {hostelName(i.hostel)}
                    {tab === "mine" && !i.hostel ? "Your listing" : ""}
                  </p>
                  <div className="pawn-price">
                    <strong>{money(i.price)}</strong>
                    <ArrowUpRight size={21} />
                  </div>
                  <span className="pawn-location">
                    <MapPin size={14} />
                    {i.room
                      ? locationText(i)
                      : i.available
                        ? "Available"
                        : "Sold"}
                  </span>
                </div>
              </button>
              {tab === "mine" && (
                <div className="pawn-owner-controls">
                  <span>
                    {i.status === "rejected"
                      ? "Removed by moderator"
                      : i.available
                        ? "Live"
                        : "Sold"}
                  </span>
                  <button
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await call("pawn/mine/" + i.id, "PUT", {
                          available: !i.available,
                        });
                        await refresh();
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {i.available ? "Mark sold" : "Relist"}
                  </button>
                  <button
                    aria-label={"Remove " + i.title}
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await call("pawn/mine/" + i.id, "DELETE");
                        await refresh();
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        !loading && (
          <div className="pawn-empty">
            <Package size={42} strokeWidth={1} />
            <h2>
              {query
                ? "Nothing on this shelf yet."
                : "Every find starts with a listing."}
            </h2>
            <p>
              {query
                ? "Try another search."
                : "Have something useful you no longer need? Give it a second chapter."}
            </p>
            <button className="button pawn-primary" onClick={sell}>
              List an item
              <Plus size={17} />
            </button>
          </div>
        )
      )}
      <footer className="pawn-rules">
        <ShieldCheck size={18} />
        <p>
          Keep the exchange useful and respectful. List only permitted items you
          own. Read the shop rules before selling.
        </p>
      </footer>
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)} wide>
          <div className="pawn-detail">
            <div className="pawn-detail-art">
              <PawnArt item={selected} />
            </div>
            <div className="pawn-detail-copy">
              <span>{selected.condition}</span>
              <h3>{money(selected.price)}</h3>
              <p>{selected.description}</p>
              <div className="pawn-seller">
                <strong>{selected.seller_name || user?.name}</strong>
                <p>
                  {hostelName(selected.hostel || user?.hostel)}
                  <br />
                  {locationText(
                    selected.room
                      ? selected
                      : {
                          room: user?.room || "",
                          wing: user?.wing,
                          phase: user?.phase,
                        },
                  )}
                </p>
              </div>
              {selected.phone ? (
                <a className="button primary" href={"tel:" + selected.phone}>
                  <Phone size={17} />
                  Call Stasher
                </a>
              ) : (
                <p>Visit the Stasher to arrange the exchange.</p>
              )}
              <PaymentQR id={selected.upi_qr_id} />
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
