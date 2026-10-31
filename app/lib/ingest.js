// Client-side folder filtering. Mirrors the server filter described in plan/ARCHITECTURE.md:
// manifests, node_modules/**/package.json and small source files. We only read text, never execute it.

const MANIFEST = /(^|\/)(package\.json|package-lock\.json|requirements[^/]*\.txt)$/i;
const NM_PACKAGE_JSON = /(^|\/)node_modules\/(@[^/]+\/)?[^/]+\/package\.json$/i;
const SOURCE = /\.(js|mjs|cjs|ts|py|sh)$/i;
const SKIP_DIR = /(^|\/)(\.git|\.next|\.venv|venv|__pycache__|dist|build|coverage)\//i;

export const MAX_FILE_BYTES = 200 * 1024;
export const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const BUDGET_BYTES = 20 * 1024 * 1024;

function priority(path) {
  if (MANIFEST.test(path) && !path.includes("node_modules/")) return 0;
  if (NM_PACKAGE_JSON.test(path)) return 1;
  if (SOURCE.test(path) && !path.includes("node_modules/")) return 2;
  if (SOURCE.test(path)) return 3;
  return -1;
}

// Items are { file: File, path: string } where path is relative to the project root.
export async function readProject(items) {
  const candidates = items
    .filter(({ path }) => !/(^|\/)\.git\//.test(path))
    .filter(({ path }) => path.includes("node_modules/") || !SKIP_DIR.test(path))
    .map((it) => ({ ...it, p: priority(it.path) }))
    .filter((it) => it.p >= 0)
    .filter((it) => it.file.size <= MAX_FILE_BYTES || (it.p <= 1 && it.file.size <= 5 * 1024 * 1024))
    .sort((a, b) => a.p - b.p);

  let used = 0;
  const picked = [];
  let skipped = 0;
  for (const it of candidates) {
    if (used + it.file.size > BUDGET_BYTES) {
      skipped++;
      continue;
    }
    used += it.file.size;
    picked.push(it);
  }

  const files = [];
  for (let i = 0; i < picked.length; i += 50) {
    const batch = picked.slice(i, i + 50);
    const texts = await Promise.all(batch.map((it) => it.file.text()));
    batch.forEach((it, j) => files.push({ path: it.path, content: texts[j] }));
  }

  return { files, bytes: used, scanned: items.length, skipped };
}

// From <input webkitdirectory>: paths look like "folder/sub/file.js".
export function itemsFromInput(fileList) {
  const all = Array.from(fileList);
  if (!all.length) return { name: "", items: [] };
  const name = (all[0].webkitRelativePath || "").split("/")[0] || "project";
  const items = all.map((file) => ({
    file,
    path: (file.webkitRelativePath || file.name).split("/").slice(1).join("/") || file.name,
  }));
  return { name, items };
}

// From drag-and-drop: walk FileSystemEntry trees.
export async function itemsFromDrop(dataTransfer) {
  const entries = Array.from(dataTransfer.items || [])
    .map((i) => i.webkitGetAsEntry?.())
    .filter(Boolean);
  if (!entries.length) return { name: "", items: [] };

  const items = [];
  const readAll = (reader) =>
    new Promise((resolve, reject) => {
      const out = [];
      const next = () =>
        reader.readEntries((batch) => {
          if (!batch.length) return resolve(out);
          out.push(...batch);
          next();
        }, reject);
      next();
    });

  async function walk(entry, prefix) {
    if (entry.isFile) {
      const file = await new Promise((res, rej) => entry.file(res, rej));
      items.push({ file, path: prefix + entry.name });
    } else if (entry.isDirectory) {
      if (entry.name === ".git") return;
      for (const child of await readAll(entry.createReader())) await walk(child, prefix + entry.name + "/");
    }
  }

  if (entries.length === 1 && entries[0].isDirectory) {
    const root = entries[0];
    for (const child of await readAll(root.createReader())) await walk(child, "");
    return { name: root.name, items };
  }
  for (const e of entries) await walk(e, "");
  return { name: "project", items };
}
