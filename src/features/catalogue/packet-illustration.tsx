// Code-drawn fallback: deterministic colour and label, no network or generated files.
export function PacketIllustration({
  name,
  category = "Chips & namkeen",
}: {
  name: string;
  category?: string;
}) {
  const hash = Array.from(name.toLowerCase()).reduce(
    (n, c) => (n * 31 + c.charCodeAt(0)) >>> 0,
    0,
  );
  const color = ["#ff733c", "#4a87cf", "#bd6294", "#81a45f", "#e5bb43"][
      hash % 5
    ],
    drink = category === "Drinks",
    sweet = category === "Sweet tooth",
    instant = category === "Instant fixes";
  const words = name.trim().split(/\s+/),
    lines: string[] = [];
  for (const word of words) {
    const last = lines.length - 1;
    if (last >= 0 && (lines[last] + " " + word).length <= 15)
      lines[last] += " " + word;
    else lines.push(word);
  }
  return (
    <svg
      className="packet-vector"
      viewBox="0 0 220 220"
      role="img"
      aria-label={`${name || "Snack"} packet illustration`}
    >
      <ellipse cx="110" cy="195" rx="61" ry="9" fill="#000" opacity=".12" />
      <g transform="rotate(-7 110 110)">
        {drink ? (
          <>
            <rect x="59" y="25" width="102" height="166" rx="20" fill={color} />
            <ellipse cx="110" cy="28" rx="48" ry="8" fill="#c7cabd" />
            <ellipse cx="110" cy="28" rx="14" ry="4" fill="#68705e" />
            <path d="M73 49v111" stroke="white" opacity=".25" strokeWidth="4" />
          </>
        ) : (
          <>
            <path d="M45 25h130l-8 22 10 142H43L53 47Z" fill={color} />
            <path d="M45 25h130M43 189h134" stroke={color} strokeWidth="12" />
            <path
              d="M54 21v9m12-9v9m12-9v9m12-9v9m12-9v9m12-9v9m12-9v9m12-9v9m12-9v9M53 185v9m13-9v9m13-9v9m13-9v9m13-9v9m13-9v9m13-9v9m13-9v9m13-9v9"
              stroke="#fff"
              opacity=".35"
            />
          </>
        )}
        <text
          x="110"
          y="54"
          textAnchor="middle"
          fill="#162014"
          fontFamily="Arial,sans-serif"
          fontSize="8"
          fontWeight="bold"
          letterSpacing="2"
        >
          STASHBOX
        </text>
        {lines.slice(0, 3).map((line, i) => (
          <text
            key={i}
            x="110"
            y={79 + i * 17}
            textAnchor="middle"
            fill="#fff8e8"
            fontFamily="Arial,sans-serif"
            fontSize={line.length > 14 ? 12 : 14}
            fontWeight="900"
          >
            {line.slice(0, 20)}
          </text>
        ))}
        {sweet ? (
          <>
            <circle cx="106" cy="148" r="26" fill="#513026" />
            <circle
              cx="106"
              cy="148"
              r="19"
              fill="none"
              stroke="#a27252"
              strokeWidth="3"
            />
            <path
              d="m93 136 26 25m-26-1 26-25"
              stroke="#a27252"
              strokeWidth="3"
            />
          </>
        ) : instant ? (
          <>
            <path d="M75 146q35 55 70 0" fill="#fbf2d2" />
            <path
              d="M78 144q8-15 16 0t16 0t16 0t16 0"
              fill="none"
              stroke="#efd047"
              strokeWidth="5"
            />
          </>
        ) : drink ? (
          <path
            d="M90 140q20-19 40-2m-40 18q20-19 40-2"
            fill="none"
            stroke="#fff8e8"
            strokeWidth="5"
          />
        ) : (
          <>
            <path d="M85 137q-17 14 1 23l40-16q13-10-3-15Z" fill="#f7d277" />
            <path d="M101 163q-11 10 3 16l34-13q10-10-3-15Z" fill="#f5b843" />
          </>
        )}
        <text
          x="110"
          y="181"
          textAnchor="middle"
          fill="#fff8e8"
          fontFamily="Arial,sans-serif"
          fontSize="7"
          letterSpacing="1.6"
        >
          PACKET ILLUSTRATION
        </text>
      </g>
      <path d="m186 31 5-11 4 11 12 4-12 4-4 11-5-11-11-4Z" fill="#cddab1" />
    </svg>
  );
}
