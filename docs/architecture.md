# Code organization

`app/` contains framework entrypoints only. Pages select a starting view; the API route re-exports the server handler. Keep reusable UI and business logic in `src/`.

| Directory                    | Responsibility                                             |
| ---------------------------- | ---------------------------------------------------------- |
| `src/shell/`                 | App state, URL navigation, header and sidebar              |
| `src/features/account/`      | Shared location fields                                     |
| `src/features/catalogue/`    | Photos, snack form, pricing and room comparisons           |
| `src/features/hostels/`      | Hostel chooser and original illustrated hero               |
| `src/features/stash/`        | Public stock rows and shop shutter                         |
| `src/features/dashboard/`    | Private bookkeeping and entry form                         |
| `src/features/pawn/`         | Pawn browsing, item form and navigation                    |
| `src/features/payments/`     | Optional QR setup and preview                              |
| `src/features/moderation/`   | Catalogue, uploads, listings and bhawans                   |
| `src/features/support/`      | Contextual moderator dialog and vector art                 |
| `src/domain/`                | Shared types, catalogue data and pure business rules       |
| `src/shared/`                | Dialogs, motion hook, API transport and upload compression |
| `src/server/`                | Request handler and scoped D1/R2 services                  |
| `src/styles/`                | Global styles, loaded through `index.css`                  |
| `db/`, `drizzle/`            | Schema and additive migrations                             |
| `public/`                    | Supplied packet photos, fonts and brand assets             |
| `tests/`                     | Unit, service, API and browser checks                      |
| `scripts/`, `build/`, `lib/` | Startup/import tools and framework/connector plumbing      |

Feature components depend on domain rules and shared utilities. Domain modules must not import React or server bindings. Client components must never import server modules. Import UI directly from its owning feature rather than through another screen.

The shell coordinates cross-screen state and account transitions. Add independent UI to a feature folder rather than expanding that coordinator. Internal `seller_id` fields and API names remain stable for database compatibility; visible copy uses Stasher.

## Styles

`src/styles/index.css` preserves the established cascade: base theme, feature styles, then responsive refinements. Keep that order. Existing override layers remain where combining them could change responsive behavior. Prefer editing the owning rule over appending another override. SVG illustrations remain code-native assets.

## Data boundaries

- The API excludes closed/expired snack stock. There is no Open now filter. Reopening requires stock confirmation. Pawn availability is independent.
- Shared packet photos belong to the catalogue. Renames update stock/photo identities and private ledger keys together. Personal payment QRs are separate.
- Bookkeeping is private to its account and uses integer paise/FIFO calculations. It does not automatically change public stock.
- New uploads use shared WebP compression, server size/signature checks and atomic storage reservations.
- Authentication, ownership, same-origin writes and moderator scope are enforced on the server.
- Password recovery issues a temporary password after identity verification. Current passwords cannot be viewed.

## Local data and generated files

`.wrangler/state/` holds local D1/R2 data. `.dev.vars` and `.sites-runtime/maintainer-setup.txt` contain private setup material. `.sites-runtime/` also holds local tools and browser downloads. `dist/`, `.next/`, `.vinext/` and `outputs/` are generated. These ignored directories must not be committed or removed during source cleanup.

Never rewrite an applied SQL migration. Add a migration for schema changes; startup records applied migrations in a local journal. Retain supplied `public/packets/` assets and their provenance in `src/domain/packet-library.json`. `scripts/import-packets.mjs` imports the reviewed source folder; browsing does not run image searches.

## Verification

Tests targeting the running app use loopback and synthetic accounts. Run them sequentially because they share a local server and clean up their fixtures.

`tests/helpers/browser.mjs` prefers an installed Playwright, then the Codex bundled runtime. Set `STASHBOX_BROWSER_EXECUTABLE` to override the default ignored Chromium binary path on another machine. Screenshots go to `outputs/`.

| Suite                     | Coverage                                                      |
| ------------------------- | ------------------------------------------------------------- |
| `integration.mjs`         | Authentication, location, pricing and stock API               |
| `experiences-browser.mjs` | Routes, catalogue edits, recovery, Pawn and moderation        |
| `mobile-refinements.mjs`  | Mobile navigation, comparison cards and shop controls         |
| `menu-motion.mjs`         | Drawer/dropdown transitions and reduced motion                |
| `payment-hero-layout.mjs` | QR spacing/uploads and complete phone/tablet/desktop hero art |
| `seller-dashboard.mjs`    | Bookkeeping API and shutter visibility                        |

Earlier feature requirements are recorded in [request-checklist.md](request-checklist.md). [GIT_GUIDE.md](../GIT_GUIDE.md) covers checkpoint authorship and private-file checks.
