# StashBox

## Stasher dashboard and current UI

The UI calls sellers **Stashers**. Internal `seller_id`, API routes and existing database names are retained to preserve compatibility. `app/ui-polish.css` contains shared wrapping, navigation and button rules; compact hostel cards use four columns on wide desktop, two on mobile. Copy does not assume a fixed number of hostels. The current hostel registry is still defined in `app/shared.ts`; adding hostels through the moderator panel is a separate extension.

`app/seller-dashboard.tsx` provides the private Stasher dashboard and the compact shop control beside the account button. Closing the shutter hides both snack and Pawn Shop listings on the server, while keeping saved stock. Reopening requires a stock check and renews snack stock for 24 hours. These controls use `app/server/seller-dashboard.ts`; migration 0008 adds the private ledger and shutter state without replacing existing data.

The private notebook supports dated purchases/opening stock and sales, corrections, deletion, a monthly calendar, best sellers, inventory cost, estimated gross profit and CSV export. `app/bookkeeping.ts` calculates FIFO cost using integer paise. Sales cannot exceed recorded stock, including after backdated edits or deleting a purchase. Optimistic database revisions prevent simultaneous requests from overselling. Every query is scoped to the signed-in account. Notebook entries do not automatically modify public availability.

Restock suggestions compare the Stasher's last seven days of recorded sales with the previous seven and estimate remaining stock coverage. The planning window is selectable. Sparse history is labelled an early signal; products without sales receive no demand recommendation. These suggestions describe the Stasher's own history, not measured campus demand.

Products with a shared photo hide the Stasher upload controls. The server also rejects alternate uploads, including concurrent attempts after a first upload establishes a default. The moderator retains shared-photo management. Alcohol/intoxicant aliases and live animal terms are blocked in both marketplaces, with allowances for clearly described computer mice, CAT study books and familiar packaged drinks. Public-facing copy gives community rules rather than implementation details.

`app/support-panel.tsx` contains the original web and mask vectors for the neighbourhood moderator dialog. The WhatsApp button opens the moderator's supplied number with an editable greeting; it sends no message automatically. The hero illustrations remain unchanged.

Checks: `node tests/bookkeeping.mjs`, `node tests/seller-dashboard.mjs`, `node tests/seller-browser.mjs`, `node tests/support-browser.mjs`, plus the existing integration, community, photo, pricing and grouped-card tests. The app remains local-only.

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

## Timed prices, discounts and readable text

In My stash → Add snack or Edit pricing & photo, open the optional Offers & timed pricing section. The main selling price is the price now. For “₹20 until midnight, then ₹25”, enter 20 as the selling price, enable the time option, choose Tonight at midnight and enter 25 as the later price. The date/time field always means IST, including on devices in other time zones. This is a one-time change; it does not repeat every night. Daily stock confirmation is still required.

To show a discount, optionally enter your usual selling price above the current selling price. This reference is separate from printed MRP. Offer notes such as “2 for ₹35” are displayed for buyers to discuss directly with the seller. To stop only an offer label at a chosen time, leave the later price blank; the selling price stays the same. Changing the quick price input manually clears an old schedule and offer so it cannot override your new price later. Toggling In stock / Sold out preserves the schedule.

Backend: the additive 0005 migration stores price_after, price_until, usual_price and offer_text. app/pricing.ts validates writes and computes the effective price from the current timestamp. The public API includes effective_price alongside the original fields. No background job is needed to switch prices. The browser uses that same calculation for room comparisons, starting prices and best-price badges, and updates while the page is open.

Frontend: app/pricing-ui.tsx contains the optional fields and buyer-facing offer details. app/readability.css loads after the existing styles to raise body text, navigation, form inputs, card titles and metadata consistently across desktop and mobile. Keep overrides there when adjusting text sizes. The hero artwork is unchanged.

Checks: node tests/pricing.mjs covers the exact cutoff, IST midnight and validation. node tests/integration.mjs exercises real local API/database writes, persistence, expiry and ownership. node tests/pricing-browser.mjs checks live price changes, form submission, larger text and mobile fit.

## The Pawn Shop and payment QR

The app switch near the top of StashBox opens The Pawn Shop as its own dark campus exchange. Its sidebar has Shop floor, Your listings, Sell an item, Payment QR and Shop rules, plus Back to StashBox. The shop has its own branding and footer. The URL remembers the selected app and shop section; returning to StashBox restores the selected hostel. The shop is universal across hostels, with no categories or hostel chooser. Each item shows its seller's hostel, wing and room. Sellers can mark an item sold, relist or remove it. Entries expire from public browsing 30 days after their last update.

