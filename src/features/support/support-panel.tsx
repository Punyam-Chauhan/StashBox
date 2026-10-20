"use client";
import { ArrowUpRight, MapPin, ShieldCheck } from "lucide-react";
function Web({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`support-web ${className}`}
      viewBox="0 0 240 240"
      fill="none"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="1">
        <path d="M0 0 240 240M0 0 240 96M0 0 96 240M0 0 240 0M0 0 0 240M0 0 240 45M0 0 45 240M0 0 180 240M0 0 240 180" />
        {[42, 80, 122, 168, 218].map((r) => (
          <path
            key={r}
            d={`M0 ${r}Q${r * 0.12} ${r * 0.65} ${r * 0.3} ${r * 0.72}Q${r * 0.45} ${r * 0.45} ${r * 0.72} ${r * 0.3}Q${r * 0.65} ${r * 0.12} ${r} 0`}
          />
        ))}
      </g>
    </svg>
  );
}
function Mask() {
  return (
    <svg className="support-mask" viewBox="0 0 210 255" aria-hidden="true">
      <defs>
        <linearGradient id="support-mask-red" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ed674a" />
          <stop offset="1" stopColor="#a92e25" />
        </linearGradient>
        <clipPath id="support-mask-clip">
          <path d="M105 26C44 26 29 76 38 132c5 32 34 71 67 89 33-18 62-57 67-89 9-56-6-106-67-106Z" />
        </clipPath>
      </defs>
      <path d="M105 0v27" stroke="#d6d9bb" strokeWidth="2" />
      <g transform="rotate(8 105 125)">
        <path
          d="M105 26C44 26 29 76 38 132c5 32 34 71 67 89 33-18 62-57 67-89 9-56-6-106-67-106Z"
          fill="url(#support-mask-red)"
          stroke="#172015"
          strokeWidth="5"
        />
        <g
          clipPath="url(#support-mask-clip)"
          fill="none"
          stroke="#56251f"
          strokeWidth="1.5"
          opacity=".7"
        >
          <path d="M105 27v196M30 110h150M105 110 35 35M105 110 177 35M105 110 33 190M105 110 181 190M105 110 57 232M105 110 153 232M105 110 15 77M105 110 195 77" />
          {[22, 45, 72, 100].map((r) => (
            <ellipse key={r} cx="105" cy="110" rx={r} ry={r * 1.2} />
          ))}
        </g>
        <path
          d="M50 88q11 5 39 20l5 30q-36 9-44-50ZM160 88q-11 5-39 20l-5 30q36 9 44-50Z"
          fill="#f6edd6"
          stroke="#172015"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path
          d="m57 91 24 15M153 91l-24 15"
          stroke="#fff"
          strokeWidth="2"
          opacity=".6"
        />
      </g>
      <ellipse cx="108" cy="244" rx="49" ry="5" fill="#000" opacity=".15" />
    </svg>
  );
}
export function WhatsAppLogo() {
  return (
    <svg
      className="whatsapp-logo"
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M16.04 2.5A13.4 13.4 0 0 0 4.4 22.52L2.5 29.5l7.15-1.87A13.5 13.5 0 1 0 16.04 2.5Zm0 24.53a11.08 11.08 0 0 1-5.65-1.55l-.4-.24-4.24 1.11 1.13-4.13-.26-.43A11.1 11.1 0 1 1 16.04 27.03Zm6.1-8.32c-.33-.16-1.96-.97-2.26-1.08-.3-.1-.52-.16-.74.17-.22.32-.85 1.07-1.04 1.29-.2.21-.39.24-.72.08-.33-.16-1.4-.52-2.65-1.64-.98-.87-1.64-1.96-1.83-2.29-.19-.33-.02-.51.15-.67.14-.15.33-.38.5-.57.16-.19.21-.33.32-.55.11-.21.06-.4-.02-.57-.08-.16-.74-1.79-1.02-2.45-.26-.64-.53-.55-.74-.56h-.63c-.22 0-.57.08-.87.41-.3.33-1.14 1.11-1.14 2.71s1.17 3.15 1.33 3.37c.16.21 2.31 3.53 5.6 4.95.78.34 1.39.54 1.86.69.78.25 1.48.21 2.04.13.62-.09 1.96-.8 2.24-1.57.28-.76.28-1.41.2-1.55-.08-.13-.3-.21-.63-.38Z" />
    </svg>
  );
}
export function SupportPanel({
  experience = "stashbox",
}: {
  experience?: "stashbox" | "pawn";
}) {
  const app = experience === "pawn" ? "The Pawn Shop" : "StashBox",
    whatsapp =
      "https://wa.me/919368930104?text=" +
      encodeURIComponent("Hi Punyam! I need a hand with " + app + ". ");
  return (
    <section className="support-panel">
      <Web />
      <Web className="web-bottom" />
      <div className="support-comic-top">
        <span>
          {app}
          <strong>YOUR CAMPUS HELP DESK</strong>
        </span>
        <span className="support-issue">
          HERE TO
          <br />
          HELP.
        </span>
      </div>
      <div className="support-main">
        <div className="support-art">
          <span className="support-burst">
            HEY,
            <br />
            NEIGHBOUR!
          </span>
          <Mask />
          <span className="support-art-note">No cape. Just campus.</span>
        </div>
        <div className="support-intro">
          <h3>
            Your friendly
            <br />
            <em>neighbourhood</em>
            <br />
            maintainer.
          </h3>
          <p className="support-name">
            Punyam Chauhan<span>Your campus maintainer</span>
          </p>
        </div>
      </div>
      <div className="support-address">
        <MapPin size={20} />
        <p>
          Patel Bhawan <span>Wing 9 · Room 224</span>
        </p>
      </div>
      <p className="support-copy">
        Something broken? Need a hand? Drop a message or swing by. We will
        figure it out together.
      </p>
      <a
        className="support-whatsapp"
        href={whatsapp}
        target="_blank"
        rel="noreferrer"
        aria-label="Report a bug? WhatsApp Punyam"
        title="Message Punyam on WhatsApp"
      >
        <WhatsAppLogo />
        <span>
          <strong>Report a bug?</strong>
          <small>Message Punyam</small>
        </span>
        <ArrowUpRight size={22} />
      </a>
      <div className="support-footnote">
        <ShieldCheck size={16} />
        <span>A screenshot helps us get you unstuck faster.</span>
      </div>
    </section>
  );
}
