import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { c, fail } from "./logger.js";

export function isValidProjectName(name: string): boolean {
  return /^[a-z0-9._-]+$/i.test(name) && !/^[._]/.test(name);
}

export async function askProjectName(
  initial: string | undefined,
): Promise<string> {
  if (initial && isValidProjectName(initial)) {
    const targetDir = path.resolve(initial);
    if (!fs.existsSync(targetDir)) return initial;
    fail(`Directory "${initial}" already exists.`);
  }

  if (!input.isTTY) {
    fail(
      `Project name "${initial ?? ""}" is missing or invalid and stdin is not interactive.`,
    );
    process.exit(1);
  }

  const rl = readline.createInterface({ input, output });

  try {
    while (true) {
      const answer = (
        await rl.question(
          `${c.cyan("?")} ${c.bold("Project name:")} ${c.dim("(my-stardrive) ")}`,
        )
      ).trim();

      const name = answer || "my-stardrive";

      if (!isValidProjectName(name)) {
        console.log(
          `  ${c.yellow("!")} Use letters, digits, dots, dashes or underscores.`,
        );
        continue;
      }

      const targetDir = path.resolve(name);

      if (fs.existsSync(targetDir)) {
        console.log(
          `  ${c.yellow("!")} "${name}" already exists. Try another.`,
        );
        continue;
      }

      return name;
    }
  } finally {
    rl.close();
  }
}
