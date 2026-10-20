# Deploy StashBox without R2

Production uses Cloudflare Workers and D1, with a private Supabase Storage bucket for uploaded photos and QRs. Local development continues to use its existing local DB and R2 emulation.

The non-secret destinations are in `deploy/cloudflare.json`. Confirm the account, D1 database ID and Supabase project URL there before running remote commands. The production database starts empty; local accounts, sessions and uploads are never copied automatically.

Run these commands from the project folder. They use the installed Wrangler CLI.

If PowerShell cannot find `node`, add the bundled runtime for that terminal session:

```powershell
$env:Path = "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;$env:Path"
```

The public address is `https://stashbox.pages.dev`. A small Pages entry point forwards requests through a service binding to the existing `stashbox` Worker. The same database, secrets and private storage remain attached to that Worker. Registering a new subdomain may take a few minutes to activate DNS and HTTPS. GitHub Pages serves static sites and cannot run this app's existing backend.

1. Build and prepare the production artifact:

   ```sh
   node scripts/cloudflare-production.mjs prepare
   node scripts/cloudflare-production.mjs dry-run
   ```

2. Authorize your Cloudflare account in the browser:

   ```sh
   node scripts/cloudflare-production.mjs login
   node scripts/cloudflare-production.mjs whoami
   ```

3. Create the production tables by applying the checked-in migrations:

   ```sh
   node scripts/cloudflare-production.mjs migrate
   ```

4. Open Supabase **Project Settings → API Keys**. Create/copy a backend **Secret key** (`sb_secret_…`). Keep `stashbox-media` private and do not add anonymous read/write policies. Enter the key at Wrangler's hidden prompt:

   ```sh
   node scripts/cloudflare-production.mjs secret SUPABASE_SECRET_KEY
   ```

   Do not put the key in chat, screenshots, Git, browser code or a command argument. The database password and publishable key are not the key needed here. If Wrangler offers to create the new `stashbox` Worker to store the secret, verify that exact Worker name before proceeding.

5. Generate a separate, strong setup key in your password manager and save it there. Enter it at this hidden prompt:

   ```sh
   node scripts/cloudflare-production.mjs secret MAINTAINER_BOOTSTRAP_TOKEN
   ```

   Keep it for activating your first production Maintainer account. Sign up with your room number 224, open **Help & support**, enter the key and choose **Activate maintainer access**. Local accounts are separate from production. Do not reuse the local development setup key.

6. Publish the prepared artifact:

   ```sh
   node scripts/cloudflare-production.mjs deploy
   ```

The Worker is internal: its `workers.dev` address and Worker preview URLs are disabled. Use `https://stashbox.pages.dev` after publishing the Pages entry point below. Test signup/login, listing creation, private QR/photo permissions, Maintainer activation and mobile browsing there. Confirm Free-plan CPU limits against the real deployment; local timings do not guarantee hosted limits.

After EU.org approves the domain and Cloudflare marks the zone active, add `stashbox.eu.org` as the Worker's custom domain. Keep the database and bucket when publishing later code changes. Run `prepare` again after changing source; production artifacts stay in ignored `.sites-runtime/cloudflare-builds/`. No remote command runs as part of normal local startup or build.

## Publish the short Pages address

The `stashbox` Pages project uses `deploy/pages/wrangler.json`. To publish or update its small entry point, run:

```powershell
node scripts/deploy-pages.mjs
```

Ordinary app updates only need the Worker deployment commands above: Pages automatically calls the current production Worker. Keep that Worker running. No database migrations or copying secrets are needed for the short address. Users must log in once on the new address because cookies are scoped to each hostname.
