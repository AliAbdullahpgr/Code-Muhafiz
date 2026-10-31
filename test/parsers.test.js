import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseDependencies, isManifest } from '../src/parsers/index.js';
import { parseRequirements } from '../src/parsers/pip.js';
import { minVersion } from '../src/parsers/npm.js';

const ROOT = new URL('./fixtures/trap-app/', import.meta.url);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const rootPath = ROOT.pathname.replace(/^\/([A-Za-z]:)/, '$1');
const files = walk(rootPath)
  .map((full) => ({ path: relative(rootPath, full).replace(/\\/g, '/'), full }))
  .filter((f) => isManifest(f.path))
  .map((f) => ({ path: f.path, content: readFileSync(f.full, 'utf8') }));

const deps = parseDependencies(files);
const find = (name, eco = 'npm') => deps.find((d) => d.name === name && d.ecosystem === eco);

test('isManifest routes by basename', () => {
  assert.ok(isManifest('package.json'));
  assert.ok(isManifest('a/b/package-lock.json'));
  assert.ok(isManifest('requirements-dev.txt'));
  assert.ok(!isManifest('src/telemetry.js'));
});

test('direct npm deps from package.json + lockfile', () => {
  for (const [name, version] of [['lodash', '4.17.15'], ['event-stream', '3.3.6'], ['crossenv', '6.1.1'], ['express', '4.18.2']]) {
    const d = find(name);
    assert.ok(d, `${name} missing`);
    assert.equal(d.version, version);
    assert.equal(d.direct, true);
    assert.equal(d.depth, 0);
  }
});

test('transitive deps from lockfile v3 with depth', () => {
  const fm = find('flatmap-stream');
  assert.equal(fm.version, '0.1.1');
  assert.equal(fm.direct, false);
  assert.equal(fm.depth, 1);
  const dbg = find('debug');
  assert.equal(dbg.version, '2.6.9');
  assert.equal(dbg.depth, 1);
});

test('dedupe: one entry per ecosystem+name+version', () => {
  const keys = deps.map((d) => `${d.ecosystem}:${d.name}@${d.version}`);
  assert.equal(new Set(keys).size, keys.length);
});

test('PyPI deps from requirements.txt', () => {
  assert.equal(find('requests', 'PyPI').version, '2.19.0');
  assert.equal(find('reqeusts', 'PyPI').version, '1.0.0');
  assert.equal(find('flask', 'PyPI').version, '2.0');
});

test('requirements edge cases', () => {
  const r = parseRequirements('# c\n-r base.txt\n-e .\n--index-url x\nDjango[argon2]>=3.2,<4 ; python_version>"3"\nfoo<=1.0\nbar\n', 'r.txt');
  assert.deepEqual(r.map((d) => [d.name, d.version]), [['django', '3.2'], ['foo', ''], ['bar', '']]);
});

test('bad JSON file is skipped, not fatal', () => {
  const out = parseDependencies([{ path: 'package.json', content: '{nope' }, { path: 'requirements.txt', content: 'six==1.0' }]);
  assert.equal(out.length, 1);
});

test('minVersion', () => {
  assert.equal(minVersion('^4.17.15'), '4.17.15');
  assert.equal(minVersion('~1.2'), '1.2.0');
  assert.equal(minVersion('>=2.0.0 <3'), '2.0.0');
  assert.equal(minVersion('*'), '');
});
