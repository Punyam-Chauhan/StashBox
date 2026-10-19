import { chromium, browserExecutable } from "./helpers/browser.mjs";

import assert from "node:assert/strict";
const browser = await chromium.launch({
    headless: true,
    executablePath: browserExecutable,
  }),
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/hostels"));
  await page.goto("http://127.0.0.1:5173/?choose=hostel");
  await ready;
  const summary = page.getByLabel("Quick navigation", { exact: true }),
    menu = page.locator(".header-quick-nav");
  await summary.click();
  assert.equal(await menu.getAttribute("open"), "");
  const closing = await menu.evaluate((e) => {
    e.querySelector("summary").click();
    return { open: e.open, closing: e.dataset.closing };
  });
  assert.deepEqual(
    closing,
    { open: true, closing: "true" },
    "Surface remains mounted for its brief exit",
  );
  await page.waitForFunction(
    () => !document.querySelector(".header-quick-nav").open,
  );
  await summary.click();
  const reopened = await menu.evaluate((e) => {
    e.querySelector("summary").click();
    e.querySelector("summary").click();
    return { open: e.open, closing: e.dataset.closing || null };
  });
  assert.deepEqual(
    reopened,
    { open: true, closing: null },
    "Rapid reopening cancels delayed closing",
  );
  await page.evaluate(() =>
    document.body.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true }),
    ),
  );
  await page.waitForFunction(
    () => !document.querySelector(".header-quick-nav").open,
  );
  await summary.click();
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () => !document.querySelector(".header-quick-nav").open,
  );
  assert(await summary.evaluate((e) => document.activeElement === e));
  const sample = async (selector) =>
    page.evaluate(async (selector) => {
      document.querySelector(selector).click();
      const points = [];
      for (let i = 0; i < 9; i++) {
        await new Promise(requestAnimationFrame);
        const drawer = document.querySelector(".sidebar"),
          box = drawer.getBoundingClientRect();
        points.push({
          x: box.x,
          width: box.width,
          display: getComputedStyle(drawer).display,
          visibility: getComputedStyle(drawer).visibility,
        });
      }
      return points;
    }, selector);
  const opening = await sample(".mobile-menu");
  assert(
    opening.every((p) => p.display === "flex" && p.width > 0),
    "Drawer stays rendered",
  );
  assert(
    opening.some((p) => p.x < -2) && opening.at(-1).x > opening[0].x + 5,
    "Opening actually moves through intermediate frames",
  );
  assert(
    (
      await page
        .locator(".sidebar")
        .evaluate((e) => getComputedStyle(e).transitionDuration)
    ).startsWith("0.24s"),
  );
  assert.equal(
    await page
      .locator(".drawer-backdrop")
      .evaluate((e) => getComputedStyle(e).backdropFilter),
    "none",
  );
  const closingDrawer = await sample(".mobile-drawer-close");
  assert(
    closingDrawer.every((p) => p.display === "flex" && p.width > 0),
    "Closing does not switch to display:none",
  );
  assert(
    closingDrawer.some((p) => p.x < -2) &&
      closingDrawer.at(-1).x < closingDrawer[0].x - 5,
    "Closing actually slides",
  );
  await page.locator(".drawer-backdrop").waitFor({ state: "hidden" });
  await page.locator(".sidebar").waitFor({ state: "hidden" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await summary.click();
  const reduced = await menu.evaluate((e) => {
    e.querySelector("summary").click();
    return { open: e.open, closing: e.dataset.closing || null };
  });
  assert.deepEqual(
    reduced,
    { open: false, closing: null },
    "Reduced-motion closing is immediate",
  );
  assert.equal(
    await page
      .locator(".sidebar")
      .evaluate((e) => getComputedStyle(e).transitionDuration),
    "0s",
  );
  console.log(
    "PASS menu entry/exit, interrupted reopening, outside/Escape close and focus, composited drawer/no mobile blur, immediate reduced-motion behavior",
  );
} finally {
  await browser.close();
}
