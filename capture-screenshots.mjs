import { spawn } from 'node:child_process';
import { readFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const shots = JSON.parse(await readFile(join(root, 'shots.json'), 'utf8'));
const chrome = '/home/hatch/.cache/puppeteer/chrome-headless-shell/linux-157.0.8103.78/chrome-headless-shell-linux64/chrome-headless-shell';
const temp = await mkdtemp(join(tmpdir(), 'neon-palms-'));
let server;
function run(command, args, opts = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd: root, ...opts });
    let stdout = '', stderr = '';
    child.stdout?.on('data', d => stdout += d);
    child.stderr?.on('data', d => stderr += d);
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolveRun({ stdout, stderr }) : reject(new Error(`${command} exited ${code}\n${stderr}`)));
  });
}
try {
  server = spawn('node', ['serve.ts', '--port', '8123'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let serverError = '';
  server.stderr.on('data', d => serverError += d);
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { const response = await fetch('http://localhost:8123/'); if (response.ok) { ready = true; break; } } catch {}
    if (server.exitCode !== null) throw new Error(`server exited early: ${serverError}`);
    await delay(100);
  }
  if (!ready) throw new Error(`server did not start: ${serverError}`);
  await mkdir(join(root, 'screenshots'), { recursive: true });
  for (const shot of shots) {
    const raw = join(temp, shot.name + '.png');
    const url = `http://localhost:8123/${shot.query.replace(/^\?/, '?')}`;
    const result = await run(chrome, ['--no-sandbox', '--hide-scrollbars', '--window-size=1280,800', '--virtual-time-budget=30000', `--screenshot=${raw}`, '--enable-logging=stderr', url]);
    if (result.stderr.includes('Uncaught')) { const line = result.stderr.split('\n').find(x => x.includes('Uncaught')); process.stderr.write(`${shot.name}: ${line}\n`); process.exitCode = 1; break; }
    let q = 4;
    while (true) {
      await run('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-q:v', String(q), '-vf', 'scale=1280:800', '-frames:v', '1', join(root, 'screenshots', shot.name)]);
      const { stat } = await import('node:fs/promises');
      const bytes = (await stat(join(root, 'screenshots', shot.name))).size;
      if (bytes < 250 * 1024) { process.stdout.write(`${shot.name} ${bytes}\n`); break; }
      q++;
      if (q > 31) throw new Error(`${shot.name} cannot be reduced below 250 KiB`);
    }
  }
} finally {
  if (server && server.exitCode === null) { server.kill('SIGTERM'); await new Promise(resolveStop => server.once('close', resolveStop)); }
  await rm(temp, { recursive: true, force: true });
}
