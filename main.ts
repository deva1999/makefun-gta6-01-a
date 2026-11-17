// Neon Tide: Solmar Bay — make.fun entrypoint.
// Copies game/ and screenshots/ into $MAKEFUN_OUTPUT_DIR (default /output)
// and writes a deterministic dossier.json beside them.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const MAX_SHOT_BYTES = 256 * 1024;
const root = import.meta.dirname;
const gameDir = join(root, 'game');
const shotsDir = join(root, 'screenshots');
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function fail(message: string): never {
  console.error('main.ts: ' + message);
  process.exit(1);
}

// Pre-flight validation: fail early, before copying anything.
if (!existsSync(join(gameDir, 'index.html'))) {
  fail('game/index.html is missing — the game cannot be packaged.');
}
if (!existsSync(shotsDir)) {
  fail('screenshots/ is missing — 3 to 4 screenshots are required.');
}
const shotNames = readdirSync(shotsDir)
  .filter((name: string) => /\.(png|jpe?g|webp)$/i.test(name))
  .sort();
if (shotNames.length < 3 || shotNames.length > 4) {
  fail('screenshots/ must hold exactly 3-4 images; found ' + shotNames.length + '.');
}
for (const name of shotNames) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > MAX_SHOT_BYTES) {
    fail('screenshot ' + name + ' is ' + size + ' bytes, over the 256 KiB cap.');
  }
}

mkdirSync(outDir, { recursive: true });
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 2 * 1024 * 1024,
  screenshots: { max: 4, max_bytes: MAX_SHOT_BYTES },
  game_max_files: 64,
  game_max_bytes: 4 * 1024 * 1024,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log('main.ts: packaged Neon Tide: Solmar Bay into ' + outDir + ' (' + shotNames.length + ' screenshots, dossier ' + dossier.length + ' bytes)');
