"use client";
import { useState } from "react";
import {
  activeOffer,
  currentPrice,
  istInput,
  parseIST,
  priceTime,
  type Pricing,
} from "../../domain/pricing";
import { money } from "../../domain/shared";
export function PriceDetails({ item }: { item: Pricing }) {
  const now = Date.now(),
    active = activeOffer(item, now);
  return (
    <div className="price-details">
      {active && item.usual_price && (
        <span>
          <s>{money(item.usual_price)}</s> · Save{" "}
          {money(item.usual_price - currentPrice(item, now))}
        </span>
      )}
      {active && item.offer_text && (
        <span className="offer-note">{item.offer_text}</span>
      )}
      {active && item.price_until && (
        <span>
          {item.price_after != null
            ? `${money(item.price)} until ${priceTime(item.price_until)}; then ${money(item.price_after)}`
            : `Offer ends ${priceTime(item.price_until)}`}
        </span>
      )}
    </div>
  );
}
export function PricingFields({ initial }: { initial?: Pricing }) {
  const [enabled, setEnabled] = useState(
    !!(
      initial?.price_after ||
      initial?.usual_price ||
      initial?.offer_text ||
      initial?.price_until
    ),
  );
  const [timed, setTimed] = useState(!!initial?.price_until),
    [until, setUntil] = useState(
      initial?.price_until ? istInput(initial.price_until) : "",
    );
  return (
    <details className="form-section" open={enabled || undefined}>
      <summary>Offers & timed pricing · optional</summary>
      <fieldset className="pricing-fields">
        <legend className="sr-only">Offers & timed pricing</legend>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Add an offer or a price change
        </label>
        {enabled && (
          <>
            <label>
              Offer note
              <input
                name="offerText"
                maxLength={100}
                defaultValue={initial?.offer_text || ""}
                placeholder="e.g. Midnight deal - 2 for Rs 35"
              />
            </label>
            <label>
              Usual selling price (₹) · optional
              <input
                name="usualPrice"
                type="number"
                min="1"
                max="1000"
                step="0.01"
                defaultValue={
                  initial?.usual_price ? initial.usual_price / 100 : ""
                }
                placeholder="Show a discount against your usual price"
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={timed}
                onChange={(e) => setTimed(e.target.checked)}
              />
              Set an end time / change price later
            </label>
            {timed && (
              <>
                <label>
                  Valid until · IST
                  <input
                    name="priceUntil"
                    type="datetime-local"
                    required
                    value={until}
                    onChange={(e) => setUntil(e.target.value)}
                  />
                </label>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    const tomorrow = new Date(
                      Date.now() + 330 * 60000 + 86400000,
                    )
                      .toISOString()
                      .slice(0, 10);
                    setUntil(tomorrow + "T00:00");
                  }}
                >
                  Tonight at midnight (12 AM)
                </button>
                <label>
                  Price after this time (₹) · optional
                  <input
                    name="priceAfter"
                    type="number"
                    min="1"
                    max="1000"
                    step="0.01"
                    defaultValue={
                      initial?.price_after ? initial.price_after / 100 : ""
                    }
                    placeholder="e.g. 25"
                  />
                </label>
                <p>
                  Prices switch automatically. Leave the later price blank to
                  end only the offer note and discount label.
                </p>
              </>
            )}
          </>
        )}
        <input
          type="hidden"
          name="pricingEnabled"
          value={enabled ? "yes" : "no"}
        />
      </fieldset>
    </details>
  );
}
export function readPricing(form: HTMLFormElement) {
  const f = new FormData(form),
    enabled = f.get("pricingEnabled") === "yes";
  const amount = (key: string) =>
    enabled && f.get(key) ? Math.round(Number(f.get(key)) * 100) : null;
  return {
    priceAfter: amount("priceAfter"),
    usualPrice: amount("usualPrice"),
    offerText: enabled ? String(f.get("offerText") || "") : "",
    priceUntil:
      enabled && f.get("priceUntil")
        ? parseIST(String(f.get("priceUntil")))
        : null,
  };
}
