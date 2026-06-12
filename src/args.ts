import type { CliArgs } from "./types.js";

export function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  const skipInstall = args.includes("--no-install");

  const parseFlag = (name: string): string | undefined => {
    const eqIndex = args.findIndex((a) => a.startsWith(`${name}=`));
    if (eqIndex !== -1) {
      return args[eqIndex]!.slice(name.length + 1);
    }

    const i = args.indexOf(name);
    const next = args[i + 1];
    if (i !== -1 && next && !next.startsWith("-")) {
      return next;
    }

    return undefined;
  };

  const requestedVersion = parseFlag("--version") ?? parseFlag("-v");

  const positional = args.filter((a, i) => {
    if (a.startsWith("-")) return false;
    const prev = args[i - 1];
    if (prev === "--version" || prev === "-v") return false;
    return true;
  });

  return { positional, requestedVersion, skipInstall };
}
