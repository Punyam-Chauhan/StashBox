"use client";
import { useEffect, useState } from "react";
import {
  calculateBook,
  todayIST,
  type LedgerEntry,
} from "../../domain/bookkeeping";
import { money } from "../../domain/shared";
import type { Choice } from "./types";
export function BookEntryForm({
  initial,
  kind: initialKind,
  productKey,
  quantity,
  date,
  choices,
  book,
  onSave,
}: {
  initial?: LedgerEntry;
  kind: "purchase" | "sale";
  productKey?: string;
  quantity?: number;
  date: string;
  choices: Choice[];
  book: ReturnType<typeof calculateBook>;
  onSave: (b: any) => Promise<void>;
}) {
  const [kind, setKind] = useState(initial?.kind || initialKind),
    [key, setKey] = useState(
      initial?.product_key || productKey || choices[0]?.key || "custom",
    ),
    [amount, setAmount] = useState(
      initial ? String(initial.unit_price / 100) : "",
    ),
    [units, setUnits] = useState(String(initial?.quantity || quantity || 1)),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (initial) return;
    const p = book.products.find((p) => p.key === key),
      c = choices.find((c) => c.key === key);
    setAmount(
      String(
        (kind === "sale"
          ? c?.price || p?.lastPrice || 0
          : p?.averageCost || 0) / 100,
      ),
    );
  }, [key, kind]);
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        try {
          await onSave({
            kind,
            productKey: key === "custom" ? "" : key,
            name: f.get("name"),
            quantity: Number(units),
            unitPrice: Math.round(Number(amount) * 100),
            date: f.get("date"),
            notes: f.get("notes") || "",
          });
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        Private bookkeeping only. Add purchases or opening stock before
        recording sales for an item.
      </p>
      <div className="form-grid">
        <label>
          Record type
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as "purchase" | "sale")}
          >
            <option value="purchase">Purchased / opening stock</option>
            <option value="sale">Sold</option>
          </select>
        </label>
        <label>
          Date · IST
          <input
            name="date"
            type="date"
            required
            min="2020-01-01"
            max={todayIST()}
            defaultValue={initial?.entry_date || date}
          />
        </label>
      </div>
      <label>
        Item
        <select value={key} onChange={(e) => setKey(e.target.value)}>
          {choices.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
          <option value="custom">Add another item to my private book</option>
        </select>
      </label>
      {key === "custom" && (
        <label>
          Item name
          <input
            name="name"
            required
            maxLength={120}
            placeholder="Use a clear name and pack size / MRP"
          />
        </label>
      )}
      <div className="form-grid">
        <label>
          Number of items
          <input
            type="number"
            required
            min="1"
            max="10000"
            step="1"
            value={units}
            onChange={(e) => setUnits(e.target.value)}
          />
        </label>
        <label>
          {kind === "purchase"
            ? "Cost per item (Rs)"
            : "Selling price per item (Rs)"}
          <input
            type="number"
            required
            min={kind === "purchase" ? "0" : "0.01"}
            max="50000"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
      </div>
      <p className="entry-total">
        Record total{" "}
        <strong>
          {money(
            Math.round((Number(amount) || 0) * 100) * (Number(units) || 0),
          )}
        </strong>
      </p>
      <label>
        Private note · optional
        <input
          name="notes"
          maxLength={200}
          defaultValue={initial?.notes || ""}
          placeholder="e.g. Evening restock or sales after dinner"
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary full" disabled={busy}>
        {busy
          ? "Saving..."
          : initial
            ? "Save corrected record"
            : "Save private record"}
      </button>
    </form>
  );
}
