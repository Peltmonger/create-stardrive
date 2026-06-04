#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { execSync, spawnSync } from "node:child_process";

const args = process.argv.slice(2);

const skipInstall = args.includes("--no-install");

//
// Pretty logging helpers
//

const supportsColor =
  output.isTTY && process.env.TERM !== "dumb" && !process.env.NO_COLOR;

const paint = (code, text) =>
  supportsColor ? `\x1b[${code}m${text}\x1b[0m` : text;

const c = {
  dim: (t) => paint("2", t),
  bold: (t) => paint("1", t),
  cyan: (t) => paint("36", t),
  magenta: (t) => paint("35", t),
  green: (t) => paint("32", t),
  yellow: (t) => paint("33", t),
  red: (t) => paint("31", t),
};

const banner = `
  ${c.magenta("★")} ${c.bold(c.cyan("Stardrive Launchpad"))} ${c.magenta("★")}
  ${c.dim("Fueling your next Astro project...")}
`;

let stepNum = 0;
const step = (msg) =>
  console.log(`\n${c.cyan(`[${++stepNum}]`)} ${c.bold(msg)}`);
const info = (msg) => console.log(`    ${c.dim(msg)}`);
const ok = (msg) => console.log(`    ${c.green("✓")} ${msg}`);
const fail = (msg) => console.error(`\n${c.red("✗")} ${msg}\n`);

//
// Argument parsing
//

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
  fail(`${pm} is not installed`);
  process.exit(1);
}

//
// Project name (interactive if not provided)
//

function isValidProjectName(name) {
  return /^[a-z0-9._-]+$/i.test(name) && !/^[._]/.test(name);
}

async function askProjectName(initial) {
  if (initial && isValidProjectName(initial)) {
    const targetDir = path.resolve(initial);
    if (!fs.existsSync(targetDir)) return initial;
    fail(`Directory "${initial}" already exists.`);
  }

  if (!input.isTTY) {
    fail(
      `Project name "${initial || ""}" is missing or invalid and stdin is not interactive.`
    );
    process.exit(1);
  }

  const rl = readline.createInterface({ input, output });

  try {
    while (true) {
      const answer = (
        await rl.question(
          `${c.cyan("?")} ${c.bold("Project name:")} ${c.dim("(my-stardrive) ")}`
        )
      ).trim();

      const name = answer || "my-stardrive";

      if (!isValidProjectName(name)) {
        console.log(
          `  ${c.yellow("!")} Use letters, digits, dots, dashes or underscores.`
        );
        continue;
      }

      const targetDir = path.resolve(name);

      if (fs.existsSync(targetDir)) {
        console.log(`  ${c.yellow("!")} "${name}" already exists. Try another.`);
        continue;
      }

      return name;
    }
  } finally {
    rl.close();
  }
}

console.log(banner);

const projectName = await askProjectName(positional[0]);
const targetDir = path.resolve(projectName);

//
// Resolve which tag to clone
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
      fail(`Version "${requestedVersion}" not found in ${repo}`);
      process.exit(1);
    }

    return wanted;
  }

  const stable = tags.filter((t) => /^v?\d+\.\d+\.\d+$/.test(t));

  if (stable.length === 0) {
    fail(`No tagged releases found in ${repo}`);
    process.exit(1);
  }

  return stable.sort(compareSemver).pop();
}

step("Locating the latest Stardrive release");
const tag = resolveTag();
ok(`Selected ${c.bold(tag)}`);

//
// Clone
//

step(`Beaming ${c.bold(tag)} down from orbit`);
info(repo);

execSync(
  `git -c advice.detachedHead=false clone --depth=1 --branch ${tag} --quiet ${repo} "${tempDir}"`,
  {
    stdio: ["ignore", "ignore", "inherit"],
  }
);

fs.rmSync(path.join(tempDir, ".git"), {
  recursive: true,
  force: true,
});

fs.cpSync(tempDir, targetDir, {
  recursive: true,
});
ok(`Landed in ${c.bold(projectName)}/`);

//
// Trim files not needed in the generated project
//

step("Trimming unused boosters");

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
ok("Stripped extras and stale lockfiles");

//
// Update package.json
//

step("Calibrating package.json");

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
ok(`Named your ship ${c.bold(projectName)}`);

//
// Install dependencies
//

if (!skipInstall) {
  step(`Loading dependencies with ${c.bold(pm)}`);

  execSync(`${pm} install`, {
    cwd: targetDir,
    stdio: "inherit",
  });
  ok("Engines online");
} else {
  step("Skipping dependency install");
  info(`Run "${pm} install" inside ${projectName}/ when you're ready.`);
}

//
// Lift off
//

const devCommands = {
  npm: "npm run dev",
  pnpm: "pnpm dev",
  yarn: "yarn dev",
  bun: "bun run dev",
};

console.log(`
${c.green("All systems go.")} ${c.dim("Pre-flight checklist complete.")}

  ${c.dim("$")} ${c.cyan(`cd ${projectName}`)}
  ${c.dim("$")} ${c.cyan(devCommands[pm])}

${c.bold("Happy launching!")} ${c.magenta("🚀")}
`);
