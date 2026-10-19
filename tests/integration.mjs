// Runs against the local preview only. Creates synthetic accounts and removes them.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
const base = process.env.STASHBOX_TEST_URL || "http://127.0.0.1:5173";
assert(
  ["127.0.0.1", "localhost"].includes(new URL(base).hostname),
  "Tests are restricted to loopback.",
);
const run = `qa${Date.now()}`;
let checks = 0;
const ids = [];
const feed = "listings?hostel=mandakini";
const home = { hostel: "mandakini", wing: "East 9", phase: "1", room: "224" };
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
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
}
async function call(path, method = "GET", body, cookie = "", extra = {}) {
  const r = await fetch(`${base}/api/${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...extra,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await r.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { error: raw };
  }
  return {
    status: r.status,
    data,
    cookie: r.headers.get("set-cookie")?.split(";")[0] || "",
  };
}
function check(value, message) {
  assert(value, message);
  checks++;
  console.log(`PASS ${message}`);
}
async function signup(suffix, room = "224", location = home) {
  const r = await call("signup", "POST", {
    name: `QA Student ${suffix}`,
    email: `${run}${suffix}@example.test`,
    studentId: `${run}${suffix}`,
    phone: "9000000000",
    ...location,
    room,
    password: "Test-password-482!",
  });
  check(r.status === 200, `Signup ${suffix}`);
  ids.push(r.data.user.id);
  return { ...r, user: r.data.user };
}
try {
  const anonymous = await call("me");
  check(
    anonymous.status === 200 && anonymous.data.user === null,
    "Anonymous browsing needs no account",
  );
  const a = await signup("a"),
    b = await signup("b");
  check(
    a.user.room === b.user.room && a.user.id !== b.user.id,
    "Roommates have separate accounts",
  );
  check(
    (await call("me", "GET", undefined, a.cookie)).data.user?.id === a.user.id,
    "Session cookie identifies the student",
  );
  check(
    !("password_hash" in a.user) && !("salt" in a.user),
    "Private password material excluded from responses",
  );
  check(
    (
      await call("signup", "POST", {
        name: "Other",
        email: `${run}a@example.test`,
        studentId: `${run}new`,
        phone: "9000000000",
        ...home,
        password: "Test-password-482!",
      })
    ).status === 409,
    "Duplicate registration rejected",
  );
  check(
    (await call("login", "POST", { identifier: `${run}a`, password: "wrong" }))
      .status === 401,
    "Wrong passwords rejected",
  );
  check(
    (
      await call("login", "POST", {
        identifier: `${run}a`,
        password: "Test-password-482!",
      })
    ).status === 200,
    "Student ID login works",
  );
  check(
    (
      await call("login", "POST", {
        identifier: `${run}a@example.test`,
        password: "Test-password-482!",
      })
    ).status === 200,
    "Email login works",
  );
  check(
    (
      await call("mine", "POST", {
        productKey: "oreo-original-120g",
        mrp: 3000,
        photoChoice: "none",
        price: 3500,
      })
    ).status === 401,
    "Anonymous listing writes rejected",
  );
  check(
    (
      await call(
        "mine",
        "POST",
        {
          productKey: "oreo-original-120g",
          mrp: 3000,
          photoChoice: "none",
          price: 3500,
        },
        a.cookie,
      )
    ).status === 200,
    "Authenticated seller adds a snack",
  );
  await call(
    "mine",
    "POST",
    {
      productKey: "oreo-original-120g",
      mrp: 3000,
      photoChoice: "none",
      price: 3000,
    },
    b.cookie,
  );
  const mine = await call("mine", "GET", undefined, a.cookie),
    item = mine.data.listings[0];
  check(
    (
      await call(
        `mine/${item.id}`,
        "PUT",
        { price: 1000, available: true },
        b.cookie,
      )
    ).status === 404,
    "Seller cannot edit a roommate’s listing",
  );
  check(
    (await call(`mine/${item.id}`, "DELETE", undefined, b.cookie)).status ===
      404,
    "Seller cannot delete a roommate’s listing",
  );
  check(
    (
      await call(
        "mine",
        "POST",
        { productKey: "oreo-original-120g", price: 2000 },
        a.cookie,
      )
    ).status === 400,
    "Printed MRP is required",
  );
  await call(
    "mine",
    "POST",
    {
      productKey: "oreo-original-120g",
      mrp: 2000,
      price: 2500,
      photoChoice: "none",
    },
    a.cookie,
  );
  const variants = (await call("mine", "GET", undefined, a.cookie)).data
    .listings;
  check(
    variants.length === 2 &&
      new Set(variants.map((l) => l.product_key)).size === 2,
    "Same snack with different MRPs has separate listings",
  );
  const variant = variants.find((l) => l.mrp === 2000);
  await call(`mine/${variant.id}`, "DELETE", undefined, a.cookie);
  const rawImage = new Uint8Array(
    readFileSync(new URL("./fixtures/test-pixel.webp", import.meta.url)),
  );
  const locked = await fetch(
    base + "/api/photos/upload?name=Oreo%20Original&category=Sweet%20tooth",
    {
      method: "POST",
      headers: {
        Cookie: a.cookie,
        "Content-Type": "image/webp",
        "X-Photo-Rights": "confirmed",
      },
      body: rawImage,
    },
  );
  check(
    locked.status === 409,
    "Sellers cannot upload alternatives for products with shared images",
  );
  sql(`UPDATE users SET role='admin' WHERE id='${a.user.id}'`);
  const upload = await fetch(
    base + "/api/photos/upload?name=Oreo%20Original&category=Sweet%20tooth",
    {
      method: "POST",
      headers: {
        Cookie: a.cookie,
        "Content-Type": "image/webp",
        "X-Photo-Rights": "confirmed",
      },
      body: rawImage,
    },
  );
  const uploaded = await upload.json();
  check(
    upload.status === 200 && uploaded.photo.photo_source === "maintainer",
    "Maintainer can upload an alternate packet photo",
  );
  await call(
    "admin/photos",
    "PUT",
    {
      name: "Oreo Original",
      category: "Sweet tooth",
      photoId: uploaded.photo.photo_id,
    },
    a.cookie,
  );
  sql(`UPDATE users SET role='seller' WHERE id='${a.user.id}'`);
  const imageResponse = await fetch(
    base + "/api/photos/" + uploaded.photo.photo_id,
  );
  check(
    imageResponse.status === 200 &&
      imageResponse.headers.get("content-type") === "image/webp" &&
      new Uint8Array(await imageResponse.arrayBuffer()).length ===
        rawImage.length,
    "Cached image served through local server",
  );
  check(
    (
      await fetch(base + "/api/photos/upload", {
        method: "POST",
        headers: { Cookie: a.cookie, "Content-Type": "image/webp" },
        body: rawImage,
      })
    ).status === 400,
    "Photo reuse permission required",
  );
  check(
    (
      await fetch(base + "/api/photos/upload", {
        method: "POST",
        headers: {
          "Content-Type": "image/webp",
          "X-Photo-Rights": "confirmed",
        },
        body: rawImage,
      })
    ).status === 401,
    "Anonymous uploads rejected",
  );
  check(
    (
      await fetch(base + "/api/photos/upload", {
        method: "POST",
        headers: {
          Cookie: a.cookie,
          "Content-Type": "image/svg+xml",
          "X-Photo-Rights": "confirmed",
        },
        body: "<svg></svg>",
      })
    ).status === 415,
    "Unsafe SVG upload rejected",
  );
  const bItem = (await call("mine", "GET", undefined, b.cookie)).data
    .listings[0];
  check(
    (
      await call(
        `mine/${bItem.id}`,
        "PUT",
        { price: 3000, available: true, photoId: uploaded.photo.photo_id },
        b.cookie,
      )
    ).status === 200,
    "Shared product uploads can be reused by another seller",
  );
  await call(
    `mine/${item.id}`,
    "PUT",
    { price: 3500, available: true, photoId: uploaded.photo.photo_id },
    a.cookie,
  );
  check(
    (
      await call("photos/library?name=Oreo%20Original&category=Sweet%20tooth")
    ).data.photos.some((p) => p.photo_id === uploaded.photo.photo_id),
    "Seller photo added to universal product library",
  );
  check(
    !JSON.stringify((await call("photos/credits")).data).includes(a.user.email),
    "Public image credits exclude student account data",
  );
  const pub = await call(feed);
  const ours = pub.data.listings.filter((l) => ids.includes(l.seller_id));
  check(
    ours.length === 2 && ours[0].price === 3000,
    "Matching packs list both sellers in price order",
  );
  check(
    ours.every(
      (l) => l.phone === null && !("email" in l) && !("student_id" in l),
    ),
    "Phone, email and student ID private by default",
  );
  await call(
    "profile",
    "PUT",
    {
      name: a.user.name,
      phone: "9000000000",
      ...home,
      showPhone: true,
      isOpen: false,
    },
    a.cookie,
  );
  const shown = (await call(feed)).data.listings.find(
    (l) => l.seller_id === a.user.id,
  );
  check(!shown, "Closed shops are hidden on the server");
  await call(
    "profile",
    "PUT",
    {
      name: a.user.name,
      phone: "9000000000",
      ...home,
      showPhone: true,
      isOpen: true,
    },
    a.cookie,
  );
  const open = (await call(feed)).data.listings.find(
    (l) => l.seller_id === a.user.id,
  );
  check(
    open.phone === "9000000000" && open.wing === "East 9" && open.phase === "1",
    "Phone opt-in and entered wing/phase work",
  );
  check(
    (
      await call(
        "profile",
        "PUT",
        {
          name: "Test",
          phone: "9000000000",
          ...home,
          room: "../../",
          showPhone: false,
          isOpen: true,
        },
        a.cookie,
      )
    ).status === 400,
    "Invalid location labels rejected",
  );
  check(
    (
      await call(
        `mine/${item.id}`,
        "PUT",
        { price: -5, available: true },
        a.cookie,
      )
    ).status === 400,
    "Invalid prices rejected",
  );
  await call(
    `mine/${item.id}`,
    "PUT",
    { price: 3500, available: false },
    a.cookie,
  );
  check(
    !(await call(feed)).data.listings.some((l) => l.id === item.id),
    "Sold-out items excluded from public listings",
  );
  await call(
    `mine/${item.id}`,
    "PUT",
    { price: 3500, available: true },
    a.cookie,
  );
  sql(`UPDATE users SET confirmed_at=0 WHERE id='${a.user.id}'`);
  check(
    !(await call(feed)).data.listings.some((l) => l.id === item.id),
    "Stock older than 24 hours hidden on server",
  );
  await call("confirm", "POST", {}, a.cookie);
  check(
    (await call(feed)).data.listings.some((l) => l.id === item.id),
    "Daily confirmation republishes stock",
  );
  check(
    (await call("admin/users", "GET", undefined, b.cookie)).status === 403,
    "Ordinary sellers cannot read maintainer data",
  );
  check(
    (await call("admin/bootstrap", "POST", { token: "wrong" }, b.cookie))
      .status === 403,
    "Room 224 alone does not grant admin access",
  );
  check(
    (
      await call("confirm", "POST", {}, a.cookie, {
        Origin: "https://elsewhere.invalid",
      })
    ).status === 403,
    "Cross-origin writes rejected",
  );
  check(
    (await call("listings")).status === 400,
    "Hostel is required by the listing API",
  );
  check(
    (await call("listings?hostel=unknown")).status === 400,
    "Unknown hostels rejected",
  );
  const c = await signup("c", "B-12", {
    hostel: "tagore",
    wing: "West 7",
    phase: "3",
  });
  check(
    c.user.room === "B-12" && c.user.wing === "West 7" && c.user.phase === null,
    "Free-form room/wing supported and non-Mandakini phase cleared",
  );
  await call(
    "mine",
    "POST",
    {
      productKey: "oreo-original-120g",
      mrp: 3000,
      photoChoice: "none",
      price: 1000,
    },
    c.cookie,
  );
  check(
    !(await call(feed)).data.listings.some((l) => l.seller_id === c.user.id),
    "Other-hostel listings never enter Mandakini response",
  );
  check(
    (await call("listings?hostel=tagore")).data.listings
      .filter((l) => ids.includes(l.seller_id))
      .every((l) => l.seller_id === c.user.id),
    "Tagore response excludes Mandakini sellers",
  );
  check(
    (
      await call(
        "profile",
        "PUT",
        {
          name: b.user.name,
          phone: "9000000000",
          ...home,
          phase: "",
          showPhone: false,
          isOpen: true,
        },
        b.cookie,
      )
    ).status === 400,
    "Mandakini phase is required",
  );
  check(
    (
      await call(
        "profile",
        "PUT",
        {
          name: b.user.name,
          phone: "9000000000",
          ...home,
          phase: "4",
          showPhone: false,
          isOpen: true,
        },
        b.cookie,
      )
    ).status === 400,
    "Unknown Mandakini phase rejected",
  );
  await call(
    "profile",
    "PUT",
    {
      name: b.user.name,
      phone: "9000000000",
      ...home,
      phase: "3",
      showPhone: false,
      isOpen: true,
    },
    b.cookie,
  );
  const phases = (await call(feed)).data.listings.filter(
    (l) => l.seller_id === a.user.id || l.seller_id === b.user.id,
  );
  check(
    phases.some((l) => l.phase === "1") && phases.some((l) => l.phase === "3"),
    "Same room labels in different phases retain their phase",
  );
  sql(
    "UPDATE users SET hostel=NULL,wing=NULL,phase=NULL WHERE id='" +
      c.user.id +
      "'",
  );
  check(
    !(await call("listings?hostel=tagore")).data.listings.some(
      (l) => l.seller_id === c.user.id,
    ),
    "Existing unassigned accounts stay hidden until location is chosen",
  );
  check(
    (
      await call(
        "mine",
        "POST",
        {
          productKey: "maggi-masala-70g",
          mrp: 3000,
          photoChoice: "none",
          price: 2000,
        },
        c.cookie,
      )
    ).status === 400,
    "Unassigned accounts must choose location before adding stock",
  );
  await call(
    "profile",
    "PUT",
    {
      name: c.user.name,
      phone: "9000000000",
      hostel: "patel",
      wing: "South",
      room: "G-04",
      showPhone: false,
      isOpen: true,
    },
    c.cookie,
  );
  check(
    (await call("listings?hostel=patel")).data.listings.some(
      (l) => l.seller_id === c.user.id,
    ),
    "Profile location moves saved stock to its chosen hostel",
  );
  const setupKey = existsSync(".dev.vars")
    ? readFileSync(".dev.vars", "utf8").match(
        /^MAINTAINER_BOOTSTRAP_TOKEN="?([^"\r\n]+)"?$/m,
      )?.[1]
    : null;
  if (setupKey) {
    const bootstrap = await call(
      "admin/bootstrap",
      "POST",
      { token: setupKey },
      a.cookie,
    );
    check(
      [200, 409].includes(bootstrap.status),
      "Private setup key activates first maintainer or preserves existing one",
    );
    if (bootstrap.status === 409)
      sql(`UPDATE users SET role='admin' WHERE id='${a.user.id}'`);
    check(
      (await call("admin/bootstrap", "POST", { token: setupKey }, b.cookie))
        .status === 409,
      "A second maintainer cannot claim setup",
    );
  } else sql(`UPDATE users SET role='admin' WHERE id='${a.user.id}'`);
  check(
    (await call("admin/users", "GET", undefined, a.cookie)).status === 200,
    "Maintainer can find accounts",
  );
  check(
    (await call("admin/reset", "POST", { userId: b.user.id }, a.cookie))
      .status === 400,
    "Identity acknowledgement required before reset",
  );
  const reset = await call(
    "admin/reset",
    "POST",
    { userId: b.user.id, identityChecked: true },
    a.cookie,
  );
  check(
    reset.status === 200 && reset.data.temporaryPassword,
    "Maintainer issues a temporary password",
  );
  check(
    (await call("mine", "GET", undefined, b.cookie)).status === 401,
    "Password reset invalidates existing sessions",
  );
  const temp = await call("login", "POST", {
    identifier: `${run}b`,
    password: reset.data.temporaryPassword,
  });
  check(
    temp.status === 200 && temp.data.user.must_change_password === 1,
    "Temporary login requires a new password",
  );
  check(
    (await call("mine", "GET", undefined, temp.cookie)).status === 403,
    "Temporary session cannot manage stash",
  );
  const changed = await call(
    "password",
    "POST",
    {
      currentPassword: reset.data.temporaryPassword,
      password: "Replacement-password-936!",
    },
    temp.cookie,
  );
  check(
    changed.status === 200 && !changed.data.user.must_change_password,
    "Student changes temporary password",
  );
  check(
    (await call("mine", "GET", undefined, changed.cookie)).status === 200,
    "New password unlocks stash",
  );
  await call("logout", "POST", {}, changed.cookie);
  check(
    (await call("mine", "GET", undefined, changed.cookie)).status === 401,
    "Logout revokes session",
  );
  const newName = "QA Product " + run;
  const stock = await call(
    "mine",
    "POST",
    { name: newName, category: "Chips & namkeen", mrp: 2000, price: 2500 },
    a.cookie,
  );
  check(stock.status === 200, "A typed product can be added without a photo");
  const custom = (
    await call("mine", "GET", undefined, a.cookie)
  ).data.listings.find((l) => l.name === newName);
  check(custom && !custom.photo_id, "New product supports vector fallback");
  await call(`mine/${custom.id}`, "DELETE", undefined, a.cookie);
  check(
    (await call("products")).data.products.some((p) => p.name === newName),
    "Custom product remains in autocomplete after stock deletion",
  );
  check(
    (
      await call(
        "mine",
        "POST",
        { name: "Coca-Cola", mrp: 4000, price: 4500 },
        a.cookie,
      )
    ).status === 400,
    "Drinks require container and volume",
  );
  for (const container of ["Can", "Bottle"])
    check(
      (
        await call(
          "mine",
          "POST",
          {
            name: "Coca-Cola",
            mrp: 4000,
            price: 4500,
            container,
            volumeMl: 250,
          },
          a.cookie,
        )
      ).status === 200,
      container + " drink variant saved",
    );
  const drinks = (
    await call("mine", "GET", undefined, a.cookie)
  ).data.listings.filter((l) => l.name === "Coca-Cola");
  check(
    drinks.length === 2 && drinks[0].product_key !== drinks[1].product_key,
    "Same-MRP can and bottle compare separately",
  );
  check(
    drinks.every(
      (l) => l.photo_id === "library-coke-250ml" && l.volume_ml === 250,
    ),
    "Drink variants share one brand photo",
  );
  check(
    (await call("products")).data.products.find((p) => p.name === "Coca-Cola")
      .variants.length >= 2,
    "Previously added drink variants appear in suggestions",
  );
  check(
    (
      await call(
        "admin/photos",
        "PUT",
        {
          name: "Oreo Original",
          category: "Sweet tooth",
          photoId: uploaded.photo.photo_id,
        },
        c.cookie,
      )
    ).status === 403,
    "Only maintainer can change universal photo defaults",
  );
  const scheduleUntil = Date.now() + 600000;
  const scheduled = {
    name: "Kurkure Masala Munch",
    mrp: 2000,
    price: 2000,
    priceAfter: 2500,
    priceUntil: scheduleUntil,
    usualPrice: 2500,
    offerText: "Midnight deal",
  };
  check(
    (await call("mine", "POST", scheduled, a.cookie)).status === 200,
    "Seller can save timed discount",
  );
  const timed = (
    await call("mine", "GET", undefined, a.cookie)
  ).data.listings.find((l) => l.name === scheduled.name && l.mrp === 2000);
  check(
    timed?.price_after === 2500 && timed.usual_price === 2500,
    "Schedule persists in seller API",
  );
  check(
    (await call(feed)).data.listings.find((l) => l.id === timed.id)
      ?.effective_price === 2000,
    "Public API serves active discounted price",
  );
  check(
    (
      await call(
        "mine/" + timed.id,
        "PUT",
        { price: 2000, available: false },
        a.cookie,
      )
    ).status === 200,
    "Availability can change independently",
  );
  check(
    (await call("mine", "GET", undefined, a.cookie)).data.listings.find(
      (l) => l.id === timed.id,
    )?.price_until === scheduleUntil,
    "Availability keeps timed pricing",
  );
  await call(
    "mine/" + timed.id,
    "PUT",
    { price: 2000, available: true },
    a.cookie,
  );
  sql(
    "UPDATE listings SET price_until=" +
      String(Date.now() - 1000) +
      " WHERE id='" +
      timed.id +
      "'",
  );
  check(
    (await call(feed)).data.listings.find((l) => l.id === timed.id)
      ?.effective_price === 2500,
    "Expired schedule automatically serves later price",
  );
  check(
    (
      await call(
        "mine",
        "POST",
        { ...scheduled, priceUntil: Date.now() - 1000 },
        a.cookie,
      )
    ).status === 400,
    "Past cutoff rejected",
  );
  check(
    (await call("mine", "POST", { ...scheduled, priceAfter: 1 }, a.cookie))
      .status === 400,
    "Invalid later price rejected",
  );
  check(
    (await call("mine", "POST", { ...scheduled, usualPrice: 1500 }, a.cookie))
      .status === 400,
    "Misleading discount reference rejected",
  );
  await call(
    "mine/" + timed.id,
    "PUT",
    { price: 3000, available: true },
    a.cookie,
  );
  check(
    (await call("mine", "GET", undefined, a.cookie)).data.listings.find(
      (l) => l.id === timed.id,
    )?.price_until === null,
    "Manual quick price update clears old schedule",
  );
  const adminName = newName + " Admin";
  check(
    (
      await call(
        "admin/products",
        "POST",
        { name: adminName, category: "Sweet tooth" },
        a.cookie,
      )
    ).status === 200,
    "Maintainer can create a product before uploading its image",
  );
  const photoUpload = await fetch(
    base +
      "/api/photos/upload?name=" +
      encodeURIComponent(adminName) +
      "&category=Sweet%20tooth",
    {
      method: "POST",
      headers: {
        Cookie: a.cookie,
        "Content-Type": "image/webp",
        "X-Photo-Rights": "confirmed",
      },
      body: rawImage,
    },
  );
  const adminPhoto = await photoUpload.json();
  check(
    photoUpload.status === 200,
    "Maintainer can upload to the product library",
  );
  check(
    (
      await call(
        "admin/photos",
        "PUT",
        {
          name: adminName,
          category: "Sweet tooth",
          photoId: adminPhoto.photo.photo_id,
        },
        a.cookie,
      )
    ).status === 200,
    "Maintainer can choose the shared default image",
  );
  await call(
    "mine",
    "POST",
    { name: adminName, category: "Sweet tooth", mrp: 1500, price: 1800 },
    a.cookie,
  );
  const shared = (await call(feed)).data.listings.find(
    (l) => l.name === adminName,
  );
  check(
    shared?.photo_id === adminPhoto.photo.photo_id && shared.price === 1800,
    "Selected default appears on listings without changing their prices",
  );
  console.log(`\n${checks} integration checks passed.`);
} finally {
  if (ids.length) {
    const quoted = ids.map((id) => `'${id}'`).join(",");
    sql(
      `DELETE FROM product_photo_defaults WHERE photo_id IN (SELECT id FROM packet_photos WHERE uploaded_by IN (${quoted})); DELETE FROM product_catalog WHERE name LIKE 'QA Product ${run}%'; DELETE FROM packet_cache WHERE photo_id IN (SELECT id FROM packet_photos WHERE uploaded_by IN (${quoted})); DELETE FROM packet_photos WHERE uploaded_by IN (${quoted}); DELETE FROM audit WHERE actor IN (${quoted}) OR target IN (${quoted}); DELETE FROM listings WHERE seller_id IN (${quoted}); DELETE FROM sessions WHERE user_id IN (${quoted}); DELETE FROM users WHERE id IN (${quoted}); DELETE FROM rate_limits;`,
    );
  }
}
