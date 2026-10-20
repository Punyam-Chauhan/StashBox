import { importTypeScript } from "./helpers/import-typescript.mjs";
import assert from "node:assert/strict";
import { createTestRuntime } from "./helpers/runtime.mjs";
const { manageHostels } = await importTypeScript(
  "src/server/hostel-management.ts",
);
const mf = createTestRuntime();
try {
  const db = await mf.getD1Database("DB");
  for (const sql of [
    "CREATE TABLE campus_hostels (id TEXT PRIMARY KEY,name TEXT,short TEXT,initials TEXT,created_at INTEGER)",
    "CREATE UNIQUE INDEX names ON campus_hostels(lower(name))",
    "CREATE TABLE users (id TEXT PRIMARY KEY,hostel TEXT,phase TEXT)",
    "CREATE TABLE audit (id TEXT PRIMARY KEY,actor TEXT,target TEXT,action TEXT,created_at INTEGER)",
    "INSERT INTO campus_hostels VALUES ('tagore','Tagore Bhawan','Tagore','TB',1),('patel','Patel Bhawan','Patel','PB',2),('mandakini','Mandakini Bhawan','Mandakini','MB',3)",
    "INSERT INTO users VALUES ('student','mandakini','3')",
  ])
    await db.prepare(sql).run();
  async function call(id, method, body = {}) {
    return manageHostels(
      new Request("http://localhost/api/admin/hostels/" + id, { method }),
      "admin/hostels/" + id,
      db,
      { id: "admin" },
      async () => body,
    );
  }
  assert.equal(
    (await call("tagore", "PUT", { name: "Tagore New Bhawan" })).status,
    200,
  );
  assert.equal(
    (
      await db
        .prepare("SELECT name FROM campus_hostels WHERE id='tagore'")
        .first()
    ).name,
    "Tagore New Bhawan",
  );
  assert.equal(
    (await call("tagore", "PUT", { name: "pAtEl Bhawan" })).status,
    409,
  );
  await assert.rejects(
    call("tagore", "PUT", { name: "Bhawan 😀" }),
    /English letters/,
  );
  assert.equal(
    (await call("mandakini", "PUT", { name: "Mandakini Updated Bhawan" }))
      .status,
    200,
  );
  assert.equal(
    (
      await db
        .prepare("SELECT hostel,phase FROM users WHERE id='student'")
        .first()
    ).phase,
    "3",
  );
  assert.equal((await call("mandakini", "DELETE")).status, 409);
  assert.equal((await call("tagore", "DELETE")).status, 200);
  assert.equal(
    await db.prepare("SELECT id FROM campus_hostels WHERE id='tagore'").first(),
    null,
  );
  assert.equal((await call("patel", "DELETE")).status, 200);
  assert.equal((await call("mandakini", "DELETE")).status, 409);
  assert.equal(
    (await db.prepare("SELECT COUNT(*) AS n FROM campus_hostels").first()).n,
    1,
  );
  assert.equal(
    (
      await db
        .prepare(
          "SELECT COUNT(*) AS n FROM audit WHERE action='hostel_deleted'",
        )
        .first()
    ).n,
    2,
  );
  console.log(
    "PASS original bhawans can be renamed/deleted; stable IDs/phases, case-insensitive names, ASCII validation, resident/last-hostel protections and audited actions",
  );
} finally {
  await mf.dispose();
}
