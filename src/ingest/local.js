// Walk a local directory (CLI / fixtures) and return scannable files as text. Never executes anything.
import fs from 'node:fs/promises';
import path from 'node:path';
import { filterFiles, isScannablePath, MAX_FILE_BYTES } from './files.js';

export async function readLocalDir(root) {
  const files = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const rel = path.relative(root, abs).split(path.sep).join('/');
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === '.next') continue;
        await walk(abs);
      } else if (entry.isFile() && isScannablePath(rel)) {
        const stat = await fs.stat(abs);
        if (stat.size <= MAX_FILE_BYTES) files.push({ path: rel, content: await fs.readFile(abs, 'utf8') });
      }
    }
  }
  await walk(root);
  return filterFiles(files);
}
