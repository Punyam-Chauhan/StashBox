# StashBox

**Your hostel’s midnight menu.**

Craving a snack? Find out who has it in your hostel, compare prices, and head to their room. Got extra snacks? Put your stash up for sale.

StashBox also includes **The Pawn Shop**, where students can buy and sell things across campus.

## What you can do

- **Find a snack:** Choose your hostel, browse snacks, and compare prices between rooms.
- **Become a Stasher:** Add your snacks, set prices, and open your shop when you’re available. Closing your shop hides your snacks until you reopen.
- **Track your stash:** Record purchases and sales in your private dashboard.
- **Use The Pawn Shop:** List or browse items such as books, cycles, and other useful things.

Buyers and Stashers arrange payment and collection directly. There’s no commission, delivery, or checkout in the app.

## Run it on your computer

You’ll need **Node.js 22.13 or newer** and **Git**.

**1. Download the project.** Open a terminal and run:

```sh
git clone https://github.com/Punyam-Chauhan/StashBox.git
cd StashBox
```

Already have the project? Open a terminal in its folder and skip this step.

**2. Install what the app needs:**

```sh
npm install
```

**3. Start the app:**

```sh
node scripts/start-local.mjs
```

Wait for startup to finish, then open **[localhost:5173](http://localhost:5173)** in your browser. The first start may take a little longer while the app prepares its local database.

Press **Ctrl+C** in the terminal to stop it. Your saved data stays on your computer.

### Try it on your phone

After running the app once, stop it with Ctrl+C. Connect your phone and computer to the same Wi-Fi or hotspot, then run:

```sh
npm run dev -- --hostname 0.0.0.0
```

Open the **Network** address printed in the terminal on your phone. Keep the terminal running while you test.

## Making changes

Most of the app is inside `src/`:

- `src/features/` — screens and features, including snacks, Pawn Shop, and moderation.
- `src/styles/` — colours, spacing, and layouts.
- `src/server/` — accounts, listings, and saved data.

For a fuller folder map and testing instructions, see the [developer guide](docs/architecture.md).

**Keep your local data private.** Don’t upload `.dev.vars` or `.wrangler/` to GitHub. Don’t delete `.wrangler/` unless you intend to erase your local accounts, listings, and uploads.
