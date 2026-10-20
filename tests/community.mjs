import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const base = "http://127.0.0.1:5173",
  run = "community" + Date.now(),
  ids = [];
let checks = 0;
const check = (v, msg) => {
  assert(v, msg);
  checks++;
  console.log("PASS " + msg);
};
function sql(command) {
  const r = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/sites-env.mjs",
      "./node_modules/wrangler/bin/wrangler.js",
      "d1",
      "execute",
      "DB",
      "--local",
      "--config",
      "dist/server/wrangler.json",
      "--persist-to",
      ".wrangler/state",
      "--command",
      command,
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) throw Error(r.stderr || r.stdout);
}
async function api(path, method = "GET", body, cookie = "") {
  const r = await fetch(base + "/api/" + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get("set-cookie")?.split(";")[0] || "",
  };
}
async function signup(suffix, hostel) {
  const r = await api("signup", "POST", {
    name: "Community Tester",
    email: run + suffix + "@example.test",
    studentId: run + suffix,
    phone: "9000000000",
    password: "Testing-password-482!",
    hostel,
    wing: "9",
    room: "224",
  });
  check(r.status === 200, "Signup " + suffix);
  ids.push(r.data.user.id);
  return r;
}
const bytes = new Uint8Array(
  readFileSync(
    new URL(
      "../public/packets/kurkure-masala-40g-supplied.webp",
      import.meta.url,
    ),
  ),
);
assert(
  bytes.length > 16000 && bytes.length <= 200000,
  "Exercise real WebP uploads above the JSON body limit",
);
async function image(kind, cookie) {
  const r = await fetch(base + "/api/market/upload?kind=" + kind, {
    method: "POST",
    headers: {
      Cookie: cookie,
      "Content-Type": "image/webp",
      "X-Photo-Rights": "confirmed",
    },
    body: bytes,
  });
  return { status: r.status, data: await r.json() };
}
try {
  check(
    (await api("pawn")).status === 200,
    "Pawn Shop needs no hostel selection or login",
  );
  const a = await signup("a", "patel"),
    b = await signup("b", "tagore");
  const listing = {
    title: "QA Campus cycle " + run,
    description: "Used cycle in good condition with lock.",
    condition: "Used - good",
    price: 150000,
  };
  check(
    (await api("pawn", "POST", listing)).status === 401,
    "Anonymous writes rejected",
  );
  check(
    (
      await api(
        "pawn",
        "POST",
        { ...listing, title: "c 1 g 4 r 3 t t 3 s" },
        a.cookie,
      )
    ).status === 400,
    "Disguised tobacco blocked",
  );
  check(
    (
      await api(
        "pawn",
        "POST",
        { ...listing, description: "Includes g a n j a" },
        a.cookie,
      )
    ).status === 400,
    "Spaced Hinglish prohibited term blocked",
  );
  check(
    (await api("pawn", "POST", { ...listing, title: "Cycle 😀" }, a.cookie))
      .status === 400,
    "Non-ASCII listing text rejected",
  );
  check(
    (
      await api(
        "pawn",
        "POST",
        { ...listing, description: "Prescription tramadol" },
        a.cookie,
      )
    ).status === 400,
    "Prescription medicines blocked",
  );
  check(
    (
      await api(
        "mine",
        "POST",
        {
          name: "QA v4p3 kit",
          category: "Sweet tooth",
          mrp: 2000,
          price: 2000,
        },
        a.cookie,
      )
    ).status === 400,
    "Snack name moderation cannot be bypassed",
  );
  for (const name of [
    "chhoti gold",
    "choti gold",
    "Gold Flake",
    "Classic Milds",
    "cig",
  ]) {
    check(
      (
        await api(
          "mine",
          "POST",
          { name, category: "Chips & namkeen", mrp: 5000, price: 7000 },
          a.cookie,
        )
      ).status === 400,
      "Snack tobacco alias blocked: " + name,
    );
    check(
      (await api("pawn", "POST", { ...listing, title: name }, a.cookie))
        .status === 400,
      "Pawn tobacco alias blocked: " + name,
    );
  }
  check(
    (
      await api(
        "mine",
        "POST",
        {
          name: "Oreo Original",
          category: "Sweet tooth",
          mrp: 2000,
          price: 2000,
          offerText: "Free c1garette",
        },
        a.cookie,
      )
    ).status === 400,
    "Snack offer text moderated",
  );
  const photo = await image("pawn", a.cookie);
  check(
    photo.status === 200 && photo.data.status === "approved",
    "Images upload automatically without review queue",
  );
  const png = Uint8Array.from([
    137,
    80,
    78,
    71,
    13,
    10,
    26,
    10,
    ...Array(24).fill(0),
  ]);
  check(
    (
      await fetch(base + "/api/market/upload?kind=pawn", {
        method: "POST",
        headers: {
          Cookie: a.cookie,
          "Content-Type": "image/png",
          "X-Photo-Rights": "confirmed",
        },
        body: png,
      })
    ).status === 400,
    "Server rejects unconverted PNG uploads",
  );
  check(
    (
      await fetch(base + "/api/market/upload?kind=pawn", {
        method: "POST",
        headers: {
          Cookie: a.cookie,
          "Content-Type": "image/webp",
          "X-Photo-Rights": "confirmed",
        },
        body: new Uint8Array(200001),
      })
    ).status === 413,
    "Server enforces 200 KB cap",
  );
  check(
    (
      await api(
        "pawn",
        "POST",
        { ...listing, photoId: photo.data.id },
        b.cookie,
      )
    ).status === 400,
    "Another seller cannot attach private item uploads",
  );
  check(
    (
      await api(
        "pawn",
        "POST",
        { ...listing, photoId: photo.data.id },
        a.cookie,
      )
    ).status === 200,
    "General listing posts with no category",
  );
  let feed = (await api("pawn")).data.listings;
  const item = feed.find((i) => i.title === listing.title);
  check(
    item && item.status === "approved",
    "Compliant listing publishes immediately",
  );
  check(
    item.hostel === "patel" && item.wing === "9" && item.room === "224",
    "Campus listing shows seller hostel, wing and room",
  );
  check(!item.phone && !("email" in item), "Contact privacy preserved");
  check(
    (await api("pawn/mine", "GET", undefined, a.cookie)).data.listings.find(
      (i) => i.id === item.id,
    ).hostel === "patel",
    "My items retains location",
  );
  check(
    (await api("pawn/mine/" + item.id, "DELETE", undefined, b.cookie))
      .status === 404,
    "Pawn ownership enforced",
  );
  const qr = await image("qr", a.cookie);
  check(qr.status === 200, "Seller can opt in to a QR image");
  check(
    (await api("pawn")).data.listings.find((i) => i.id === item.id)
      .upi_qr_id === qr.data.id,
    "Buyer listing includes optional seller QR",
  );
  check(
    (await fetch(base + "/api/market/media/" + qr.data.id)).status === 200,
    "Buyer can expand and fetch QR",
  );
  await api(
    "mine",
    "POST",
    { name: "Oreo Original", mrp: 2000, price: 2000 },
    a.cookie,
  );
  check(
    (await api("listings?hostel=patel")).data.listings.find(
      (i) => i.seller_id === a.data.user.id,
    ).upi_qr_id === qr.data.id,
    "QR is shared with snack buyer price area",
  );
  check(
    (await api("admin/review", "GET", undefined, a.cookie)).status === 403,
    "Ordinary users cannot see maintainer activity",
  );
  sql("UPDATE users SET role='admin' WHERE id='" + b.data.user.id + "'");
  let dashboard = (await api("admin/review", "GET", undefined, b.cookie)).data;
  check(
    dashboard.pawn.some((i) => i.id === item.id) &&
      dashboard.qrs.some((q) => q.id === qr.data.id),
    "Maintainer sees new Pawn Shop listings and QR uploads",
  );
  await api(
    "admin/review",
    "PUT",
    { kind: "pawn", id: item.id, status: "rejected" },
    b.cookie,
  );
  check(
    !(await api("pawn")).data.listings.some((i) => i.id === item.id),
    "Maintainer can remove a live item",
  );
  await api("pawn/mine/" + item.id, "PUT", { available: true }, a.cookie);
  check(
    !(await api("pawn")).data.listings.some((i) => i.id === item.id),
    "Seller cannot bypass a maintainer removal",
  );
  await api(
    "admin/review",
    "PUT",
    { kind: "pawn", id: item.id, status: "approved" },
    b.cookie,
  );
  check(
    (await api("pawn")).data.listings.some((i) => i.id === item.id),
    "Maintainer can restore an item",
  );
  await api(
    "admin/review",
    "PUT",
    { kind: "qr", id: qr.data.id, status: "rejected" },
    b.cookie,
  );
  check(
    !(await api("pawn")).data.listings.find((i) => i.id === item.id).upi_qr_id,
    "Hidden QR removed from buyer view",
  );
  check(
    (await fetch(base + "/api/market/media/" + qr.data.id)).status === 404,
    "Hidden QR bytes cannot be fetched publicly",
  );
  await api("payment-qr", "DELETE", undefined, a.cookie);
  check(
    (await api("payment-qr", "GET", undefined, a.cookie)).data.qr === null,
    "Seller can remove QR opt-in",
  );
  check(
    (await fetch(base + "/api/market/media/" + qr.data.id)).status === 404,
    "Removed QR is not public through an old image URL",
  );
  await api("pawn/mine/" + item.id, "PUT", { available: false }, a.cookie);
  check(
    !(await api("pawn")).data.listings.some((i) => i.id === item.id),
    "Sold items leave shop floor",
  );
  console.log(checks + " community integration checks passed.");
} finally {
  if (ids.length) {
    const quoted = ids.map((i) => "'" + i + "'").join(",");
    sql(
      "DELETE FROM audit WHERE actor IN (" +
        quoted +
        ");DELETE FROM users WHERE id IN (" +
        quoted +
        ");DELETE FROM rate_limits;",
    );
  }
}
