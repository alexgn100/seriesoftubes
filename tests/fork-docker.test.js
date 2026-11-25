// This fork's game image (Dockerfile: RUN node scripts/build.js) builds from the context .dockerignore lets in, an
// allow-list. When the build starts reading a new file (5.x read federation/ and relay/ for Multimode), the image breaks
// while every other test stays green. So: the context exactly as .dockerignore makes it, and the build run in it.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

test('the game image builds from what .dockerignore lets in, cloud sync and its server included', (t) => {
  const lines = fs.readFileSync(path.join(ROOT, '.dockerignore'), 'utf8').split('\n').filter((l) => l && !l.startsWith('#'));
  assert.equal(lines[0], '*', 'an allow-list');
  const allow = lines.slice(1).filter((l) => l.startsWith('!')).map((l) => l.slice(1));
  const tracked = execFileSync('git', ['ls-files', '-c'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }).split('\n').filter(Boolean);
  const inCtx = (f) => allow.some((p) => f === p || (p.endsWith('/') && f.startsWith(p)));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tubes-ctx-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const f of tracked.filter(inCtx)) {
    if (!fs.existsSync(path.join(ROOT, f))) continue;// deleted in the working tree, not yet committed
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  }
  // The sync image (docker/sync.Dockerfile) copies only server/sync.js; nginx needs its config.
  for (const f of ['server/sync.js', 'docker/nginx.conf']) assert.ok(fs.existsSync(path.join(dir, f)), `${f} is in the context`);
  const out = path.join(dir, '_site');
  const env = { ...process.env, OUT: out };
  delete env.VERSION;delete env.BUILD_DATE;delete env.AUTHORITY_KEY;// as docker build runs it: no release secrets
  execFileSync(process.execPath, ['scripts/build.js'], { cwd: dir, stdio: 'pipe', env });
  const v = JSON.parse(fs.readFileSync(path.join(out, 'version.json'), 'utf8'));
  assert.equal(v.version, require('../package.json').version);
  assert.match(fs.readFileSync(path.join(out, 'index.html'), 'utf8'), /sot-cloud/, 'cloud sync is in the page');
});
