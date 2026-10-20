import { cpSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const target = JSON.parse(
  readFileSync(path.join(root, "deploy/cloudflare.json"), "utf8"),
);
const source = path.join(root, "deploy/pages");
const config = JSON.parse(
  readFileSync(path.join(source, "wrangler.json"), "utf8"),
);
if (
  config.name !== target.workerName ||
  config.services?.[0]?.service !== target.workerName
)
  throw Error("Pages must point to the configured production Worker.");

// Isolate Pages from the Vite plugin's ancestor .wrangler/deploy configuration.
const output = mkdtempSync(path.join(tmpdir(), "stashbox-pages-"));
cpSync(path.join(source, "wrangler.json"), path.join(output, "wrangler.json"));
cpSync(path.join(source, "public"), path.join(output, "public"), {
  recursive: true,
});
const result = spawnSync(
  process.execPath,
  [
    path.join(root, "node_modules/wrangler/bin/wrangler.js"),
    "pages",
    "deploy",
    "--project-name",
    config.name,
    "--branch",
    "main",
  ],
  {
    cwd: output,
    stdio: "inherit",
    env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: target.accountId },
  },
);
if (result.error) throw result.error;
if (result.status !== 0) throw Error("Pages deployment failed.");
