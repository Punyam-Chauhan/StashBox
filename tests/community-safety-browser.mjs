import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chromium, browserExecutable } from "./helpers/browser.mjs";
import { testStudentId } from "./helpers/identity.mjs";
const base = "http://127.0.0.1:5173",
  run = "safe" + Date.now(),
  ids = [];
const browser = await chromium.launch({
  headless: true,
  executablePath: browserExecutable,
});
const root = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
const student = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
const page = await root.newPage(),
  visitor = await student.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
visitor.on("pageerror", (e) => errors.push(e.message));
function sql(command) {
  const r = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/sites-env.mjs",
      "node_modules/wrangler/bin/wrangler.js",
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
async function call(context, path, method = "GET", data) {
  const response = await context.request.fetch(base + "/api/" + path, {
    method,
    data,
  });
  return { status: response.status(), data: await response.json() };
}
async function signup(context, suffix) {
  const data = {
    name: "Safety " + suffix,
    email: run + suffix + "@example.test",
    username: run + suffix,
    studentId: testStudentId(run + suffix),
    phone: "9000000000",
    password: "Test-password-482!",
    hostel: "patel",
    wing: "9",
    room: "224",
  };
  const result = await call(context, "signup", "POST", data);
  assert.equal(result.status, 200, JSON.stringify(result.data));
  ids.push(result.data.user.id);
  return result.data.user;
}
try {
  const owner = await signup(root, "owner"),
    target = await signup(student, "seller");
  sql(`UPDATE users SET role='admin' WHERE id='${owner.id}'`);
  const invalid = await call(root, "signup", "POST", {
    name: "Invalid student",
    email: run + "bad@example.test",
    username: run + "bad",
    studentId: "123456",
    phone: "9000000000",
    password: "Test-password-482!",
    hostel: "patel",
    wing: "9",
    room: "224",
  });
  assert.equal(invalid.status, 400);
  await page.goto(base + "/maintainer");
  await page.getByRole("button", { name: /Student accounts/ }).click();
  await page
    .getByRole("textbox", { name: "Find student account" })
    .fill(target.username);
  await page.getByRole("button", { name: "Find student", exact: true }).click();
  await page.getByText("@" + target.username, { exact: true }).waitFor();
  await page
    .locator("article")
    .filter({ hasText: "@" + target.username })
    .getByRole("button", { name: "Role & permissions", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByText("Role & permissions", { exact: true })
    .waitFor();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();
  await visitor.goto(base + "/?hostel=patel");
  await visitor
    .getByRole("button", { name: /Help.*support/i })
    .last()
    .click();
  await visitor
    .getByRole("button", { name: /Report a Stasher by username/i })
    .click();
  const dialog = visitor.getByRole("dialog").last();
  await dialog
    .getByRole("textbox", { name: "Stasher username" })
    .fill("@" + owner.username);
  await dialog
    .getByRole("combobox", { name: "Why are you reporting this?" })
    .selectOption("Other");
  await dialog
    .getByRole("textbox", { name: "What happened?" })
    .fill("Please investigate this account and its listing details.");
  await dialog
    .getByRole("button", { name: "Send report", exact: true })
    .click();
  await visitor
    .getByRole("heading", { name: "Report received", exact: true })
    .waitFor();
  await page.reload();
  await page.getByRole("button", { name: /Maintainer notifications/ }).click();
  const notifications = page.getByRole("dialog");
  await notifications.getByRole("button", { name: /New report:/ }).click();
  await page
    .getByRole("heading", { name: "Review report", exact: true })
    .waitFor();
  await page
    .getByText("Please investigate this account and its listing details.", {
      exact: true,
    })
    .waitFor();
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await page.screenshot({
    path: "outputs/community-report-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  assert.equal(
    (
      await call(student, "admin/account-block", "PUT", {
        userId: owner.id,
        blocked: true,
        reason: "Ordinary users cannot block sellers.",
      })
    ).status,
    403,
  );
  console.log(
    "PASS mobile account tools, report reason/explanation dialog, staff notification opens report, no client errors or horizontal overflow, ordinary users cannot suspend",
  );
} finally {
  if (ids.length) {
    const quoted = ids.map((id) => `'${id}'`).join(",");
    sql(
      `DELETE FROM reports WHERE reporter_id IN (${quoted}) OR target_id IN (${quoted}); DELETE FROM staff_notifications WHERE subject_id IN (${quoted}); DELETE FROM audit WHERE actor IN (${quoted}) OR target IN (${quoted}); DELETE FROM users WHERE id IN (${quoted}); DELETE FROM rate_limits`,
    );
  }
  await browser.close();
}
