// GitHub ingest: repo URL → { target, files: [{ path, content }], warnings }.
import { config } from '../config.js';
import { isScannablePath, isManifestPath, MAX_FILE_BYTES } from './files.js';

const API = 'https://api.github.com';
const RAW = 'https://raw.githubusercontent.com';
const MAX_MANIFESTS = 200;
const MAX_SOURCES = 60;
const CONCURRENCY = 8;

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// 'owner/repo' | 'https://github.com/owner/repo(.git)' | '.../tree/<branch>' → { owner, repo, branch|null }
export function parseRepo(input) {
  let s = String(input || '').trim();
  if (!s) throw httpError('repo is required (owner/repo or GitHub URL)', 400);
  s = s.replace(/^git@github\.com:/i, '').replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '');
  s = s.replace(/[?#].*$/, '').replace(/\/+$/, '');
  const parts = s.split('/');
  if (parts.length < 2 || !parts[0] || !parts[1]) throw httpError(`Not a GitHub repo: ${input}`, 400);
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, '');
  const ok = /^[A-Za-z0-9-]+$/.test(owner) && /^[A-Za-z0-9._-]+$/.test(repo);
  if (!ok) throw httpError(`Not a GitHub repo: ${input}`, 400);
  let branch = null;
  if (parts[2] === 'tree' && parts.length > 3) branch = decodeURIComponent(parts.slice(3).join('/'));
  return { owner, repo, branch };
}

function headers(json = true) {
  const h = { 'User-Agent': 'code-muhafiz' };
  if (json) h.Accept = 'application/vnd.github+json';
  if (config.githubToken) h.Authorization = `Bearer ${config.githubToken}`;
  return h;
}

async function ghJson(url, what) {
  const res = await fetch(url, { headers: headers() });
  if (res.ok) return res.json();
  if (res.status === 404) throw httpError(`${what} not found (private or misspelled?)`, 404);
  if (res.status === 403 || res.status === 429) {
    throw httpError('GitHub API rate limit hit — set GITHUB_TOKEN in .env to raise the limit', res.status);
  }
  throw httpError(`GitHub API error ${res.status} for ${what}`, 502);
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const worker = async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export async function fetchGithubRepo(input, branchArg) {
  const { owner, repo, branch: urlBranch } = parseRepo(input);
  const slug = `${owner}/${repo}`;
  const warnings = [];

  const meta = await ghJson(`${API}/repos/${slug}`, `Repository ${slug}`);
  const branch = branchArg || urlBranch || meta.default_branch || 'main';

  const tree = await ghJson(
    `${API}/repos/${slug}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    `Branch '${branch}' of ${slug}`,
  );
  if (tree.truncated) warnings.push('GitHub tree listing was truncated (very large repo); some files were not scanned.');

  const blobs = (tree.tree || []).filter(
    (e) => e.type === 'blob' && isScannablePath(e.path) && (e.size ?? 0) <= MAX_FILE_BYTES,
  );
  const manifests = blobs.filter((e) => isManifestPath(e.path));
  const sources = blobs.filter((e) => !isManifestPath(e.path)).sort((a, b) => a.size - b.size);
  if (manifests.length > MAX_MANIFESTS) warnings.push(`Only the first ${MAX_MANIFESTS} of ${manifests.length} manifests were scanned.`);
  if (sources.length > MAX_SOURCES) warnings.push(`Scanned the ${MAX_SOURCES} smallest of ${sources.length} source files.`);
  const picked = [...manifests.slice(0, MAX_MANIFESTS), ...sources.slice(0, MAX_SOURCES)];

  let failed = 0;
  const ref = branch.split('/').map(encodeURIComponent).join('/');
  const results = await mapLimit(picked, CONCURRENCY, async (e) => {
    try {
      const path = e.path.split('/').map(encodeURIComponent).join('/');
      const res = await fetch(`${RAW}/${slug}/${ref}/${path}`, { headers: headers(false) });
      if (!res.ok) { failed++; return null; }
      return { path: e.path, content: await res.text() };
    } catch {
      failed++;
      return null;
    }
  });
  if (failed) warnings.push(`${failed} file(s) could not be downloaded from GitHub.`);

  return { target: `${slug}@${branch}`, files: results.filter(Boolean), warnings };
}
