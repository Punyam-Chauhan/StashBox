import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Prefer a locally installed Playwright; Codex's bundled runtime is the fallback.
const localRequire = createRequire(import.meta.url);
let playwright;
try {
  playwright = localRequire("playwright");
} catch {
  const runtimeRequire = createRequire(
    path.join(
      homedir(),
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/",
    ),
  );
  playwright = runtimeRequire("playwright");
}
export const { chromium } = playwright;
export const browserExecutable =
  process.env.STASHBOX_BROWSER_EXECUTABLE ||
  fileURLToPath(
    new URL(
      "../../.sites-runtime/browsers/chromium-1234/chrome-win64/chrome.exe",
      import.meta.url,
    ),
  );
