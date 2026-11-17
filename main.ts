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
//
// Before copying anything, the program validates the two things a broken checkout most
// often gets wrong — a missing game/index.html and a screenshots/ folder that is empty,
// oversized or holding a file over the gate's 256 KiB cap — and refuses with a plain
// message instead of handing in an entry the scorer would turn away unread.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const SCREENSHOT_MAX_BYTES = 262144; // the gate's 256 KiB per screenshot
const IMAGE_NAME = /\.(png|jpe?g)$/i;

function fail(message: string): never {
  throw new Error(`neon-tide entry: ${message}`);
}

function validateInputs(): void {
  const indexHtml = join(repoRoot, 'game', 'index.html');
  if (!existsSync(indexHtml) || !statSync(indexHtml).isFile()) {
    fail('game/index.html is missing — the game tree is incomplete.');
  }
  const shotsDir = join(repoRoot, 'screenshots');
  if (!existsSync(shotsDir)) fail('screenshots/ is missing — the gate requires 3 or 4 screenshots.');
  const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.') && IMAGE_NAME.test(name));
  if (shots.length < 3 || shots.length > 4) {
    fail(`screenshots/ holds ${shots.length} image(s); the gate requires 3 or 4.`);
  }
  for (const name of shots) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > SCREENSHOT_MAX_BYTES) {
      fail(`screenshots/${name} is ${size} bytes, over the gate's ${SCREENSHOT_MAX_BYTES}-byte cap.`);
    }
    if (size === 0) fail(`screenshots/${name} is empty.`);
  }
}

function copyTree(fromName: string, toName: string): void {
  const from = join(repoRoot, fromName);
  const to = join(outputDir, toName);
  mkdirSync(to, { recursive: true });
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

validateInputs();
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
