// Neon Bay entry program for make.fun gta6-01.
// Copies game/ and screenshots/ beside this file into the output directory
// and writes /output/dossier.json with buildDossier from the kit's vendored
// library. Node 22, standard library only, no network, deterministic.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });

const gameSrc = join(here, 'game');
if (existsSync(gameSrc)) cpSync(gameSrc, join(out, 'game'), { recursive: true });

const shotsSrc = join(here, 'screenshots');
if (existsSync(shotsSrc)) cpSync(shotsSrc, join(out, 'screenshots'), { recursive: true });

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);
