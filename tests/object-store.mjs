import assert from "node:assert/strict";
import { importTypeScript } from "./helpers/import-typescript.mjs";
const { supabaseStorage, imageBucket } = await importTypeScript(
  "src/server/object-store.ts",
);
const key = "packets/00000000-0000-4000-8000-000000000001",
  calls = [];
const fake = async (url, options) => {
  calls.push({ url, options });
  return new Response(options.method ? "{}" : new Uint8Array([1, 2, 3]), {
    headers: { etag: '"test"' },
  });
};
const store = supabaseStorage(
  "https://example.supabase.co",
  "stashbox-media",
  "sb_secret_test-only",
  fake,
);
const bytes = new TextEncoder().encode("RIFF0000WEBP");
await store.put(key, bytes, { httpMetadata: { contentType: "image/webp" } });
assert.equal(calls[0].options.method, "POST");
assert.equal(calls[0].options.headers.apikey, "sb_secret_test-only");
assert(!("Authorization" in calls[0].options.headers));
assert.equal(calls[0].options.redirect, "manual");
assert.equal(calls[0].options.headers["x-upsert"], "false");
const image = await store.get(key);
assert.equal(image.httpEtag, '"test"');
assert.deepEqual(
  [...new Uint8Array(await new Response(image.body).arrayBuffer())],
  [1, 2, 3],
);
assert(calls[1].url.includes("/object/authenticated/stashbox-media/packets/"));
assert(!calls[1].url.includes("/public/"));
await store.delete(key);
assert.deepEqual(JSON.parse(calls[2].options.body), { prefixes: [key] });
assert.equal(calls[2].options.method, "DELETE");
assert.equal(
  await supabaseStorage(
    "https://example.supabase.co",
    "stashbox-media",
    "sb_secret_test-only",
    async () => new Response("", { status: 404 }),
  ).get(key),
  null,
);
assert.equal(
  await supabaseStorage(
    "https://example.supabase.co",
    "stashbox-media",
    "sb_secret_test-only",
    async () => Response.json({ statusCode: "404" }, { status: 400 }),
  ).get(key),
  null,
);
for (const status of [302, 307, 401, 403, 429, 500])
  await assert.rejects(
    () =>
      supabaseStorage(
        "https://example.supabase.co",
        "stashbox-media",
        "sb_secret_test-only",
        async () => new Response("provider body must not leak", { status }),
      ).get(key),
    (e) => e.status === 503 && !e.message.includes("provider body"),
  );
await assert.rejects(() => store.get("../escape"));
await assert.rejects(() =>
  store.put(key, new Uint8Array(200001), {
    httpMetadata: { contentType: "image/webp" },
  }),
);
assert.equal(calls.length, 3);
assert.throws(() =>
  supabaseStorage(
    "https://evil.example",
    "stashbox-media",
    "sb_secret_test-only",
  ),
);
assert.throws(() =>
  supabaseStorage(
    "http://example.supabase.co",
    "stashbox-media",
    "sb_secret_test-only",
  ),
);
assert.throws(() =>
  supabaseStorage(
    "https://example.supabase.co",
    "stashbox-media",
    "sb_publishable_test-only",
  ),
);
const legacy =
  "eyJhbGciOiJIUzI1NiJ9." +
  btoa(JSON.stringify({ role: "service_role" })) +
  ".test";
let auth;
await supabaseStorage(
  "https://example.supabase.co",
  "stashbox-media",
  legacy,
  async (_, options) => {
    auth = options.headers.Authorization;
    return new Response("{}");
  },
).delete(key);
assert.equal(auth, "Bearer " + legacy);
const local = {};
assert.equal(imageBucket({ BUCKET: local }), local);
assert.equal(
  imageBucket({ STORAGE_PROVIDER: "supabase", BUCKET: local }),
  undefined,
);
console.log(
  "PASS private storage paths, streaming reads, upload/delete, new/legacy auth headers, sanitized failures, missing objects, size/path/host checks and local R2 compatibility",
);
