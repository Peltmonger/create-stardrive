import { execSync } from "node:child_process";
import { fail } from "./logger.js";

export const STARDRIVE_REPO = "https://github.com/Peltmonger/stardrive.git";

export function normalizeTag(tag: string): string {
  return tag.startsWith("v") ? tag : `v${tag}`;
}

export function compareSemver(a: string, b: string): number {
  const pa = a.replace(/^v/, "").split("-")[0]!.split(".").map(Number);
  const pb = b.replace(/^v/, "").split("-")[0]!.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

export function resolveTag(requestedVersion: string | undefined): string {
  const output = execSync(`git ls-remote --tags --refs ${STARDRIVE_REPO}`, {
    encoding: "utf8",
  });

  const tags = output
    .split("\n")
    .map((line) => line.split("refs/tags/")[1])
    .filter((t): t is string => Boolean(t));

  if (requestedVersion) {
    const wanted = normalizeTag(requestedVersion);

    if (!tags.includes(wanted)) {
      fail(`Version "${requestedVersion}" not found in ${STARDRIVE_REPO}`);
      process.exit(1);
    }

    return wanted;
  }

  const stable = tags.filter((t) => /^v?\d+\.\d+\.\d+$/.test(t));

  if (stable.length === 0) {
    fail(`No tagged releases found in ${STARDRIVE_REPO}`);
    process.exit(1);
  }

  return stable.sort(compareSemver).pop()!;
}
