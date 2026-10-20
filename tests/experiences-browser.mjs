import { chromium, browserExecutable } from "./helpers/browser.mjs";

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  executablePath: browserExecutable,
});
const admin = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  }),
  vendor = await browser.newContext(),
  page = await admin.newPage(),
  base = "http://127.0.0.1:5173",
  run = "experience" + Date.now(),
  name = "QA Cookie " + run,
  pawnName = "QA Campus desk " + run,
  ids = [],
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
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
  if (r.status) throw Error(r.stderr || r.stdout);
}
async function signup(context, suffix) {
  const r = await context.request.post(base + "/api/signup", {
    data: {
      name: "Experience Tester " + suffix,
      email: run + suffix + "@example.test",
      studentId: run + suffix,
      phone: "9000000000",
      password: "Test-password-482!",
      hostel: "patel",
      wing: "9",
      room: "224",
    },
  });
  assert.equal(r.status(), 200);
  const u = (await r.json()).user;
  ids.push(u.id);
  return u;
}
async function tool(title) {
  await page
    .locator(".maintainer-tool-card")
    .filter({ hasText: title })
    .click();
}
async function overview() {
  await page
    .getByRole("button", { name: "All maintainer tools", exact: true })
    .click();
}
async function search(text) {
  await page
    .getByRole("textbox", { name: "Search maintainer entries" })
    .fill(text);
}
async function confirm(button) {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: button, exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
}
try {
  const a = await signup(admin, "Admin"),
    b = await signup(vendor, "Vendor");
  sql("UPDATE users SET role='admin' WHERE id='" + a.id + "'");
  const bytes = readFileSync(
    new URL("./fixtures/test-pixel.webp", import.meta.url),
  );
  let r = await vendor.request.post(
    base +
      "/api/photos/upload?name=" +
      encodeURIComponent(name) +
      "&category=Sweet%20tooth",
    {
      data: bytes,
      headers: { "Content-Type": "image/webp", "X-Photo-Rights": "confirmed" },
    },
  );
  assert.equal(r.status(), 200);
  const photo = (await r.json()).photo;
  r = await vendor.request.post(base + "/api/mine", {
    data: {
      name,
      category: "Sweet tooth",
      mrp: 2000,
      price: 2500,
      photoId: photo.photo_id,
    },
  });
  assert.equal(r.status(), 200);
  const stock = (
    await (await vendor.request.get(base + "/api/mine")).json()
  ).listings.find((i) => i.name === name);
  r = await vendor.request.post(base + "/api/seller/book", {
    data: {
      kind: "purchase",
      productKey: stock.product_key,
      quantity: 5,
      unitPrice: 1000,
      date: new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10),
      notes: "Opening stock",
    },
  });
  assert.equal(r.status(), 200);
  const upload = await vendor.request.post(
    base + "/api/market/upload?kind=pawn",
    {
      data: bytes,
      headers: { "Content-Type": "image/webp", "X-Photo-Rights": "confirmed" },
    },
  );
  const pawnPhoto = (await upload.json()).id;
  r = await vendor.request.post(base + "/api/pawn", {
    data: {
      title: pawnName,
      description: "Study desk in good condition.",
      condition: "Used - good",
      price: 15000,
      photoId: pawnPhoto,
    },
  });
  assert.equal(r.status(), 200);
  await page.goto(base + "/?hostel=patel");
  await page.locator(".account-button").waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Got a stash? Start selling", exact: true })
      .count(),
    1,
  );
  assert.equal(await page.locator(".seller-callout").count(), 0);
  assert(
    await page
      .locator(".hero-bottom")
      .innerText()
      .then((t) =>
        t.includes("Your cupboard could be someone’s midnight rescue."),
      ),
  );
  await page
    .getByRole("button", { name: "Stasher dashboard", exact: true })
    .click();
  assert.equal(new URL(page.url()).pathname, "/dashboard");
  await page.reload();
  await page.locator(".account-button").waitFor();
  assert.equal(new URL(page.url()).pathname, "/dashboard");
  await page.locator(".account-button").click();
  await page
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reset password · Get help", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByText("Your current password is never visible", { exact: false })
    .waitFor();
  assert(
    (
      await page
        .getByRole("link", { name: "Contact Punyam" })
        .getAttribute("href")
    ).includes("919368930104"),
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close dialog" })
    .click();
  await page.getByRole("button", { name: "Maintainer", exact: true }).click();
  assert.equal(new URL(page.url()).pathname, "/maintainer");
  await page.locator(".maintainer-tool-card").first().waitFor();
  assert.equal(
    await page.locator(".hostel-manager,.photo-manager,.admin-users").count(),
    0,
    "Maintainer starts with overview only",
  );
  await page
    .locator(".maintainer-workspace")
    .screenshot({ path: "outputs/stash-maintainer-overview.png" });
  await tool("Stock listings");
  await search(name);
  let row = page.locator(".maintainer-entry").filter({ hasText: name });
  await row.getByRole("button", { name: "Hide listing", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Filter entry status" })
    .selectOption("hidden");
  await row
    .getByRole("button", { name: "Restore listing", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Filter entry status" })
    .selectOption("visible");
  await row
    .getByRole("button", { name: "Hide listing", exact: true })
    .waitFor();
  await overview();
  await tool("Product catalogue");
  await search(name);
  row = page.locator(".maintainer-entry").filter({ hasText: name });
  await row.getByRole("button", { name: "Edit product", exact: true }).click();
  let editor = page.getByRole("dialog");
  assert.equal(
    await editor.getByLabel("Manage product photos").count(),
    0,
    "No duplicate product selector",
  );
  await editor
    .getByLabel("Product name", { exact: true })
    .fill(name + " Renamed");
  let save = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/admin/products") && r.request().method() === "PUT",
  );
  await editor.getByRole("button", { name: "Save product name" }).click();
  assert.equal((await save).status(), 200);
  await editor.locator(".photo-manager").waitFor();
  let renamed = (
    await (await vendor.request.get(base + "/api/mine")).json()
  ).listings.find((i) => i.name === name + " Renamed");
  assert(renamed, "Rename reaches saved stock");
  assert.equal(
    renamed.photo_id,
    photo.photo_id,
    "Rename preserves shared image",
  );
  const ledger = (
    await (await vendor.request.get(base + "/api/seller/book")).json()
  ).entries;
  assert.equal(
    ledger[0].product_key,
    renamed.product_key,
    "Rename preserves ledger linkage",
  );
  assert.equal(ledger[0].quantity, 5);
  assert.notEqual(renamed.product_key, stock.product_key);
  assert.equal(
    (
      await vendor.request.put(base + "/api/admin/products", {
        data: {
          name: name + " Renamed",
          category: "Sweet tooth",
          newName: name,
        },
      })
    ).status(),
    403,
    "Only maintainer can rename",
  );
  await editor.getByLabel("Product name", { exact: true }).fill(name);
  save = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/admin/products") && r.request().method() === "PUT",
  );
  await editor.getByRole("button", { name: "Save product name" }).click();
  assert.equal((await save).status(), 200);
  await editor.getByRole("button", { name: "Close dialog" }).click();
  await row
    .getByRole("button", { name: "Remove product", exact: true })
    .click();
  await confirm("Remove product");
  assert(
    !(
      await (await vendor.request.get(base + "/api/products")).json()
    ).products.some((p) => p.name === name),
  );
  assert(
    !(
      await (
        await vendor.request.get(base + "/api/listings?hostel=patel")
      ).json()
    ).listings.some((p) => p.name === name),
  );
  assert.equal(
    (
      await vendor.request.post(base + "/api/mine", {
        data: { name, category: "Sweet tooth", mrp: 3000, price: 3500 },
      })
    ).status(),
    400,
  );
  await page
    .getByRole("combobox", { name: "Filter entry status" })
    .selectOption("hidden");
  await row
    .getByRole("button", { name: "Restore product", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Filter entry status" })
    .selectOption("visible");
  await row
    .getByRole("button", { name: "Remove product", exact: true })
    .waitFor();
  await overview();
  await tool("Product catalogue");
  await page
    .getByRole("button", { name: "Manage uploaded photos", exact: true })
    .click();
  await search(name);
  row = page.locator(".maintainer-entry").filter({ hasText: name });
  await row.getByRole("button", { name: "Delete photo", exact: true }).click();
  await confirm("Delete photo");
  assert.equal(
    (await vendor.request.get(base + "/api/photos/" + photo.photo_id)).status(),
    404,
  );
  await overview();
  await tool("Stock listings");
  await search(name);
  await page
    .locator(".maintainer-entry")
    .getByRole("button", { name: "Delete listing", exact: true })
    .click();
  await confirm("Delete listing");
  assert(
    !(
      await (await vendor.request.get(base + "/api/mine")).json()
    ).listings.some((i) => i.name === name),
  );
  await page
    .getByRole("button", { name: "The Pawn Shop", exact: true })
    .click();
  await page.locator(".pawn-sidebar-brand").waitFor();
  assert.equal(new URL(page.url()).pathname, "/pawn");
  assert.equal(new URL(page.url()).search, "");
  assert.equal(
    await page.locator(".header-shop-control").count(),
    0,
    "Snack shutter absent inside Pawn Shop",
  );
  await page
    .getByRole("button", { name: "Deploy The Pawn", exact: true })
    .click();
  assert.equal(new URL(page.url()).pathname, "/pawn/deploy");
  await page.locator(".pawn-form").waitFor();
  assert.equal(await page.locator(".seller-payments").count(), 1);
  assert.equal(
    await page.locator("dialog[open]").count(),
    0,
    "Selling is its own page",
  );
  assert.equal(
    await page.getByRole("button", { name: "Payment QR", exact: true }).count(),
    0,
    "No separate payment page in sidebar",
  );
  await page
    .locator(".pawn-sell-page")
    .screenshot({ path: "outputs/pawn-sell-payments-desktop.png" });
  const png = Buffer.from(
    await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 200;
      c.height = 200;
      const x = c.getContext("2d");
      x.fillStyle = "#f9f8ed";
      x.fillRect(0, 0, 200, 200);
      x.fillStyle = "#242424";
      for (let y = 15; y < 180; y += 15)
        for (let z = 15; z < 180; z += 15)
          if ((y + z) % 45) x.fillRect(z, y, 11, 11);
      return c.toDataURL("image/png").split(",")[1];
    }),
    "base64",
  );
  await page.locator(".seller-payments>summary").click();
  await page.getByLabel("This is my payment QR. Show it to buyers.").check();
  await page
    .getByLabel("Upload your payment QR")
    .setInputFiles({ name: "qr.png", mimeType: "image/png", buffer: png });
  await page.getByAltText("Your UPI QR").waitFor();
  const code = (
    await (await admin.request.get(base + "/api/payment-qr")).json()
  ).qr;
  const codeMedia = await admin.request.get(
    base + "/api/market/media/" + code.id,
  );
  assert.equal(codeMedia.headers()["content-type"], "image/webp");
  assert((await codeMedia.body()).length <= 200000);
  await page.locator(".pawn-form details>summary").click();
  await page
    .getByRole("checkbox", {
      name: "This is my photo and the item follows the marketplace rules.",
    })
    .check();
  await page
    .getByLabel("Choose an item photo")
    .setInputFiles({ name: "item.png", mimeType: "image/png", buffer: png });
  await page.getByAltText("Your item photo").waitFor();
  await page.locator("[name=title]").fill("QA Notebook " + run);
  await page.locator("[name=price]").fill("90");
  await page
    .locator("textarea[name=description]")
    .fill("A clean unused notebook.");
  await page
    .getByRole("checkbox", { name: /My listing follows the rules/ })
    .check();
  await page
    .getByRole("button", { name: "Put it on the shelf", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "QA Notebook " + run, exact: true })
    .waitFor();
  assert.equal(new URL(page.url()).pathname, "/pawn/deploy");
  const ownItem = (
    await (await admin.request.get(base + "/api/pawn/mine")).json()
  ).listings.find((i) => i.title === "QA Notebook " + run);
  const itemMedia = await admin.request.get(
    base + "/api/market/media/" + ownItem.photo_id,
  );
  assert.equal(itemMedia.headers()["content-type"], "image/webp");
  assert((await itemMedia.body()).length <= 200000);
  await page
    .locator(".pawn-card")
    .filter({ hasText: "QA Notebook " + run })
    .locator(".pawn-open")
    .click();
  let buyer = page.getByRole("dialog");
  await buyer.locator(".payment-expander>summary").click();
  await buyer.getByAltText("Stasher's UPI payment QR").waitFor();
  await buyer.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await page.locator(".pawn-sidebar-brand").waitFor();
  assert.equal(new URL(page.url()).pathname, "/pawn/deploy");
  await page.getByRole("button", { name: "Maintainer", exact: true }).click();
  assert.equal(new URL(page.url()).pathname, "/pawn/maintainer");
  await page.locator(".maintainer-tool-card").first().waitFor();
  assert.equal(await page.locator(".maintainer-tool-card").count(), 2);
  assert.equal(await page.locator(".hostel-manager").count(), 0);
  const scoped = await (
    await admin.request.get(base + "/api/pawn/admin/review")
  ).json();
  assert.equal(scoped.snacks.length, 0);
  assert.equal(scoped.products.length, 0);
  assert.equal(
    (
      await admin.request.delete(base + "/api/pawn/admin/review", {
        data: { kind: "product", id: "none" },
      })
    ).status(),
    400,
  );
  await page
    .locator(".maintainer-workspace")
    .screenshot({ path: "outputs/pawn-maintainer-overview.png" });
  await tool("Shop listings");
  await search(pawnName);
  row = page.locator(".maintainer-entry");
  await row.getByRole("button", { name: "Hide listing", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Filter entry status" })
    .selectOption("hidden");
  await row
    .getByRole("button", { name: "Restore listing", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Filter entry status" })
    .selectOption("visible");
  await row
    .getByRole("button", { name: "Delete listing", exact: true })
    .click();
  await confirm("Delete listing");
  assert(
    !(
      await (await vendor.request.get(base + "/api/pawn/mine")).json()
    ).listings.some((i) => i.title === pawnName),
  );
  assert.equal(
    (
      await vendor.request.get(base + "/api/market/media/" + pawnPhoto)
    ).status(),
    404,
  );
  await page
    .getByRole("button", { name: "Deploy The Pawn", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await page
    .locator(".pawn-sell-page")
    .screenshot({ path: "outputs/pawn-sell-payments-mobile.png" });
  await page.reload();
  await page.locator(".pawn-form").waitFor();
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await page.locator(".pawn-back-link").click();
  assert.equal(new URL(page.url()).pathname, "/");
  assert.equal(await page.locator(".pawn-sidebar-brand").count(), 0);
  await page.goto(base + "/?app=pawn&section=payments&hostel=patel");
  await page.locator(".pawn-form").waitFor();
  assert.equal(new URL(page.url()).pathname, "/pawn/deploy");
  assert.equal(new URL(page.url()).search, "");
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    "PASS separate Pawn routes/reload/legacy migration, unified sell/payments, no snack shutter, one selling CTA, task-based/scoped maintainer pages, consistent hide/restore/delete, catalogue suppression and image cleanup",
  );
} catch (e) {
  await page.screenshot({
    path: "outputs/experiences-failure.png",
    fullPage: true,
  });
  throw e;
} finally {
  for (const ctx of [admin, vendor]) {
    try {
      const own =
        (await (await ctx.request.get(base + "/api/pawn/mine")).json())
          .listings || [];
      for (const item of own)
        await ctx.request.delete(base + "/api/pawn/mine/" + item.id);
      await ctx.request.delete(base + "/api/payment-qr");
    } catch {}
  }
  await browser.close();
  if (ids.length) {
    const q = ids.map((i) => "'" + i + "'").join(",");
    sql(
      "DELETE FROM product_photo_defaults WHERE name IN ('" +
        name +
        "','" +
        name +
        " Renamed');DELETE FROM product_catalog WHERE name IN ('" +
        name +
        "','" +
        name +
        " Renamed');DELETE FROM audit WHERE actor IN (" +
        q +
        ");DELETE FROM users WHERE id IN (" +
        q +
        ");DELETE FROM rate_limits;",
    );
  }
}
