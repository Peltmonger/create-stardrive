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
  if (process.platform === "win32") {
    // `where` (always present as System32\where.exe) searches PATH and
    // respects PATHEXT, so it finds the `.cmd`/`.bat`/`.exe` shims that
    // npm/pnpm/yarn/bun install on Windows without actually executing
    // them. Spawning a `.cmd` shim through cmd.exe is unreliable because
    // the exit code doesn't always propagate from the nested wrapper.
    return spawnSync("where", [cmd], { stdio: "ignore" }).status === 0;
  }
  return (
    spawnSync(cmd, ["--version"], {
      stdio: "ignore",
    }).status === 0
  );
}

export const devCommands: Record<PackageManager, string> = {
  npm: "npm run dev",
  pnpm: "pnpm dev",
  yarn: "yarn dev",
  bun: "bun run dev",
};
