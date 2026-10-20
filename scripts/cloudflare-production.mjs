import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  cpSync,
  existsSync,
} from "node:fs";
import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
const target = JSON.parse(readFileSync("deploy/cloudflare.json", "utf8"));
const pointer = path.join(root, ".sites-runtime/cloudflare-production.json");
const cli = path.join(root, "node_modules/wrangler/bin/wrangler.js");
const command = process.argv[2];
function fingerprint() {
  const files = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { encoding: "utf8" },
  )
    .split("\0")
    .filter(
      (f) =>
        f &&
        existsSync(f) &&
        (/^(app|src|public|build|lib|drizzle|deploy)\//.test(f) ||
          [
            "package.json",
            "package-lock.json",
            "vite.config.ts",
            ".openai/hosting.json",
          ].includes(f)),
    )
    .sort();
  const hash = createHash("sha256");
  for (const file of files)
    hash.update(file).update("\0").update(readFileSync(file)).update("\0");
  return hash.digest("hex");
}
function run(file, args, input) {
  const r = spawnSync(process.execPath, [file, ...args], {
    stdio: input === undefined ? "inherit" : ["pipe", "inherit", "inherit"],
    input,
    env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: target.accountId },
  });
  if (r.error) throw r.error;
  if (r.status !== 0)
    throw Error("Command failed; no later deployment steps were run.");
}
function artifact() {
  if (!existsSync(pointer)) throw Error("Run the prepare command first.");
  const value = JSON.parse(readFileSync(pointer, "utf8"));
  if (value.fingerprint !== fingerprint())
    throw Error(
      "Source changed since the production build. Run prepare again.",
    );
  const config = path.resolve(value.config);
  if (
    !config.startsWith(
      path.join(root, ".sites-runtime/cloudflare-builds") + path.sep,
    )
  )
    throw Error("Invalid build path.");
  const parsed = JSON.parse(readFileSync(config, "utf8"));
  if (
    parsed.account_id !== target.accountId ||
    parsed.name !== target.workerName ||
    parsed.d1_databases?.[0]?.database_id !== target.databaseId ||
    parsed.r2_buckets?.length
  )
    throw Error(
      "Production destination does not match deploy/cloudflare.json.",
    );
  return config;
}
if (command === "prepare") {
  // Build once with local bindings, then isolate a production-only artifact.
  // Never change local DB/R2 state or copy local data into the release.
  run(path.join(root, "scripts/run-framework.mjs"), ["build"]);
  const directory = path.join(
    root,
    ".sites-runtime/cloudflare-builds",
    String(Date.now()),
  );
  mkdirSync(directory, { recursive: true });
  cpSync(path.join(root, "dist/server"), path.join(directory, "server"), {
    recursive: true,
  });
  cpSync(path.join(root, "dist/client"), path.join(directory, "client"), {
    recursive: true,
  });
  const config = path.join(directory, "server/wrangler.json"),
    value = JSON.parse(readFileSync(config, "utf8"));
  value.name = target.workerName;
  value.account_id = target.accountId;
  // Public traffic enters through stashbox.pages.dev; Pages calls this Worker internally.
  value.workers_dev = false;
  value.preview_urls = false;
  value.d1_databases = [
    {
      binding: "DB",
      database_name: target.databaseName,
      database_id: target.databaseId,
      migrations_dir: path.join(root, "drizzle"),
    },
  ];
  value.r2_buckets = [];
  value.services = [];
  delete value.routes;
  value.vars = {
    STORAGE_PROVIDER: "supabase",
    SUPABASE_URL: target.supabaseUrl,
    SUPABASE_BUCKET: target.supabaseBucket,
  };
  writeFileSync(config, JSON.stringify(value, null, 2) + "\n");
  writeFileSync(
    pointer,
    JSON.stringify(
      {
        config,
        fingerprint: fingerprint(),
        preparedAt: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Production artifact prepared. Local data was not copied. Nothing has been deployed.",
  );
} else if (command === "login") run(cli, ["login"]);
else if (command === "whoami") run(cli, ["whoami"]);
else if (command === "dry-run")
  run(cli, ["deploy", "--config", artifact(), "--dry-run"]);
else if (command === "migrate")
  run(cli, [
    "d1",
    "migrations",
    "apply",
    "DB",
    "--remote",
    "--config",
    artifact(),
  ]);
else if (command === "secret") {
  const name = process.argv[3];
  if (!["SUPABASE_SECRET_KEY", "MAINTAINER_BOOTSTRAP_TOKEN"].includes(name))
    throw Error("Choose SUPABASE_SECRET_KEY or MAINTAINER_BOOTSTRAP_TOKEN.");
  // Wrangler reads the value interactively with hidden input. Never pass a value as an argument.
  if (process.argv.length > 4)
    throw Error("Do not pass a secret value on the command line.");
  run(cli, ["secret", "put", name, "--config", artifact()]);
} else if (command === "deploy") run(cli, ["deploy", "--config", artifact()]);
else
  throw Error(
    "Use: prepare | login | whoami | dry-run | migrate | secret <name> | deploy",
  );
