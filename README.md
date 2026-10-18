# StashBox

A hostel snack directory for 350 students. Built with React, Vinext, Cloudflare Workers and D1.

## Run locally

Dependencies are already installed in this checkout. From this folder run:

```powershell
node scripts/start-local.mjs
```

Open http://127.0.0.1:5173/ for real local listings. Use http://127.0.0.1:5173/?demo=1 for explicitly labelled fictional listings. Demo data is never inserted into the database. The live directory starts empty.

The startup script initializes a missing local database and generates a private maintainer setup key. It never deploys or publishes. Stop the preview with Ctrl+C. Restarting retains the local database in `.wrangler/state/`.

## Maintainer account

Create your own account with Room 224. Open Help & account recovery, then use the private key in `.sites-runtime/maintainer-setup.txt`. Only the first account to supply the correct key can become the maintainer. A name, room number, or student ID alone never grants administrative access. Keep the setup file and `.dev.vars` private.

The maintainer can search accounts, acknowledge an in-person identity check, and issue a randomly generated temporary password. Resetting revokes existing sessions. The student must change the temporary password before accessing the stash. Existing passwords cannot be viewed.

## Included

- Public snack directory with search, categories, wing filters, open-now filter and price sorting.
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

Room ranges follow the supplied document. Some document headings and rows disagree about unusable rooms, so the selector currently includes every room within each numbered wing range. Confirm exclusions before campus launch. Student identities and room assignments are self-declared; the uploaded student roster has not been imported or exposed.

## Later online setup

No version has been published online. Local records and setup keys are separate from any future hosted database. Before hostel launch, connect the chosen free hosting account, set up the maintainer in that environment, confirm room exclusions, and test the expected traffic. Free-tier limits and provider terms may change.
