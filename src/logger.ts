import { stdout as output } from "node:process";

const supportsColor =
  output.isTTY && process.env["TERM"] !== "dumb" && !process.env["NO_COLOR"];

const paint = (code: string, text: string): string =>
  supportsColor ? `\x1b[${code}m${text}\x1b[0m` : text;

export const c = {
  dim: (t: string) => paint("2", t),
  bold: (t: string) => paint("1", t),
  cyan: (t: string) => paint("36", t),
  magenta: (t: string) => paint("35", t),
  green: (t: string) => paint("32", t),
  yellow: (t: string) => paint("33", t),
  red: (t: string) => paint("31", t),
};

export const banner = `
  ${c.magenta("★")} ${c.bold(c.cyan("Stardrive Launchpad"))} ${c.magenta("★")}
  ${c.dim("Fueling your next Astro project...")}
`;

let stepNum = 0;

export const step = (msg: string): void => {
  console.log(`\n${c.cyan(`[${++stepNum}]`)} ${c.bold(msg)}`);
};

export const info = (msg: string): void => {
  console.log(`    ${c.dim(msg)}`);
};

export const ok = (msg: string): void => {
  console.log(`    ${c.green("✓")} ${msg}`);
};

export const fail = (msg: string): void => {
  console.error(`\n${c.red("✗")} ${msg}\n`);
};
