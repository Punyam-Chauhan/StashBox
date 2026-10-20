import assert from "node:assert/strict";
import { Miniflare } from "miniflare";
import { readFileSync } from "node:fs";
import { importTypeScript } from "./helpers/import-typescript.mjs";
const { siteControls, readSiteSettings, siteActivity } = await importTypeScript(
  "src/server/site-controls.ts",
);
const {
  parseAliases,
  parseWordlist,
  customBlockedReason,
  matchesSearch,
  publicSettings,
  MAX_MAINTENANCE_MS,
} = await importTypeScript("src/domain/site-settings.ts");
const { withContentPolicy, checkContent } = await importTypeScript(
  "src/server/content-policy.ts",
);
assert.deepEqual(parseWordlist("Foobar\nfoobar,another term"), [
  "foobar",
  "another term",
]);
assert.throws(() => parseWordlist("--"));
assert.throws(() => parseWordlist("a"));
assert.throws(() => parseWordlist("a".repeat(61)));
const aliases = parseAliases(
  "noodles = Maggi Masala Noodles\nbiscuit,Oreo Original",
);
assert(matchesSearch("Maggi Masala Noodles", "noodles", aliases));
assert(!matchesSearch("Oreo Original", "noodles", aliases));
assert(
  matchesSearch(
    "Lay’s Classic Salted",
    "crisps",
    parseAliases("crisps = Lay's Classic Salted"),
  ),
);
assert(
  matchesSearch(
    "Lay's Classic Salted",
    "crisps",
    parseAliases("crisps = Lay’s Classic Salted"),
  ),
);
assert.throws(() => parseAliases("missing separator"));
assert(customBlockedReason("f0o b@r", ["foo bar"]));
assert.equal(customBlockedReason("ordinary snack", ["example"]), null);
await Promise.all([
  withContentPolicy(["example"], async () => {
    await new Promise((r) => setTimeout(r, 15));
    assert.throws(() => checkContent("example"), /not allowed/);
  }),
  withContentPolicy([], async () => {
    await new Promise((r) => setTimeout(r, 5));
    checkContent("example");
  }),
]);
const mf = new Miniflare({
  modules: true,
  script: 'export default {fetch(){return new Response("test")}}',
  d1Databases: ["DB"],
  compatibilityDate: "2026-05-15",
});
try {
  const db = await mf.getD1Database("DB");
  for (const sql of readFileSync("drizzle/0011_polite_starbolt.sql", "utf8")
    .split(";")
    .filter((s) => s.trim()))
    await db.prepare(sql).run();
  await db
    .prepare(
      "CREATE TABLE audit(id TEXT,actor TEXT,target TEXT,action TEXT,created_at INTEGER)",
    )
    .run();
  await db.prepare("CREATE TABLE users(id TEXT,name TEXT)").run();
  const admin = { id: "admin", role: "admin" },
    req = new Request("http://localhost/api/admin/site", { method: "PUT" });
  const put = async (b, user = admin) => {
    const r = await siteControls(req, db, user, async () => b);
    return { status: r.status, data: await r.json() };
  };
  assert.equal((await put({}, null)).status, 401);
  assert.equal((await put({}, { role: "seller" })).status, 403);
  assert.equal(
    (await put({}, { ...admin, must_change_password: 1 })).status,
    403,
  );
  let r = await put({
    revision: 0,
    section: "wordlists",
    blockedText: "example",
    aliasText: "noodles=Maggi Masala Noodles",
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.revision, 1);
  assert(!("blockedWords" in publicSettings(r.data.settings)));
  assert.equal(
    (await put({ revision: 0, section: "announcement", announcement: "stale" }))
      .status,
    409,
  );
  assert.equal(
    (
      await put({
        revision: 1,
        section: "wordlists",
        blockedText: "--",
        aliasText: "",
      })
    ).status,
    400,
  );
  r = await put({
    revision: 1,
    section: "maintenance",
    action: "start",
    message: "Back soon",
  });
  assert.equal(r.status, 200);
  assert(
    Math.abs(
      r.data.settings.maintenanceUntil - Date.now() - MAX_MAINTENANCE_MS,
    ) < 1000,
  );
  assert.equal(
    (
      await put({
        revision: 2,
        section: "maintenance",
        action: "start",
        message: "extend",
      })
    ).status,
    400,
  );
  r = await put({
    revision: 2,
    section: "maintenance",
    action: "stop",
    message: "Back soon",
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.settings.maintenanceUntil, 0);
  r = await put({
    revision: 3,
    section: "availability",
    pawnEnabled: false,
    signupEnabled: false,
    uploadsEnabled: false,
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.settings.pawnEnabled, false);
  r = await put({
    revision: 4,
    section: "announcement",
    announcement: "Campus news",
  });
  assert.equal(r.status, 200);
  assert.equal(
    (await readSiteSettings(db)).settings.announcement,
    "Campus news",
  );
  const log = await (await siteActivity(db, admin)).json();
  assert.equal(log.entries.length, 5);
  const concurrent = await Promise.all([
    put({ revision: 5, section: "announcement", announcement: "A" }),
    put({ revision: 5, section: "announcement", announcement: "B" }),
  ]);
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 409]);
  console.log(
    "PASS wordlist validation/search aliases, request-local isolation, private blocked list, permissions, revision conflicts, audited settings and fixed two-hour maintenance window",
  );
} finally {
  await mf.dispose();
}
