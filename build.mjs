import { build } from "esbuild";
import { chmodSync } from "node:fs";

const outfile = "bin/index.js";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "esm",
  outfile,
  banner: { js: "#!/usr/bin/env node" },
  legalComments: "none",
  minify: false,
});

chmodSync(outfile, 0o755);
