// Midnight at the Meridian Museum — heist game entrypoint.
//
// This script is the build step for the contest entry. It gathers the
// finished game and its screenshots into the output folder the grader
// expects, then asks the vendor helper to assemble the submission
// dossier (dossier.json) from whatever landed there.
//
// Run it from the repo root, e.g.:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// If MAKEFUN_OUTPUT_DIR is unset, the output goes to /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

// Where the finished artefacts should be placed. The grader usually
// points this at its own folder through the environment; the fallback
// keeps local runs working without any setup.
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

// Resolve the repo root from this file's own location, so the script
// works no matter which directory it is launched from.
const REPO_ROOT = fileURLToPath(new URL(".", import.meta.url));

// Limits handed to the dossier builder. These mirror the contest
// rules: how big the write-up may be, how many screenshots are kept
// and how large each may be, and how much game material is allowed.
const DOSSIER_OPTIONS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// Copy a directory tree when it exists, creating the destination first.
function copyTreeIfPresent(source: string, destination: string): void {
  if (!existsSync(source)) return;
  mkdirSync(destination, { recursive: true });
  cpSync(source, destination, { recursive: true });
}

function main(): void {
  // Fresh output tree.
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // The playable game goes under output/game/.
  copyTreeIfPresent(join(REPO_ROOT, "game"), join(OUTPUT_DIR, "game"));

  // Screenshots are optional on disk but the folder itself is expected,
  // so always create it and fill it when the repo has any.
  copyTreeIfPresent(
    join(REPO_ROOT, "screenshots"),
    join(OUTPUT_DIR, "screenshots"),
  );

  // Build the dossier from the staged output and write it out.
  const dossierText = buildDossier(OUTPUT_DIR, DOSSIER_OPTIONS);
  writeFileSync(join(OUTPUT_DIR, "dossier.json"), dossierText);
}

main();
