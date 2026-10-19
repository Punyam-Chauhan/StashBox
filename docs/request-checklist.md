# StashBox request audit — 19 October 2026

| Request | Implemented behavior | Verification |
| --- | --- | --- |
| Run locally, keep Git history | Local preview and Codex-authored Git checkpoints; no deployment | Build, local API health and Git checks |
| Hostel-only snacks and free-form locations | Hostel isolation, room/wing entry, Mandakini phase separation and access notice | Integration and hostel browser tests |
| Manage bhawans from the moderator panel | Add, rename and delete original or later bhawans; resident accounts and last directory entry are protected; saved choices recover after deletion | Hostel manager, edit/delete and isolated original-bhawan tests |
| Autocomplete and packet images | Supplied image library, new product entries, shared default images and vector fallback | Photo browser and packet-photo tests |
| No alternate Stasher image for an existing product | Upload UI hidden; server rejects replacements; moderator retains default control | API integration and packet-photo tests |
| Drink packaging variants and MRP | Can/bottle/volume variants; comparisons retain printed MRP | Integration, photo and grouped-card tests |
| Compact cards and expanding comparisons | Four desktop product columns, one card per product with pack/room comparisons; four desktop hostel columns | Grouped-card and support browser tests |
| Timed prices and optional offers | Price cutoff, later price, discount reference and offer notes | Pricing unit/browser and integration tests |
| Readable, consistent UI | Intact sidebar identities, responsive spacing and dialogs; no fixed hostel count or universal 9 PM assumption | Desktop/mobile browser checks |
| Standalone Pawn Shop | Its own sidebar and own-listing pages, campus-wide feed, no categories, dark green/chalky styling and pawn vector | Community browser/API tests |
| Optional UPI QR | Stasher opt-in, buyer price-area expansion and removal/replacement | Community API/browser tests |
| Automatic moderation | Server text checks on both marketplaces, alcohol/tobacco/intoxicant/animal terms and public-text character restrictions; no mandatory review queue | Moderation and marketplace tests |
| Moderator activity | Recent entries, missing images, supplied images and exception controls | Community API/browser and photo tests |
| Compressed uploads | New uploads resize and adapt WebP quality; hard 200 KB result limit and shared storage budget | Image compression/storage and community tests |
| Private Stasher dashboard | Purchases/opening stock, dated sales, edits/deletes, calendar, inventory value, FIFO gross profit, best sellers and CSV | Bookkeeping, dashboard API/browser tests |
| Demand/restock suggestions | Recent versus previous seven-day sales, remaining coverage and planning window; early signal labels | Bookkeeping and dashboard browser tests |
| Going to sleep | Compact header control beside account; server hides listings and preserves stock; reopening confirms availability | Dashboard API/browser tests |
| Support dialog | Neighbourhood moderator copy, original web/mask vectors, location and WhatsApp link | Support browser checks at desktop, tablet, 390 px and 320 px |
| Stasher terminology | Visible seller labels, dashboard, counts, comparison labels and buyer details use Stasher | Browser checks and UI copy scan |

## Practical limits

- Demand uses the Stasher's manually recorded sales. The app has no order/payment system and cannot measure actual campus-wide sales.
- Automated moderation is text-based. It cannot guarantee detection of all new slang or prohibited contents in an image. Its implementation is not described in the public UI.
- New user uploads are compressed. The original maintainer-supplied static library assets are retained.
- Online hosting remains deferred as requested. Permanent free hosting capacity is not guaranteed.
- Online product-image searching was abandoned at the user's request. The supplied library and uploads are used instead.

Tests check the behaviors listed above; they do not establish that every possible interaction is bug-free.

## Navigation and catalogue consolidation

- Product catalogue owns product names, photos, adding/removing products and uploaded-photo management. The selected editor has a single name field and no second product selector.
- Name edits retain shared photos, stock identity and private inventory linkage. Catalogue removal/restore and individual listing deletion have separate labels and confirmations.
- Native paths: `/stash`, `/dashboard`, `/moderator`; Pawn uses `/pawn`, `/pawn/deploy`, `/pawn/rules`, `/pawn/moderator`. Older Pawn links migrate on opening.
- Deploy The Pawn contains adding items, payment QR, contact/location details and existing item controls. Its moderator is separate from StashBox; its header has no snack shutter.
- Login/change-password recovery explains identity verification, supplied room/WhatsApp contact and temporary passwords. Existing passwords remain inaccessible to moderators.
- Duplicate snack selling callout and footer credit link removed. Original bottom hero artwork/CTA retained with rescue caption.

## Phone UI refinements

- Comparison uses readable room/name/location rows and separate price/actions, with cream, orange and blue-green accents. QR opens from a compact pill before Call; its nested dialog preserves comparison scrolling.
- Mobile header quick navigation replaces the hostel-only dropdown. Desktop retains its hostel chooser. The duplicate heading-level hostel button is removed.
- Mobile drawer covers the viewport, locks page scrolling, resets its scroll position and keeps its brand/close control visible. Closed mobile navigation is inert and hidden from assistive navigation.
- Stock review has one panel/action; shop opening/closing is controlled only from the header. Shutter menus and reopen dialogs are compact.
- Only one divider remains before the bottom hero. Pawn Shop masthead keeps the shop name and listing action without promotional subtitles.
- Checked with `tests/mobile-refinements.mjs` at 320, 360, 390 and 540 px, plus grouped cards, Stasher dashboard and hostel/support navigation regressions.

## Browse/navigation refinements

- Search spans its entire row; wing filtering sits below it. The Open now filter is removed. Closed and sleeping stashes stay completely hidden in both API responses and comparisons.
- Closing a shop gives a status message confirming items are hidden until reopening.
- The StashBox mobile quick menu has exactly four destinations; the Pawn menu has Shop floor, Deploy The Pawn and Back to StashBox. Other actions remain in their sidebars.
- Both drawer brands, app switches, close controls and navigation sections use consistent spacing.
- Pawn browsing restores its descriptive copy, motto and buy/sell seal below the shop name, preserving the dusky palette.
- Interactions use short opacity/colour/transform transitions; reduced-motion preference disables added motion.

## Subtle interaction motion

- Header and shop menus ease in and out; closing can be interrupted to reopen. Outside clicks and Escape retain native details behavior.
- The mobile drawer and its backdrop ease independently without blurring the entire page.
- Buttons, filters and icons use brief colour/press feedback. No looping or layout-heavy animation is added.
- Reduced-motion preference disables the added animation and delayed closing.
