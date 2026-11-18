// Package the browser game and its screenshots, build the make.fun dossier, then report a
// content-derived inventory. Run locally with: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// To play locally, run `node serve.ts` and open http://localhost:8080 in a desktop browser.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
writeFileSync(join(out, 'dossier.json'), buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
}));

function inventory(dir) {
  const files=[];
  for (const name of readdirSync(dir).sort()) {
    const path=join(dir,name), stat=statSync(path);
    if(stat.isDirectory()) files.push(...inventory(path)); else files.push(path);
  }
  return files;
}
const gameFiles=inventory(join(out,'game'));
const screenshots=inventory(join(out,'screenshots')).map(path=>({name:relative(join(out,'screenshots'),path).split('\\').join('/'),bytes:readFileSync(path).byteLength}));
const warnings=[];
if(screenshots.length<3) warnings.push(`Expected at least 3 screenshots; found ${screenshots.length}.`);
const summary={gameFiles:gameFiles.length,gameBytes:gameFiles.reduce((sum,path)=>sum+readFileSync(path).byteLength,0),screenshots,dossierBytes:readFileSync(join(out,'dossier.json')).byteLength};
if(warnings.length) summary.warnings=warnings;
process.stdout.write(`${JSON.stringify(summary)}\n`);