The theme uses dusty green, charcoal, subtle texture, serif lettering and beige highlights. app/community.css contains it. app/dialog.tsx owns the wider dialogs with fixed headers and separately scrolling bodies; photos and timed pricing are optional expandable sections.

In My stash or Pawn Shop → Payment QR, a seller can optionally upload their own UPI QR. Buyers expand it beside the price in snack comparisons or item details. QR uploads are separate from the universal product-photo cache. Check the recipient in your UPI app before paying. The app does not collect money or create orders. Removing or replacing a QR stops the old image URL from being public.

## Automatic moderation and maintainer activity

There is no required approval queue, external API key or paid service. app/moderation.ts contains the local English/Hinglish wordlist, Indian tobacco aliases such as chhoti gold and Gold Flake, ASCII allowlist, number substitution and spacing/punctuation normalization. The server checks snack names, offer notes, Pawn Shop titles/descriptions and public profile fields. Valid entries publish immediately; prohibited text is rejected. Tests include the exact tobacco names that previously slipped through. Public fields accept ASCII letters, numbers, spaces and simple punctuation. Passwords are not constrained to ASCII, and curated product labels retain their supplied spelling.

A wordlist cannot guarantee detection of new slang or deceptive descriptions, and does not inspect photo contents. Uploads are checked for allowed image format and size. No image-content classifier or external AI moderation service is active. Extend the terms in app/moderation.ts when needed and add examples to tests/moderation.mjs. Prescription/controlled medicines and loose tablets are blocked; sellers must attest that medicine items are sealed and non-prescription.

The maintainer's Marketplace activity dashboard shows recent products and listings, missing images, user photos, Pawn Shop items and payment QRs. Choose photo jumps to that product in the photo manager. Hide/remove and restore controls handle exceptions; they do not require routine review. Moderator actions are audited. Removed entries stay hidden when a seller toggles availability. The help section covers listings, photos, payment QR, accounts and other issues. The contact location is Patel Bhawan, Wing 9, Room 224. Timing copy says “after in-time” instead of assuming every hostel closes at 9 PM.

Frontend: app/community-ui.tsx contains shop pages, QR setup/expansion and activity monitoring; app/pawn-sidebar.tsx contains the app switch and shop navigation. Backend: app/server/community.ts handles durable listings/media, ownership, privacy and moderator actions. Migration 0006 adds the tables and review fields while preserving existing students and stock. Normal writes explicitly publish after text validation; the conservative database default does not create a user review queue.

Run node tests/moderation.mjs for the wordlist and ASCII checks, node tests/community.mjs for publishing, ownership and QR privacy, and node tests/community-browser.mjs for the complete desktop/mobile flows and app switching. The website remains local-only.

## Small uploads and a bounded photo budget

Every new user upload uses app/image-upload.ts, including snacks, Pawn Shop item photos, maintainer uploads and payment QRs. Users can choose JPG, PNG, WebP or AVIF sources up to 30 MB. Stage one resizes large images. Stage two encodes WebP and adjusts quality/size until the result fits. The usual photo target is 120 KB; QR codes use higher quality and a 180 KB target to preserve edges. Every saved upload has a hard 200 KB maximum. The server checks the WebP file signature and size, so direct API requests cannot bypass the conversion requirement. Existing prepared library assets remain unchanged.

app/server/image-storage.ts reserves actual upload bytes atomically in image_storage before saving to R2. The shared upload budget is 250 MB, preventing concurrent uploads from exceeding it. A full budget blocks further images while still allowing text-only listings. Old uploads receive conservative byte reservations during migration 0007. Replacing/removing a QR and deleting an item's last photo reference free their stored objects and reservations. Abandoned uploads older than 24 hours are cleaned up in bounded batches during later uploads. The maintainer dashboard shows usage. Shared product photos are retained for reuse.

node tests/image-upload-browser.mjs checks a photo larger than the former 12 MB limit, output WebP type, resizing, hard size limits and QR handling. node tests/image-storage.mjs checks concurrent quota reservations. Browser flows also verify PNG inputs are stored and served as WebP.

The chess-pawn logo is an original vector in public/pawn-shop-mark.svg, with the inline React version in app/pawn-mark.tsx. It is used in the shop sidebar, app switch and shop header. The Back to StashBox button uses a prominent beige fill.
