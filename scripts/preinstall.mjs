// Cross-platform preinstall guard.
// 1. Removes stray npm/yarn lockfiles so this stays a pnpm-only repo.
// 2. Warns (and blocks) if someone runs `npm install` / `yarn` instead of `pnpm install`.
import { existsSync, rmSync } from "node:fs";

for (const file of ["package-lock.json", "yarn.lock"]) {
  if (existsSync(file)) rmSync(file, { force: true });
}

const userAgent = process.env.npm_config_user_agent ?? "";
if (!userAgent.startsWith("pnpm/")) {
  console.error("Use pnpm instead (pnpm install) — this repo is a pnpm workspace.");
  process.exit(1);
}
