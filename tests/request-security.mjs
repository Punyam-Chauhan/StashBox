import assert from "node:assert/strict";
import { importTypeScript } from "./helpers/import-typescript.mjs";
import gateway from "../deploy/pages/public/_worker.js";
const { requestBodyLimit, crossSiteWrite } = await importTypeScript(
  "src/server/request-security.ts",
);
const { maintainerConsole } = await importTypeScript(
  "src/server/maintainer-console.ts",
);
const origin = "https://stashbox.pages.dev";
assert.equal(requestBodyLimit("/api/market/upload"), 200000);
assert.equal(requestBodyLimit("/api/photos/upload"), 200000);
assert.equal(requestBodyLimit("/api/login"), 16000);
for (const headers of [
  { Origin: "https://attacker.invalid" },
  { Origin: "null" },
  { "Sec-Fetch-Site": "cross-site" },
]) {
  assert(
    crossSiteWrite(
      new Request(origin + "/api/logout", { method: "POST", headers }),
    ),
  );
}
assert(
  !crossSiteWrite(
    new Request(origin + "/api/login", {
      method: "POST",
      headers: { Origin: origin, "Sec-Fetch-Site": "same-origin" },
    }),
  ),
);
assert(!crossSiteWrite(new Request(origin + "/api/me")));
const request = new Request(origin + "/api/me");
const response = await gateway.fetch(request, {
  STASHBOX: {
    async fetch(forwarded) {
      assert.equal(forwarded, request);
      return new Response('{"user":null}', {
        headers: {
          "Set-Cookie": "test=hidden; HttpOnly; Secure",
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    },
  },
});
assert.equal(await response.text(), '{"user":null}');
assert.equal(
  response.headers.get("set-cookie"),
  "test=hidden; HttpOnly; Secure",
);
assert.equal(response.headers.get("x-frame-options"), "DENY");
assert.equal(response.headers.get("x-content-type-options"), "nosniff");
assert.match(
  response.headers.get("content-security-policy"),
  /frame-ancestors 'none'/,
);
const blockedAction = await gateway.fetch(
  new Request(origin + "/", { method: "POST", body: "unused action" }),
  {
    STASHBOX: {
      fetch() {
        throw Error("Non-API writes must never reach the framework");
      },
    },
  },
);
assert.equal(blockedAction.status, 405);
for (const kind of [
  "__proto__",
  "constructor",
  "toString",
  "snack; DROP TABLE users;--",
]) {
  const result = await maintainerConsole(
    new Request(origin + "/api/admin/review", { method: "DELETE" }),
    "admin/review",
    {
      user: { id: "test", role: "admin" },
      db: {
        prepare() {
          throw Error("Invalid kinds must never reach SQL");
        },
      },
      bucket: {},
      body: async () => ({ kind, id: "test" }),
    },
  );
  assert.equal(result.status, 400);
}
console.log(
  "PASS cross-site write rejection, upload limits, security headers, session forwarding and SQL identifier allowlist",
);
