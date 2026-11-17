// Neon Tide: Solmar Bay — the make.fun gta6-01 entrypoint (Node 22, standard library
// only). The game itself is the static site in game/ (open game/index.html in a browser,
// no build step, no network). This program hands the entry in: it copies game/ and
// screenshots/ from beside this file into the output directory and writes dossier.json
// there with buildDossier from the vendored make.fun library, using the scorer's caps.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// MAKEFUN_OUTPUT_DIR stands in for /output outside the grader; when it is unset the
// program writes to /output, as the grader expects.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(fromName: string, toName: string): void {
  const from = join(repoRoot, fromName);
  const to = join(outputDir, toName);
  mkdirSync(to, { recursive: true });
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyTree('game', 'game');
copyTree('screenshots', 'screenshots');

// The caps come from the competition's gate: the dossier text budget shapes the bytes,
// the rest refuse an entry the scorer would refuse anyway (over 4 screenshots, one over
// 256 KiB, a game/ tree over 993 entries or 48 MiB, or a path over 1,000 bytes).
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
