// Neon Bay Cover Studio — the entry program for make.fun bounty gta6-cover-art-01.
//
// Node 22, standard library only. It hands the app in: it copies this repository's
// app/ and screenshots/ folders into /output and writes /output/dossier.json, the
// summary the judge reads, using the vendored make.fun library
// (vendor/makefun-app.ts, unchanged from the kit).
//
// Run it outside the grader's container with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Inside the grader, MAKEFUN_OUTPUT_DIR is unset and /output is used instead.

import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Copies a directory tree (files and subdirectories, no symlinks) into a target. */
function copyTree(source, target) {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source)) {
    const from = join(source, entry);
    const to = join(target, entry);
    if (statSync(from).isDirectory()) {
      copyTree(from, to);
    } else {
      copyFileSync(from, to);
    }
  }
}

mkdirSync(outputDir, { recursive: true });
copyTree(join(repoRoot, 'app'), join(outputDir, 'app'));
if (existsSync(join(repoRoot, 'screenshots'))) {
  copyTree(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));
}

// The scorer's caps (from the kit's reference/gate.json): text_max_bytes shapes the
// dossier text; the other caps refuse an entry the scorer would refuse — more than
// 4 screenshots or one over 256 KiB, more than 993 app files or 48 MiB of app files
// in all, or an app path over 1000 bytes.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(`Neon Bay Cover Studio handed in to ${outputDir}`);
