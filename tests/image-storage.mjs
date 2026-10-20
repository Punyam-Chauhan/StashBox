import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createTestRuntime } from "./helpers/runtime.mjs";
const source = ts.transpileModule(
  readFileSync("src/server/image-storage.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext } },
).outputText;
const { reservePhoto, releasePhoto } = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
const mf = createTestRuntime();
try {
  const db = await mf.getD1Database("DB");
  await db
    .prepare(
      "CREATE TABLE image_storage (id TEXT PRIMARY KEY,object_key TEXT,byte_size INTEGER,created_at INTEGER)",
    )
    .run();
  const results = await Promise.allSettled(
    [1, 2, 3, 4].map((i) => reservePhoto(db, String(i), "image/" + i, 60, 100)),
  );
  assert.equal(
    results.filter((r) => r.status === "fulfilled").length,
    1,
    "Atomic reservations cannot oversubscribe shared storage",
  );
  const row = await db.prepare("SELECT id FROM image_storage").first();
  await releasePhoto(db, row.id);
  await reservePhoto(db, "new", "image/new", 100, 100);
  await assert.rejects(
    reservePhoto(db, "oversized", "image/oversized", 200001),
  );
  console.log(
    "PASS atomic storage quota, released reservations and 200 KB hard cap",
  );
} finally {
  await mf.dispose();
}
