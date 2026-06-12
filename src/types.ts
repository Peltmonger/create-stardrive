export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export interface CliArgs {
  positional: string[];
  requestedVersion: string | undefined;
  skipInstall: boolean;
}
