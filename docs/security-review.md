# Production security review — 20 October 2026

The public site is `https://stashbox.pages.dev`. Its Worker and Worker preview addresses remain disabled. Production data and secrets stay in the existing Cloudflare D1 and private Supabase bucket.

## Changes

- Demo listings are off by default. Maintainers can enable the **Demo listings button** under **Site controls → App availability**. Both entry buttons and `?demo=1` respect this setting. Demonstration data stays clearly labelled and never enters the database.
- All reviewed request values enter SQL through bound parameters. Dynamic moderation table/column names come from a fixed allowlist; inherited object properties cannot select a table. SQL injection login and invalid-identifier tests are included.
- Write requests reject mismatched origins and cross-site browser fetch metadata before reading bodies or querying accounts. Session cookies remain HttpOnly, Secure on HTTPS, and SameSite=Strict. Ownership and Maintainer checks remain server-side.
- Request bodies are bounded while streaming. Both image upload endpoints accept compressed WebP up to 200,000 bytes; ordinary JSON requests have a separate 16 KB limit. Oversized bodies are cancelled. A previous extra JSON limit on marketplace uploads was removed.
- User validation errors remain readable; unexpected infrastructure/database errors return a generic response. Password hashes, salts and service keys are not returned to clients.
- Pages adds anti-framing, MIME-sniffing, HTTPS, referrer, permissions and content security headers. Non-API writes are rejected because this app does not use framework server actions. CSP still allows inline scripts/styles required by rendering; it is defense in depth alongside React escaping, not a guarantee against every XSS issue.
- Updated Next to 16.3.8, React/RSC to 19.3.1, Vinext to 1.2.1, Vite to 8.3.4, Cloudflare tooling and Sharp to patched releases. Applied compatible transitive dependency fixes. Removed duplicated test loaders and redundant error wrappers.

## Validation and limits

Type checking, production builds, account/catalogue integration tests, marketplace/upload integration tests, security tests and Maintainer desktop/mobile browser tests cover the release. Live smoke tests check the deployed address, sessions and private storage after publishing. Synthetic accounts and files are removed afterwards.

The dependency audit still reports upstream `braces` glob-parser issues in build/lint tooling, an older development-only `esbuild` under Drizzle Kit, and `fflate` under Satori's unused image-generation path. The app defines no `next/og`, image-generation or server-action routes. Do not apply the suggested forced framework/Drizzle downgrades without compatibility testing. Recheck these advisories as upstream fixes become available.

This is a targeted code and deployment review, not a claim of complete security or an independent penetration test. Account abuse, infrastructure limits and newly disclosed vulnerabilities still require monitoring and updates.
