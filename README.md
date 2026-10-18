# StashBox

A snack directory for General Bipin Rawat, Tagore, Patel, Silver Jubilee, Vishwesharya, Saraswati, Mandakini and Sarojini Bhawan. Built with React, Vinext, Cloudflare Workers and D1.

## Run locally

Dependencies are already installed in this checkout. From this folder run:

```powershell
node scripts/start-local.mjs
```

Open http://127.0.0.1:5173/ to choose a hostel and browse its real local listings. The selected hostel is remembered on that browser. Use the Change hostel button to return to the landing page. Use http://127.0.0.1:5173/?demo=1 for explicitly labelled fictional listings, or http://127.0.0.1:5173/?hostel=mandakini&demo=1 to inspect the Mandakini demo. Demo data is never inserted into the database.

The startup script initializes a missing local database, applies pending local migrations once using a database-local journal, and generates a private maintainer setup key. It never deploys or publishes. Stop the preview with Ctrl+C. Restarting retains the local database in `.wrangler/state/`.

## Maintainer account

Create your own account with Room 224. Open Help & account recovery, then use the private key in `.sites-runtime/maintainer-setup.txt`. Only the first account to supply the correct key can become the maintainer. A name, room number, or student ID alone never grants administrative access. Keep the setup file and `.dev.vars` private.

The maintainer can search accounts, acknowledge an in-person identity check, and issue a randomly generated temporary password. Resetting revokes existing sessions. The student must change the temporary password before accessing the stash. Existing passwords cannot be viewed.

## Included

- Hostel-selection landing page and hostel-scoped snack directories. The illustrated hero appears on the landing page and below the listings, keeping snacks at the top of the directory.
- Search, categories, dynamically populated wing filters, open-now filter and price sorting.
- Sellers enter their own room and wing labels, including values such as B-12 and West 7. No fixed room list is assumed.
- Mandakini requires Phase 1, 2 or 3. Buyers can browse all phases, Phases 1–2, or Phase 3. Cards identify phases and comparisons separate Phase 3 from Phases 1–2. The access notice cautions that rooms across that divide may be unreachable after 10 PM; it does not automatically hide stock or enforce a curfew.
- Comparison of the same product and exact pack size across separate sellers, including roommates.
- Signup with name, email, student ID, phone, room and password; login with email or student ID.
- Private email and student ID. Phone number is hidden until the seller opts into calls.
- Add catalog items or custom items, edit prices, mark stock sold out, remove items, and open or close the shop.
- Seller confirmation renews available listings for 24 hours. Expiry is enforced by the server as well as the UI.
- No reservations, checkout, delivery workflow, or payment handling.
- Password hashing with random per-user salts, hashed session tokens, HttpOnly cookies, same-origin write checks, authentication throttling and seller ownership checks.

## Verification

```powershell
node node_modules/typescript/bin/tsc --noEmit
node tests/integration.mjs
node tests/browser.mjs
```

The integration test runs against loopback only, creates synthetic local accounts and cleans them up. Browser tests use Playwright from the bundled runtime and the ignored browser download under `.sites-runtime/browsers/`; adjust those machine-specific paths on another computer. Screenshots are saved in ignored `outputs/`.

Hostel, wing, phase and room assignments are self-declared. The uploaded student roster has not been imported or exposed. The API requires a valid hostel for every public listing request and filters the database query by that hostel.

The hostel migration adds nullable location fields and preserves the original numeric room column internally. Existing accounts and listings are retained. Accounts created before hostel support must choose their location in the profile before their listings become visible; no hostel is guessed for them. New room labels are returned as strings.

For learning: edit hostel names and phase copy in `app/shared.ts`, the chooser and listing behavior in `app/stashbox.tsx`, new styling in `app/hostels.css`, API validation and filtering in `app/api/[...path]/route.ts`, and database fields in `db/schema.ts`. After a schema change, generate an additional migration with `node node_modules/drizzle-kit/bin.cjs generate`; never edit a migration already applied to an existing database.

## Later online setup

No version has been published online. Local records and setup keys are separate from any future hosted database. Before hostel launch, connect the chosen free hosting account, set up the maintainer in that environment, confirm room exclusions, and test the expected traffic. Free-tier limits and provider terms may change.
