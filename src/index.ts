import path from "node:path";
import { parseArgs } from "./args.js";
import { banner, c, fail, ok, step } from "./logger.js";
import {
  commandExists,
  detectPackageManager,
  devCommands,
} from "./package-manager.js";
import { configureFeatures } from "./features.js";
import { askProjectName } from "./project-name.js";
import { resolveTag } from "./release.js";
import {
  calibratePackageJson,
  cloneRepo,
  installDependencies,
  trimProject,
} from "./scaffold.js";

const { positional, requestedVersion, skipInstall } = parseArgs(process.argv);

const pm = detectPackageManager();

if (!commandExists(pm)) {
  fail(`${pm} is not installed`);
  process.exit(1);
}

console.log(banner);

const projectName = await askProjectName(positional[0]);
const targetDir = path.resolve(projectName);

step("Locating the latest Stardrive release");
const tag = resolveTag(requestedVersion);
ok(`Selected ${c.bold(tag)}`);

cloneRepo(tag, targetDir, projectName);
trimProject(targetDir);
calibratePackageJson(targetDir, projectName, pm);
await configureFeatures(targetDir);
installDependencies(targetDir, projectName, pm, skipInstall);

console.log(`
${c.green("All systems go.")} ${c.dim("Pre-flight checklist complete.")}

  ${c.dim("$")} ${c.cyan(`cd ${projectName}`)}
  ${c.dim("$")} ${c.cyan(devCommands[pm])}

${c.bold("Happy launching!")} ${c.magenta("🚀")}
`);
