"use client";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  Moon,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { CATALOG, HOSTELS, type Product } from "../../domain/shared";

export function Packet({
  product,
}: {
  product: Pick<Product, "name" | "category" | "color" | "short">;
}) {
  const drink = product.category === "Drinks",
    cookie = product.category === "Sweet tooth",
    noodles = product.category === "Instant fixes";
  return (
    <svg
      className="packet"
      viewBox="0 0 220 210"
      role="img"
      aria-label={`${product.name} illustration`}
    >
      <ellipse cx="110" cy="187" rx="57" ry="8" fill="#000" opacity=".12" />
      <g transform="rotate(-9 110 105)">
        {drink ? (
          <>
            <rect
              x="71"
              y="28"
              width="78"
              height="154"
              rx="16"
              fill={product.color}
            />
            <ellipse cx="110" cy="29" rx="38" ry="7" fill="#bcbfba" />
            <ellipse cx="110" cy="29" rx="12" ry="3" fill="#646961" />
          </>
        ) : (
          <>
            <path
              d="M53 25H166L159 42 171 174H49L59 42Z"
              fill={product.color}
            />
            <path
              d="M53 25H166M49 174H171"
              stroke={product.color}
              strokeWidth="11"
            />
            <path
              d="M61 23v7m9-7v7m9-7v7m9-7v7m9-7v7m9-7v7m9-7v7m9-7v7m9-7v7m9-7v7m9-7v7M58 171v8m10-8v8m10-8v8m10-8v8m10-8v8m10-8v8m10-8v8m10-8v8m10-8v8m10-8v8m10-8v8"
              stroke="#fff"
              opacity=".25"
            />
            <path
              d="M61 43l-4 113"
              stroke="#fff"
              strokeWidth="3"
              opacity=".25"
            />
          </>
        )}
        <text
          x="110"
          y="76"
          textAnchor="middle"
          fill={
            product.color === "#f3cd34" || product.color === "#e9c843"
              ? "#762916"
              : "#fff8e8"
          }
          fontWeight="900"
          fontStyle="italic"
          fontSize={
            product.short.length > 10
              ? "13"
              : product.short.length > 7
                ? "18"
                : "25"
          }
          fontFamily="Arial,sans-serif"
        >
          {product.short}
        </text>
        {drink ? (
          <path
            d="M83 104q27-25 54-7M83 125q27-25 54-7"
            fill="none"
            stroke="#fff8e8"
            strokeWidth="5"
          />
        ) : cookie ? (
          <>
            <circle cx="110" cy="123" r="30" fill="#34251d" />
            <circle
              cx="110"
              cy="123"
              r="23"
              stroke="#745b47"
              strokeWidth="3"
              fill="none"
            />
            <path
              d="M91 108l36 31m-33-2l29-31"
              stroke="#745b47"
              strokeWidth="3"
            />
            <circle cx="144" cy="149" r="11" fill="#34251d" />
          </>
        ) : noodles ? (
          <>
            <ellipse cx="110" cy="135" rx="42" ry="22" fill="#f9f2d1" />
            <path d="M75 134q35 57 70 0" fill="#a83129" />
            <path
              d="M84 126q9-17 17 0t17 0t17 0M83 132q9-17 17 0t17 0t17 0M94 111q-8-9 0-16"
              fill="none"
              stroke="#e9bd47"
              strokeWidth="4"
            />
          </>
        ) : (
          <>
            <path d="M86 116q-17 13 1 20l35-12q14-7 3-14Z" fill="#f7c65c" />
            <path d="M96 147q-15 9 2 17l35-12q13-12-3-15Z" fill="#f2ac42" />
          </>
        )}
        <text
          x="110"
          y="164"
          textAnchor="middle"
          fill="#fff8e8"
          fontSize="7"
          fontFamily="Arial,sans-serif"
          letterSpacing="2"
        >
          MIDNIGHT ESSENTIAL
        </text>
      </g>
    </svg>
  );
}
export function Hero({
  onSell,
  landing = false,
}: {
  onSell: () => void;
  landing?: boolean;
}) {
  return (
    <section className={`hero ${landing ? "hero-landing" : "hero-bottom"}`}>
      <div className="hero-copy">
        <div className="eyebrow">
          <span />
          AFTER IN-TIME. STILL SNACK TIME.
        </div>
        <h1>
          Your hostel’s
          <br />
          <em>midnight menu.</em>
        </h1>
        <p>
          {landing ? (
            <>
              Someone down the hall has what you’re craving.
              <br />
              Find it. Compare it. Walk over.
            </>
          ) : (
            <>
              <strong className="hero-stash-caption">
                Your cupboard could be someone’s midnight rescue.
              </strong>
              <span className="hero-stash-note">
                No commission. No checkout. Just your stash, on the map.
              </span>
            </>
          )}
        </p>
        <button className="button primary" onClick={onSell}>
          <Plus size={18} />
          {landing ? "Choose your hostel" : "Got a stash? Start selling"}
          <ArrowUpRight size={17} />
        </button>
        <div className="hero-caption">
          <span className="tiny-avatars">
            <i>☾</i>
            <i>✦</i>
            <i>↗</i>
          </span>
          Your campus. One midnight supply club.
        </div>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <span className="art-star star-one">✳</span>
        <span className="art-star star-two">✦</span>
        <div className="art-packet packet-a">
          <Packet product={CATALOG[0]} />
        </div>
        <div className="art-packet packet-b">
          <Packet product={CATALOG[1]} />
        </div>
        <div className="art-packet packet-c">
          <Packet product={CATALOG[2]} />
        </div>
        <div className="art-sticker">
          YOUR NEXT SNACK
          <br />
          <strong>is a few doors away.</strong>
          <ArrowUpRight size={25} />
        </div>
        <div className="art-tag">
          <Moon size={13} />
          THE MIDNIGHT SUPPLY CLUB
        </div>
      </div>
    </section>
  );
}
export function HostelLanding({
  onChoose,
  onDemo,
  selectedHostel,
}: {
  selectedHostel: string;
  onChoose: (id: string) => void;
  onDemo?: () => void;
}) {
  return (
    <div className="hostel-landing">
      <Hero
        landing
        onSell={() =>
          document
            .getElementById("hostel-choices")
            ?.scrollIntoView({ behavior: "smooth" })
        }
      />
      <section id="hostel-choices" className="hostel-choices">
        <div className="hostel-choices-heading">
          <div>
            <span className="eyebrow orange">
              YOUR BHAWAN. YOUR PEOPLE. YOUR STASH.
            </span>
            <h2>Where are you staying?</h2>
            <p>Pick a hostel. We’ll show you the snacks inside it.</p>
          </div>
          <span className="network-label">
            <Building2 size={16} />
            Your campus · one community
          </span>
        </div>
        <div className="hostel-grid">
          {HOSTELS.map((h, i) => (
            <button
              key={h.id}
              className={
                "hostel-card " +
                (h.id === selectedHostel ? "hostel-selected" : "")
              }
              aria-pressed={h.id === selectedHostel}
              onClick={() => onChoose(h.id)}
            >
              <div className="hostel-card-top">
                <span className="hostel-monogram">{h.initials}</span>
                <span className="hostel-number">
                  {h.id === selectedHostel ? (
                    <span className="hostel-selected-label">
                      <Check size={12} />
                      Last selected
                    </span>
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </span>
              </div>
              <h3>
                <span>{h.short}</span>
                <small>
                  {h.name.match(/(Bhawan|Hostel)$/i)?.[1] || "Campus residence"}
                </small>
              </h3>
              <p>
                {h.id === "mandakini"
                  ? "Phase 1 · Phase 2 · Phase 3"
                  : "Snacks a few doors away"}
              </p>
              <span className="hostel-card-bottom">
                See what is stocked <ArrowUpRight size={20} />
              </span>
            </button>
          ))}
        </div>
        <div className="hostel-landing-note">
          <ShieldCheck size={17} />
          <p>
            Your selected hostel keeps the snack hunt local. Stashers enter
            their own room and wing, so every bhawan fits.
          </p>
        </div>
        {onDemo && (
          <button className="demo-link" onClick={onDemo}>
            <Sparkles size={15} />
            Just looking around? Try demo listings after choosing a hostel
            <ArrowRight size={15} />
          </button>
        )}
      </section>
    </div>
  );
}
