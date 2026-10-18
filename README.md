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
- Comparison of the same product, flavour and printed MRP across sellers. Drinks also match container and volume.
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
node tests/packet-photos.mjs
node tests/photos-browser.mjs
```

The integration test runs against loopback only, creates synthetic local accounts and cleans them up. Browser tests use Playwright from the bundled runtime and the ignored browser download under `.sites-runtime/browsers/`; adjust those machine-specific paths on another computer. Screenshots are saved in ignored `outputs/`.

Hostel, wing, phase and room assignments are self-declared. The uploaded student roster has not been imported or exposed. The API requires a valid hostel for every public listing request and filters the database query by that hostel.

The hostel migration adds nullable location fields and preserves the original numeric room column internally. Existing accounts and listings are retained. Accounts created before hostel support must choose their location in the profile before their listings become visible; no hostel is guessed for them. New room labels are returned as strings.

For learning: edit hostel names and phase copy in `app/shared.ts`, the chooser and listing behavior in `app/stashbox.tsx`, new styling in `app/hostels.css`, API validation and filtering in `app/api/[...path]/route.ts`, and database fields in `db/schema.ts`. After a schema change, generate an additional migration with `node node_modules/drizzle-kit/bin.cjs generate`; never edit a migration already applied to an existing database.

## Later online setup

No version has been published online. Local records and setup keys are separate from any future hosted database. Before hostel launch, connect the chosen free hosting account, set up the maintainer in that environment, confirm room exclusions, and test the expected traffic. Free-tier limits and provider terms may change.

## Product names, images and drinks

Stock entry uses a name field with keyboard-accessible suggestions. The first 66 images came from the supplied PACKET folder; no image search runs while using the app. The originals are copied unchanged into public/packets, and app/packet-library.json maps names, aliases and image paths. scripts/packet-import-map.json records the reviewed filename mapping. To import again: node scripts/import-packets.mjs "C:/path/to/PACKET".

New names are saved in product_catalog when stock is added, so suggestions survive sold-out or deleted listings. The shared library includes products added by the maintainer. Uploaded image bytes live in local R2 storage under .wrangler/state; D1 stores metadata and the chosen default. A seller's upload is reusable for the same product and flavour across all hostels. Maintainer → Product photos can upload alternatives, add new products and choose the universal default. The first upload supplies a missing default. Existing prepared photos keep their default until the maintainer changes it.

Drinks reuse their brand photo. Each listing specifies container and volume; those fields are included with product name, category and MRP in its comparison key. Bottle 250 ml and Can 250 ml remain separate, while 1 L and 1000 ml normalize to the same volume. Previously added variants become quick choices. Snacks ask for MRP and selling price without asking for grams.

Frontend: app/product-photos.tsx contains autocomplete, camera/file inputs, drink fields and image fitting. app/packet-illustration.tsx draws the fallback SVG; app/photo-manager.tsx manages defaults. app/photos.css contains the image-colour gradients and mobile layout. The original hero illustration remains in app/stashbox.tsx.

Backend: app/server/packet-photos.ts resolves shared defaults and stores uploads; app/api/[...path]/route.ts validates stock, exposes product suggestions and protects maintainer operations. Database fields are in db/schema.ts; additive migrations preserve existing users and stock. Existing drink listings without variant details can be updated through Edit MRP & photo.

## Compact product browsing

The directory shows one card per product and flavour, with four columns on large desktops, three on smaller desktops/tablets and two on mobile. Selecting a product opens expandable MRP/pack options. Each option contains the seller room, asking price and availability; drinks also separate container and volume. Different flavours remain different cards. Hostels, wing/phase filters and stock expiry still apply before grouping.

The backend retains individual listings and comparison keys. Frontend grouping lives in app/product-groups.ts and the variant expansion in app/stashbox.tsx. Starting prices prefer an open seller when one exists. Run node tests/grouped-cards.mjs for the grouped-card UI checks.
