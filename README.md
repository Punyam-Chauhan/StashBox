# StashBox

A hostel snack directory and a separate campus exchange at /pawn. Built with React, Vinext, Cloudflare Workers, D1 and R2. Development stays local; building does not publish the app.

## Run locally

Use Node 22.13 or newer. Install with npm install, then initialize the local database and start the app:

```powershell
node scripts/start-local.mjs
```

Startup applies pending additive migrations and retains data in .wrangler/state/. For an already initialized checkout, expose the development server to a phone on the same hotspot/network:

```powershell
npm run dev -- --hostname 0.0.0.0
```

Open http://127.0.0.1:5173/ on the computer, or http://<computer-network-IP>:5173/ on the phone. Stop with Ctrl+C. Use /?demo=1 for clearly labelled fictional listings; demo data is never inserted into the database.

## Where to work

- app/ — thin page and API adapters.
- src/features/ — catalogue, hostels, stash, dashboard, Pawn, payments, moderation and support.
- src/shell/ — navigation and cross-screen state.
- src/domain/ — shared types and pure pricing, moderation and bookkeeping rules.
- src/shared/ — reusable UI, motion, API transport and image compression.
- src/server/ — request handling and database/storage services.
- src/styles/ — one ordered stylesheet entrypoint.
- db/ and drizzle/ — schema and additive migrations.
- tests/ — regression coverage, with shared browser setup in tests/helpers/.

See [the architecture guide](docs/architecture.md) for ownership, dependency boundaries, styling order and test coverage.

## Routes

New accounts need a unique username and a college student ID containing exactly five digits. Students can report a listing or a Stasher, including by username in Help. Reports ask for a reason and explanation, then appear in the Maintainer report inbox and notification bell.

In Account management, the primary Maintainer can suspend sellers, delete ordinary accounts, correct student IDs, and assign Vice-Maintainers. Select the permissions each Vice-Maintainer needs; all listed permissions can be granted. A Vice-Maintainer can delegate only permissions they already hold. The primary account is protected from other staff. Suspension hides the seller's listings across the site and signs them out. Deletion removes private uploads and account data; shared catalogue photos remain without the deleted uploader's identity.

| Route            | Screen                                              |
| ---------------- | --------------------------------------------------- |
| /                | Hostel chooser or selected hostel's snack directory |
| /stash           | Public stock management                             |
| /dashboard       | Private Stasher notebook                            |
| /maintainer      | StashBox moderation                                 |
| /pawn            | The Pawn Shop                                       |
| /pawn/deploy     | Item creation, own listings and optional payment QR |
| /pawn/rules      | Pawn community rules                                |
| /pawn/maintainer | Separate Pawn moderation                            |

Older Pawn links remain compatible and canonicalize to /pawn. The selected hostel is remembered in the browser and highlighted on return. Closed snack stashes are completely hidden; Pawn availability is independent.

## Check changes

```powershell
npm run typecheck
npm run test:unit
npm run format:check
npm run build
node tests/integration.mjs
node tests/experiences-browser.mjs
node tests/mobile-refinements.mjs
node tests/menu-motion.mjs
node tests/payment-hero-layout.mjs
```

API/browser suites require the initialized local server. Run them sequentially. Browser setup and its executable override are documented in the architecture guide. ESLint remains available through npm run lint; existing broad API types and React effect patterns still need a separate typing/lint pass.

## Maintainer and private data

Create an account and use Help & account recovery with the private key from .sites-runtime/maintainer-setup.txt. Only the correct setup key can claim the first maintainer account. Account recovery requires identity verification and issues a temporary password; existing passwords cannot be viewed.

Never commit .dev.vars, .sites-runtime/, .wrangler/, local databases or generated outputs. Keep the local database and R2 uploads when cleaning source files. Never edit an applied migration. Original packet photos and provenance remain in public/packets/ and src/domain/packet-library.json.

See [GIT_GUIDE.md](GIT_GUIDE.md) for Git checkpoints and privacy checks.
