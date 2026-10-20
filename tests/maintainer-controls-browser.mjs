import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chromium, browserExecutable } from "./helpers/browser.mjs";
const base = "http://127.0.0.1:5173",
  run = "controls" + Date.now(),
  ids = [];
const browser = await chromium.launch({
  headless: true,
  executablePath: browserExecutable,
});
const admin = await browser.newContext(),
  guest = await browser.newContext({ viewport: { width: 390, height: 844 } }),
  page = await admin.newPage(),
  visitor = await guest.newPage();
let original, actorId;
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
visitor.on("pageerror", (e) => errors.push(e.message));
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
  if (r.status) throw Error("Local fixture command failed");
}
async function data(context, path, method = "GET", body) {
  const r = await context.request.fetch(base + "/api/" + path, {
    method,
    data: body,
  });
  return { status: r.status(), data: await r.json(), headers: r.headers() };
}
async function save(section, extra) {
  const d = await data(admin, "admin/site");
  const r = await data(admin, "admin/site", "PUT", {
    revision: d.data.revision,
    section,
    ...extra,
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return r.data.settings;
}
try {
  const r = await data(admin, "signup", "POST", {
    name: "Controls Maintainer",
    email: run + "@example.test",
    studentId: run,
    phone: "9000000000",
    password: "Test-password-482!",
    hostel: "patel",
    wing: "9",
    room: "224",
  });
  assert.equal(r.status, 200);
  actorId = r.data.user.id;
  ids.push(actorId);
  sql(`UPDATE users SET role='admin' WHERE id='${actorId}'`);
  original = (await data(admin, "admin/site")).data.settings;
  assert.equal((await data(guest, "admin/site")).status, 401);
  assert.equal((await data(guest, "admin/activity")).status, 401);
  await page.goto(base + "/maintainer");
  await page
    .getByRole("heading", { name: "Keep the stash in order." })
    .waitFor();
  await page.getByRole("button", { name: /Wordlists & search/ }).click();
  await page
    .locator("input[type=file]")
    .nth(0)
    .setInputFiles({
      name: "blocked.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("restrictedwidget"),
    });
  await page.waitForFunction(
    () => document.querySelectorAll("textarea")[0].value === "restrictedwidget",
  );
  await page
    .locator("input[type=file]")
    .nth(1)
    .setInputFiles({
      name: "aliases.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("latenightcraving,Lay"),
    });
  await page.waitForFunction(
    () =>
      document.querySelectorAll("textarea")[1].value === "latenightcraving,Lay",
  );
  await page
    .getByRole("button", { name: "Save wordlists", exact: true })
    .click();
  await page.getByRole("status").filter({ hasText: "Saved." }).waitFor();
  const publicConfig = (await data(guest, "site")).data.settings;
  assert(!("blockedWords" in publicConfig));
  assert.equal(publicConfig.searchAliases[0].keyword, "latenightcraving");
  const denied = await data(admin, "mine", "POST", {
    name: "restrictedwidget",
    category: "Chips & namkeen",
    price: 2000,
    mrp: 2000,
  });
  assert.equal(denied.status, 400);
  assert.match(denied.data.error, /not allowed/);
  await data(admin, "mine", "POST", {
    name: "Lay’s Classic Salted",
    category: "Chips & namkeen",
    price: 2000,
    mrp: 2000,
  });
  await visitor.goto(base + "/?hostel=patel");
  await visitor.getByPlaceholder(/What are you craving/).waitFor();
  await visitor
    .getByPlaceholder(/What are you craving/)
    .fill("latenightcraving");
  await visitor.getByRole("heading", { name: /Lay/ }).first().waitFor();
  await page
    .getByRole("button", { name: "All maintainer tools", exact: true })
    .click();
  await page.getByRole("button", { name: /Site controls/ }).click();
  await page
    .getByLabel("Announcement", { exact: true })
    .fill("QA campus notice");
  await page
    .getByRole("button", { name: "Save announcement", exact: true })
    .click();
  await page.getByRole("status").filter({ hasText: "Saved." }).waitFor();
  await visitor.reload();
  await visitor
    .getByRole("status")
    .filter({ hasText: "QA campus notice" })
    .waitFor();
  await page.getByRole("checkbox", { name: /The Pawn Shop/ }).uncheck();
  await page
    .getByRole("button", { name: "Save availability", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Turn off Pawn Shop", exact: true })
    .click();
  await page.getByRole("status").filter({ hasText: "Saved." }).waitFor();
  assert.equal((await data(guest, "pawn")).status, 404);
  await visitor.reload();
  await visitor.getByPlaceholder(/What are you craving/).waitFor();
  assert.equal(
    await visitor.getByText("The Pawn Shop", { exact: true }).count(),
    0,
  );
  await visitor.goto(base + "/pawn");
  await visitor
    .getByRole("heading", { name: "Where are you staying?" })
    .waitFor();
  assert(!visitor.url().includes("/pawn"));
  assert.equal(
    await visitor.getByText("The Pawn Shop", { exact: true }).count(),
    0,
  );
  await page
    .getByLabel("Message visitors will see")
    .fill("QA scheduled improvements");
  await page
    .getByRole("button", {
      name: "Start a 2-hour maintenance window",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Start 2-hour maintenance", exact: true })
    .click();
  await page
    .getByRole("button", { name: "End maintenance now", exact: true })
    .waitFor();
  let state = (await data(admin, "admin/site")).data.settings;
  assert(
    state.maintenanceUntil > Date.now() + 7100000 &&
      state.maintenanceUntil <= Date.now() + 7200000,
  );
  const unavailable = await data(guest, "listings?hostel=patel");
  assert.equal(unavailable.status, 503);
  assert(unavailable.headers["retry-after"]);
  assert.equal((await data(admin, "admin/site")).status, 200);
  await visitor.reload();
  await visitor
    .getByRole("heading", { name: "We’ll be back shortly." })
    .waitFor();
  await visitor.getByRole("button", { name: /Log in/ }).click();
  await visitor
    .getByRole("button", { name: "Reset password", exact: true })
    .click();
  await visitor.getByText(/current password is never visible/).waitFor();
  // Logging out during maintenance cannot strand the Maintainer.
  assert.equal((await data(admin, "logout", "POST", {})).status, 200);
  assert.equal((await data(admin, "listings?hostel=patel")).status, 503);
  assert.equal(
    (
      await data(admin, "login", "POST", {
        identifier: run,
        password: "Test-password-482!",
      })
    ).status,
    200,
  );
  assert.equal((await data(admin, "admin/site")).status, 200);
  // Expiry is checked on the server; no timer process or signed-in tab is needed.
  state = { ...state, maintenanceUntil: Date.now() - 1, pawnEnabled: true };
  sql(
    `UPDATE site_settings SET value='${JSON.stringify(state).replaceAll("'", "''")}',revision=revision+1 WHERE id=1`,
  );
  assert.equal((await data(guest, "listings?hostel=patel")).status, 200);
  assert.equal((await data(guest, "pawn")).status, 200);
  await save("availability", {
    pawnEnabled: true,
    signupEnabled: false,
    uploadsEnabled: false,
  });
  assert.equal((await data(guest, "signup", "POST", {})).status, 403);
  assert.equal(
    (await data(admin, "market/upload?kind=qr", "POST", {})).status,
    403,
  );
  await page.reload();
  await page.getByRole("button", { name: /Recent actions/ }).click();
  await page.getByText("maintenance started", { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "outputs/maintainer-activity-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "All maintainer tools", exact: true })
    .click();
  await page.getByRole("button", { name: /Site controls/ }).click();
  await page.getByRole("heading", { name: "Temporary maintenance" }).waitFor();
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await page.screenshot({
    path: "outputs/maintainer-controls-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS Maintainer labels/routes, uploadable wordlists/search aliases, restricted permissions, public-list privacy, announcement, hidden Pawn/direct access, two-hour maintenance/login recovery/expiry, upload/signup switches, audit log and mobile layout",
  );
} finally {
  if (original)
    sql(
      `UPDATE site_settings SET value='${JSON.stringify(original).replaceAll("'", "''")}',revision=revision+1 WHERE id=1`,
    );
  if (ids.length) {
    const list = ids.map((id) => `'${id}'`).join(",");
    sql(
      `DELETE FROM audit WHERE actor IN (${list}); DELETE FROM users WHERE id IN (${list})`,
    );
  }
  await browser.close();
}
