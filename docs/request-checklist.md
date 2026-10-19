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
