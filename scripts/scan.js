// CLI: npm run scan -- <path> [--offline] [--no-ai] [--json]
import path from 'node:path';
import { readLocalDir } from '../src/ingest/local.js';
import { scan } from '../src/scanner.js';

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith('--'));
if (!target) {
  console.error('usage: npm run scan -- <path> [--offline] [--no-ai] [--json]');
  process.exit(1);
}

const files = await readLocalDir(path.resolve(target));
const started = Date.now();
const report = await scan(
  { source: 'local', target: `local:${target}`, files },
  { offline: args.includes('--offline'), ai: !args.includes('--no-ai') },
);

if (args.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const { stats, summary } = report;
  console.log(`\nCode-Muhafiz scan of ${report.target}  (${Date.now() - started} ms)`);
  console.log(`files ${stats.files} · manifests ${stats.manifests} · deps ${stats.dependencies} (${stats.direct} direct, ${stats.transitive} transitive)`);
  console.log(`RISK ${summary.score}/100 ${summary.level.toUpperCase()}  ` +
    Object.entries(summary.counts).map(([k, v]) => `${k}:${v}`).join(' '));
  for (const f of report.findings) {
    console.log(`  [${f.severity.padEnd(8)}] ${f.type.padEnd(15)} ${f.title}${f.file ? `  (${f.file}${f.line ? `:${f.line}` : ''})` : ''}`);
  }
  for (const w of report.warnings) console.log(`  warning: ${w}`);
  console.log(`\nAI (${report.ai.mode}, ${report.ai.model}):\n${report.ai.summary}`);
  console.log(`\nreportHash ${report.reportHash}`);
}
