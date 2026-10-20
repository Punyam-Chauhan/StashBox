import { chromium, browserExecutable } from "./helpers/browser.mjs";

import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const browser = await chromium.launch({
  headless: true,
  executablePath: browserExecutable,
});
const context = await browser.newContext({
    viewport: { width: 1532, height: 1000 },
  }),
  page = await context.newPage(),
  base = "http://127.0.0.1:5173",
  run = "hostelqa" + Date.now(),
  name = "QA New " + run + " Bhawan",
  slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  ids = [];
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
async function signup(suffix, hostel = "patel") {
  const r = await context.request.post(base + "/api/signup", {
    data: {
      name: "Hostel Tester",
      email: run + suffix + "@example.test",
      studentId: run + suffix,
      phone: "9000000000",
      password: "Test-password-482!",
      hostel,
      wing: "West",
      room: "A-22",
    },
  });
  assert.equal(r.status(), 200);
  const d = await r.json();
  ids.push(d.user.id);
  return d.user;
}
try {
  assert.equal(
    (
      await context.request.post(base + "/api/admin/hostels", {
        data: { name },
      })
    ).status(),
    401,
  );
  const admin = await signup("admin");
  assert.equal(
    (
      await context.request.post(base + "/api/admin/hostels", {
        data: { name },
      })
    ).status(),
    403,
  );
  sql("UPDATE users SET role='admin' WHERE id='" + admin.id + "'");
  await page.goto(base + "/");
  await page.getByRole("button", { name: "Maintainer", exact: true }).click();
  await page
    .locator(".maintainer-tool-card")
    .filter({ hasText: "Bhawans" })
    .click();
  const panel = page.locator(".hostel-manager");
  await panel.getByLabel("Bhawan name").fill(name);
  await panel.getByRole("button", { name: "Add bhawan" }).click();
  await panel
    .getByText("Hostel added. It is ready to choose across StashBox.")
    .waitFor();
  assert.equal(
    (
      await context.request.post(base + "/api/admin/hostels", {
        data: { name },
      })
    ).status(),
    409,
  );
  await page
    .getByRole("button", { name: "Choose hostel", exact: true })
    .click();
  const card = page.locator(".hostel-card").filter({ hasText: run });
  await card.waitFor();
  await card.click();
  await page.getByRole("heading", { name, exact: true }).waitFor();
  await page.reload();
  await page.getByRole("heading", { name, exact: true }).waitFor();
  assert.equal(new URL(page.url()).searchParams.get("hostel"), slug);
  const resident = await signup("resident", slug);
  await context.request.post(base + "/api/mine", {
    data: { name: "Oreo Original", mrp: 2000, price: 2500 },
  });
  const own = (
    await (
      await context.request.get(base + "/api/listings?hostel=" + slug)
    ).json()
  ).listings;
  assert(own.some((l) => l.seller_id === resident.id));
  const other = (
    await (
      await context.request.get(base + "/api/listings?hostel=patel")
    ).json()
  ).listings;
  assert(!other.some((l) => l.seller_id === resident.id));
  await context.request.post(base + "/api/logout", { data: {} });
  await page.goto(base + "/");
  await page.getByRole("heading", { name, exact: true }).waitFor();
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("dialog")
      .getByRole("option", { name, exact: true })
      .count(),
    1,
  );
  console.log(
    "PASS maintainer-managed hostels: auth, add through UI, duplicate protection, dynamic chooser, URL reload, signup options, resident signup and isolated snack feed",
  );
} finally {
  await browser.close();
  const quoted = ids.map((id) => "'" + id + "'").join(",");
  sql(
    (ids.length
      ? "DELETE FROM audit WHERE actor IN (" +
        quoted +
        ");DELETE FROM users WHERE id IN (" +
        quoted +
        ");"
      : "") +
      "DELETE FROM campus_hostels WHERE id='" +
      slug +
      "';DELETE FROM rate_limits;",
  );
}
