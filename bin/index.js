#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync, spawnSync } from "node:child_process";

const args = process.argv.slice(2);

const skipInstall = args.includes("--no-install");

function parseFlag(name) {
  const eqIndex = args.findIndex((a) => a.startsWith(`${name}=`));

  if (eqIndex !== -1) {
    return args[eqIndex].slice(name.length + 1);
  }

  const i = args.indexOf(name);

  if (i !== -1 && args[i + 1] && !args[i + 1].startsWith("-")) {
    return args[i + 1];
  }

  return undefined;
}

const requestedVersion = parseFlag("--version") || parseFlag("-v");

const positional = args.filter((a, i) => {
  if (a.startsWith("-")) return false;
  const prev = args[i - 1];
  if (prev === "--version" || prev === "-v") return false;
  return true;
});

const projectName = positional[0] || "my-stardrive";
const targetDir = path.resolve(projectName);

function detectPackageManager() {
  const ua = process.env.npm_config_user_agent || "";

  if (ua.startsWith("pnpm")) return "pnpm";
  if (ua.startsWith("yarn")) return "yarn";
  if (ua.startsWith("bun")) return "bun";

  return "npm";
}

function commandExists(cmd) {
  return spawnSync(cmd, ["--version"], {
    stdio: "ignore",
  }).status === 0;
}

const pm = detectPackageManager();

if (!commandExists(pm)) {
  console.error(`${pm} is not installed`);
  process.exit(1);
}

if (fs.existsSync(targetDir)) {
  console.error(`Directory "${projectName}" already exists`);
  process.exit(1);
}

//
// Download template repo
//

const repo = "https://github.com/Peltmonger/stardrive.git";
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-app-"));

function normalizeTag(tag) {
  return tag.startsWith("v") ? tag : `v${tag}`;
}

function compareSemver(a, b) {
  const pa = a.replace(/^v/, "").split("-")[0].split(".").map(Number);
  const pb = b.replace(/^v/, "").split("-")[0].split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

function resolveTag() {
  const output = execSync(`git ls-remote --tags --refs ${repo}`, {
    encoding: "utf8",
  });

  const tags = output
    .split("\n")
    .map((line) => line.split("refs/tags/")[1])
    .filter(Boolean);

  if (requestedVersion) {
    const wanted = normalizeTag(requestedVersion);

    if (!tags.includes(wanted)) {
      console.error(`Version "${requestedVersion}" not found in ${repo}`);
      process.exit(1);
    }

    return wanted;
  }

  const stable = tags.filter((t) => /^v?\d+\.\d+\.\d+$/.test(t));

  if (stable.length === 0) {
    console.error(`No tagged releases found in ${repo}`);
    process.exit(1);
  }

  return stable.sort(compareSemver).pop();
}

const tag = resolveTag();

console.log(`\nCloning ${repo} at ${tag}...\n`);

execSync(`git clone --depth=1 --branch ${tag} ${repo} "${tempDir}"`, {
  stdio: "inherit",
});

fs.rmSync(path.join(tempDir, ".git"), {
  recursive: true,
  force: true,
});

fs.cpSync(tempDir, targetDir, {
  recursive: true,
});

//
// Remove files not needed in the generated project
//

[
  "scripts/syncVersion.js",
  "SECURITY.md",
  ".github",
].forEach((entry) => {
  fs.rmSync(path.join(targetDir, entry), {
    recursive: true,
    force: true,
  });
});

//
// Remove all lockfiles (should not be there, but just to be safe)
//

[
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
].forEach((file) => {
  fs.rmSync(path.join(targetDir, file), {
    force: true,
  });
});

//
// Update package.json
//

const packageJsonPath = path.join(targetDir, "package.json");

const pkg = JSON.parse(
  fs.readFileSync(packageJsonPath, "utf8")
);

pkg.name = projectName;

if (pkg.scripts) {
  delete pkg.scripts["sync-version"];
  delete pkg.scripts.prebuild;
}

if (pm === "pnpm") {
  pkg.packageManager = `pnpm@${execSync("pnpm --version")
    .toString()
    .trim()}`;
}

if (pm === "bun") {
  pkg.packageManager = `bun@${execSync("bun --version")
    .toString()
    .trim()}`;
}

fs.writeFileSync(
  packageJsonPath,
  JSON.stringify(pkg, null, 2)
);

//
// Install dependencies
//

if (!skipInstall) {
  console.log(`\nInstalling dependencies using ${pm}...\n`);

  execSync(`${pm} install`, {
    cwd: targetDir,
    stdio: "inherit",
  });
}

//
// Next steps
//

const devCommands = {
  npm: "npm run dev",
  pnpm: "pnpm dev",
  yarn: "yarn dev",
  bun: "bun run dev",
};

console.log(`
Done.

Next steps:

  cd ${projectName}
  ${devCommands[pm]}
`);
