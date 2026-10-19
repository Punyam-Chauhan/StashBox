"use client";
import { ChevronDown, Phone } from "lucide-react";
import { currentPrice } from "../../domain/pricing";
import {
  groupVariants,
  sellerCount,
  startingPrice,
} from "../../domain/product-groups";
import { locationText, money, type Listing } from "../../domain/shared";
import { PaymentQR } from "../payments/payment-qr";
import { PriceDetails } from "./pricing-fields";

export function relative(time: number) {
  const m = Math.max(0, Math.floor((Date.now() - time) / 60000));
  return m < 1
    ? "just now"
    : m < 60
      ? `${m}m ago`
      : `${Math.floor(m / 60)}h ago`;
}
export function CompareOffers({
  offers,
  mandakini,
}: {
  offers: Listing[];
  mandakini: boolean;
}) {
  const prices = offers.filter((o) => o.is_open).map((o) => currentPrice(o)),
    best = prices.length ? Math.min(...prices) : null;
  const groups = mandakini
    ? [
        {
          label: "Phases 1 & 2",
          rows: offers.filter((o) => o.phase === "1" || o.phase === "2"),
        },
        {
          label: "Phase 3 · Separate access",
          rows: offers.filter((o) => o.phase === "3"),
        },
      ]
    : [{ label: "", rows: offers }];
  return (
    <div className="offer-list">
      {groups
        .filter((g) => g.rows.length)
        .map((g) => (
          <section key={g.label} className="offer-group">
            {g.label && <h4>{g.label}</h4>}
            {[...g.rows]
              .sort(
                (a, b) =>
                  b.is_open - a.is_open || currentPrice(a) - currentPrice(b),
              )
              .map((o) => {
                const lowest = !!o.is_open && currentPrice(o) === best;
                return (
                  <article
                    className={`offer offer-card ${lowest ? "offer-best" : ""}`}
                    key={o.id}
                  >
                    <div className="offer-identity">
                      <span className="room-tile" title={"Room " + o.room}>
                        <small>ROOM</small>
                        <strong
                          className={
                            String(o.room).length > 4
                              ? "room-label-long"
                              : undefined
                          }
                        >
                          {o.room}
                        </strong>
                      </span>
                      <div className="offer-person">
                        <strong>{o.seller_name}</strong>
                        <span>{locationText(o)}</span>
                      </div>
                    </div>
                    <div className="offer-freshness">
                      <span
                        className={o.is_open ? "offer-open" : "offer-closed"}
                      >
                        <i />
                        {o.is_open ? "Open now" : "Closed now"}
                      </span>
                      <span>Checked {relative(o.confirmed_at)}</span>
                    </div>
                    <div className="offer-bottom">
                      <div className="offer-price">
                        <strong>{money(currentPrice(o))}</strong>
                        {lowest && (
                          <small className="best-price-label">
                            Best open price
                          </small>
                        )}
                        <PriceDetails item={o} />
                      </div>
                      <div className="offer-actions">
                        <PaymentQR
                          id={o.is_open ? o.upi_qr_id : null}
                          compact
                        />
                        {o.phone && o.is_open ? (
                          <a
                            className="call-button"
                            href={"tel:" + o.phone}
                            aria-label={"Call " + o.seller_name}
                          >
                            <Phone size={17} />
                            <span>Call</span>
                          </a>
                        ) : (
                          <span className="walk-label">
                            {o.is_open ? "Walk over" : "Sleeping"}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
          </section>
        ))}
    </div>
  );
}
export function VariantOffers({
  offers,
  mandakini,
}: {
  offers: Listing[];
  mandakini: boolean;
}) {
  const variants = groupVariants(offers);
  return (
    <div className="variant-offers">
      <p className="variant-help">
        Choose an MRP and pack option to see who has it. Prices below are per
        pack.
      </p>
      {variants.map((variant, index) => {
        const lowest = startingPrice(variant.offers),
          sellers = sellerCount(variant.offers);
        return (
          <details
            className="pack-variant"
            key={variant.key}
            open={index === 0}
          >
            <summary>
              <span className="variant-title">
                <strong>{variant.label}</strong>
                <small>
                  {sellers} {sellers === 1 ? "Stasher" : "Stashers"} · Rooms &
                  prices
                </small>
              </span>
              <span className="variant-starting-price">
                <small>from</small>
                {money(lowest)}
              </span>
              <ChevronDown size={18} />
            </summary>
            <CompareOffers offers={variant.offers} mandakini={mandakini} />
          </details>
        );
      })}
    </div>
  );
}
