"use client";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  LockKeyhole,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  calculateBook,
  demandSuggestions,
  todayIST,
  type LedgerEntry,
} from "../../domain/bookkeeping";
import { money } from "../../domain/shared";
import { sellerRequest as request } from "../../shared/lib/api-client";
import { Modal } from "../../shared/ui/dialog";
import { BookEntryForm } from "./book-entry-form";
import type { Choice } from "./types";
export function SellerDashboard({ onBrowse }: { onBrowse: () => void }) {
  const today = todayIST(),
    [entries, setEntries] = useState<LedgerEntry[]>([]),
    [choices, setChoices] = useState<Choice[]>([]),
    [month, setMonth] = useState(today.slice(0, 7)),
    [day, setDay] = useState(today),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [form, setForm] = useState<{
      kind: "purchase" | "sale";
      key?: string;
      quantity?: number;
      entry?: LedgerEntry;
    } | null>(null),
    [remove, setRemove] = useState<LedgerEntry | null>(null),
    [busy, setBusy] = useState(false),
    [planDays, setPlanDays] = useState(3),
    [search, setSearch] = useState("");
  async function load() {
    try {
      const d = await request("book");
      setEntries(d.entries);
      setChoices(d.choices);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const f = () => void load();
    window.addEventListener("focus", f);
    return () => window.removeEventListener("focus", f);
  }, []);
  const book = useMemo(() => calculateBook(entries), [entries]),
    demand = useMemo(
      () => demandSuggestions(book, today, planDays),
      [book, today, planDays],
    );
  const monthRows = book.rows.filter((e) => e.entry_date.startsWith(month)),
    sales = monthRows.filter((e) => e.kind === "sale"),
    purchases = monthRows.filter((e) => e.kind === "purchase"),
    revenue = sales.reduce((s, e) => s + e.total, 0),
    profit = sales.reduce((s, e) => s + e.profit, 0),
    spend = purchases.reduce((s, e) => s + e.total, 0),
    sold = sales.reduce((s, e) => s + e.quantity, 0);
  const best = new Map<
    string,
    { name: string; units: number; revenue: number }
  >();
  for (const row of sales) {
    const p = best.get(row.product_key) || {
      name: row.name,
      units: 0,
      revenue: 0,
    };
    p.units += row.quantity;
    p.revenue += row.total;
    best.set(row.product_key, p);
  }
  const bestSellers = [...best.values()]
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);
  const dayRows = monthRows
    .filter(
      (e) =>
        e.entry_date === day &&
        (!search ||
          `${e.name} ${e.notes}`.toLowerCase().includes(search.toLowerCase())),
    )
    .reverse();
  const daysInMonth = new Date(
      Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
    ).getUTCDate(),
    offset = (new Date(month + "-01T12:00:00Z").getUTCDay() + 6) % 7;
  const monthlyLabel = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(month + "-01T12:00:00Z"));
  function changeMonth(delta: number) {
    const m = new Date(
      Date.UTC(
        Number(month.slice(0, 4)),
        Number(month.slice(5, 7)) - 1 + delta,
        1,
      ),
    )
      .toISOString()
      .slice(0, 7);
    setMonth(m);
    setDay(m + "-01");
  }
  function exportCSV() {
    const cell = (v: string | number) =>
      '"' +
      (typeof v === "string" && /^[=+\-@]/.test(v)
        ? "'" + v
        : String(v)
      ).replaceAll('"', '""') +
      '"';
    const rows = [
      [
        "Date",
        "Item",
        "Type",
        "Units",
        "Unit amount INR",
        "Total INR",
        "Cost of sold stock INR",
        "Gross profit INR",
        "Notes",
      ],
      ...monthRows.map((e) => [
        e.entry_date,
        e.name,
        e.kind,
        e.quantity,
        e.unit_price / 100,
        e.total / 100,
        e.cost / 100,
        e.profit / 100,
        e.notes,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `stashbox-private-book-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const combined = [...choices];
  for (const p of book.products)
    if (!combined.some((c) => c.key === p.key))
      combined.push({ key: p.key, name: p.name, price: p.lastPrice });
  return (
    <section className="seller-dashboard">
      <header className="seller-heading">
        <div>
          <span className="eyebrow orange">YOUR PRIVATE SHOP NOTEBOOK</span>
          <h1>
            Small stash.
            <br />
            <em>Smarter business.</em>
          </h1>
          <p>
            Track what you bought, what you sold, and what deserves a restock.
          </p>
          <span className="private-label">
            <LockKeyhole size={14} />
            Only your account can access these records.
          </span>
        </div>
        <div className="seller-heading-actions">
          <button
            className="button primary"
            onClick={() => setForm({ kind: "sale" })}
          >
            <Plus size={17} />
            Record a sale
          </button>
          <button
            className="button ghost"
            onClick={() => setForm({ kind: "purchase" })}
          >
            <Package size={17} />
            Add purchased stock
          </button>
          <button className="text-button" onClick={onBrowse}>
            Back to shop controls
            <ArrowUpRight size={14} />
          </button>
        </div>
      </header>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="book-period">
        <div>
          <button
            className="icon-btn"
            aria-label="Previous month"
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft size={20} />
          </button>
          <h2>{monthlyLabel}</h2>
          <button
            className="icon-btn"
            aria-label="Next month"
            onClick={() => changeMonth(1)}
          >
            <ChevronRight size={20} />
          </button>
          <button
            className="text-button"
            onClick={() => {
              setMonth(today.slice(0, 7));
              setDay(today);
            }}
          >
            Today
          </button>
        </div>
        <div>
          <button
            className="icon-btn"
            aria-label="Refresh private book"
            onClick={() => void load()}
          >
            <RefreshCw size={18} />
          </button>
          <button
            className="button ghost"
            disabled={!monthRows.length}
            onClick={exportCSV}
          >
            <Download size={16} />
            Export month
          </button>
        </div>
      </div>
      {loading ? (
        <p role="status">Opening your private notebook...</p>
      ) : (
        <>
          <div className="book-metrics">
            {[
              ["Sales revenue", money(revenue)],
              ["Units sold", String(sold)],
              ["Estimated gross profit", money(profit)],
              ["Stock purchased", money(spend)],
              ["Cash in minus purchases", money(revenue - spend)],
              [
                "Stock value now",
                money(book.products.reduce((s, p) => s + p.value, 0)),
              ],
            ].map(([label, value]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          <p className="book-explainer">
            Profit uses the recorded cost of the oldest stock sold first (FIFO).
            These are estimates from your entries, not verified payments.
            Records do not change public stock availability.
          </p>
          <div className="book-columns">
            <section className="book-panel">
              <div className="book-section-title">
                <h2>Your stock calendar</h2>
                <span>IST dates</span>
              </div>
              <div className="book-calendar">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <span className="weekday" key={i}>
                    {d}
                  </span>
                ))}
                {Array.from({ length: offset }, (_, i) => (
                  <span key={"blank" + i} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const date = month + "-" + String(i + 1).padStart(2, "0"),
                    rows = monthRows.filter((r) => r.entry_date === date),
                    s = rows
                      .filter((r) => r.kind === "sale")
                      .reduce((sum, r) => sum + r.quantity, 0),
                    p = rows
                      .filter((r) => r.kind === "purchase")
                      .reduce((sum, r) => sum + r.quantity, 0);
                  return (
                    <button
                      key={date}
                      className={`${date === day ? "selected" : ""} ${date === today ? "today" : ""}`}
                      aria-label={`${date}, ${s} sold, ${p} purchased`}
                      aria-pressed={date === day}
                      onClick={() => setDay(date)}
                    >
                      <span>{i + 1}</span>
                      {s > 0 && <small className="sales-dot">{s} sold</small>}
                      {p > 0 && <small>+{p} in</small>}
                    </button>
                  );
                })}
              </div>
              <p className="field-hint">
                Select a day to view or add records for that date.
              </p>
            </section>
            <section className="book-panel">
              <div className="book-section-title">
                <h2>Best Stashers this month</h2>
                <TrendingUp size={19} />
              </div>
              {bestSellers.length ? (
                bestSellers.map((p, i) => (
                  <div className="best-seller" key={p.name}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{p.name}</strong>
                      <div className="best-bar">
                        <i
                          style={{
                            width: `${(p.units / bestSellers[0].units) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <p>
                      {p.units} sold<small>{money(p.revenue)}</small>
                    </p>
                  </div>
                ))
              ) : (
                <div className="book-empty">
                  <TrendingUp size={30} />
                  <p>
                    Record sales to see which items your neighbours keep coming
                    back for.
                  </p>
                </div>
              )}
              <div className="book-section-title stock-heading-small">
                <h3>Restock soon</h3>
                <span>3 units or fewer</span>
              </div>
              {book.products
                .filter((p) => p.stock <= 3)
                .slice(0, 5)
                .map((p) => (
                  <div className="restock-row" key={p.key}>
                    <div>
                      <strong>{p.name}</strong>
                      <span>{p.stock} left in your private book</span>
                    </div>
                    <button
                      className="button ghost"
                      onClick={() => setForm({ kind: "purchase", key: p.key })}
                    >
                      Restock
                    </button>
                  </div>
                ))}
              {!book.products.some((p) => p.stock <= 3) && (
                <p className="field-hint">
                  Low-stock products will appear here as you record sales.
                </p>
              )}
            </section>
          </div>
          <section className="book-panel demand-panel">
            <div className="book-section-title">
              <div>
                <span className="eyebrow orange">
                  YOUR SALES, NOT GUESSWORK
                </span>
                <h2>What should you stock next?</h2>
              </div>
              <label>
                Plan for{" "}
                <select
                  aria-label="Restock planning days"
                  value={planDays}
                  onChange={(e) => setPlanDays(Number(e.target.value))}
                >
                  {[3, 5, 7, 14].map((d) => (
                    <option key={d} value={d}>
                      {d} days
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="book-explainer">
              See your fastest movers over the last 7 days and plan your next
              restock.
            </p>
            {demand.length ? (
              <div className="demand-grid">
                {demand.slice(0, 6).map((p) => (
                  <article key={p.key}>
                    <div>
                      <strong>{p.name}</strong>
                      <span className="signal-tag">
                        {p.early
                          ? "Early signal"
                          : p.recentUnits > p.previousUnits
                            ? "Picking up"
                            : p.recentUnits < p.previousUnits
                              ? "Slower this week"
                              : "Steady demand"}
                      </span>
                    </div>
                    <dl>
                      <div>
                        <dt>Sold in 7 days</dt>
                        <dd>{p.recentUnits}</dd>
                      </div>
                      <div>
                        <dt>Previous 7 days</dt>
                        <dd>{p.previousUnits}</dd>
                      </div>
                      <div>
                        <dt>In stock now</dt>
                        <dd>{p.stock}</dd>
                      </div>
                      <div>
                        <dt>Approx. days left</dt>
                        <dd>{p.daysLeft?.toFixed(1) ?? "—"}</dd>
                      </div>
                    </dl>
                    <p>
                      {p.suggested > 0
                        ? `Consider buying ${p.suggested} more for the next ${planDays} days.`
                        : "Your recorded stock covers this plan at the recent sales rate."}
                    </p>
                    <button
                      className="button ghost"
                      onClick={() =>
                        setForm({
                          kind: "purchase",
                          key: p.key,
                          quantity: Math.max(1, p.suggested),
                        })
                      }
                    >
                      Log a restock
                      <Plus size={15} />
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="book-empty">
                <Package size={30} />
                <p>
                  Record purchases and sales to see your fastest movers and
                  suggested restocks.
                </p>
              </div>
            )}
          </section>
          <section className="book-panel">
            <div className="book-section-title">
              <div>
                <h2>
                  {new Intl.DateTimeFormat("en-IN", {
                    dateStyle: "long",
                    timeZone: "UTC",
                  }).format(new Date(day + "T12:00:00Z"))}
                </h2>
                <span>{dayRows.length} records</span>
              </div>
              <button
                className="button ghost"
                onClick={() => setForm({ kind: "sale" })}
              >
                <Plus size={16} />
                Add record
              </button>
            </div>
            <input
              className="book-search"
              aria-label="Search this day's records"
              placeholder="Find an item or note on this day"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {dayRows.length ? (
              <div className="ledger-table-wrap">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Record</th>
                      <th>Units</th>
                      <th>Total</th>
                      <th>Gross profit</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayRows.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <strong>{e.name}</strong>
                          {e.notes && <small>{e.notes}</small>}
                        </td>
                        <td>
                          <span className={`record-tag ${e.kind}`}>
                            {e.kind === "sale" ? "Sold" : "Purchased"}
                          </span>
                        </td>
                        <td>{e.quantity}</td>
                        <td>{money(e.total)}</td>
                        <td>{e.kind === "sale" ? money(e.profit) : "—"}</td>
                        <td>
                          <button
                            className="icon-btn"
                            aria-label={"Edit record for " + e.name}
                            onClick={() => setForm({ kind: e.kind, entry: e })}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-btn"
                            aria-label={"Delete record for " + e.name}
                            onClick={() => setRemove(e)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="book-empty">
                <p>
                  No records for this date yet. Add a purchase or sale to keep
                  your notebook current.
                </p>
              </div>
            )}
          </section>
        </>
      )}
      {form && (
        <Modal
          title={
            form.entry
              ? "Correct a private record."
              : form.kind === "sale"
                ? "Log a sale."
                : "Add purchased or opening stock."
          }
          onClose={() => setForm(null)}
        >
          <BookEntryForm
            initial={form.entry}
            kind={form.kind}
            productKey={form.key}
            quantity={form.quantity}
            date={day > today ? today : day}
            choices={combined}
            book={book}
            onSave={async (b) => {
              await request(
                form.entry ? "book/" + form.entry.id : "book",
                form.entry ? "PUT" : "POST",
                b,
              );
              await load();
              setForm(null);
            }}
          />
        </Modal>
      )}
      {remove && (
        <Modal
          title="Delete this private record?"
          onClose={() => setRemove(null)}
        >
          <div className="form">
            <p>
              {remove.name} · {remove.quantity}{" "}
              {remove.kind === "sale" ? "sold" : "purchased"} on{" "}
              {remove.entry_date}. Totals and stock will be recalculated.
            </p>
            <p className="field-hint">
              A purchase cannot be removed if doing so would leave a later sale
              without recorded stock.
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await request("book/" + remove.id, "DELETE");
                  await load();
                  setRemove(null);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Deleting..." : "Delete record"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
