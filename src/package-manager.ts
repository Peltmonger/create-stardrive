import { spawnSync } from "node:child_process";
import type { PackageManager } from "./types.js";

export function detectPackageManager(): PackageManager {
  const ua = process.env["npm_config_user_agent"] ?? "";

  if (ua.startsWith("pnpm")) return "pnpm";
  if (ua.startsWith("yarn")) return "yarn";
  if (ua.startsWith("bun")) return "bun";

  return "npm";
}

export function commandExists(cmd: string): boolean {
  return (
    spawnSync(cmd, ["--version"], {
      stdio: "ignore",
      shell: process.platform === "win32",
    }).status === 0
  );
}

export const devCommands: Record<PackageManager, string> = {
  npm: "npm run dev",
  pnpm: "pnpm dev",
  yarn: "yarn dev",
  bun: "bun run dev",
};
