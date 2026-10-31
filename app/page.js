'use client';

import { useState } from 'react';
import { isScannablePath, MAX_FILE_BYTES } from '../src/ingest/files.js';

// Minimal UI: pick a folder → findings appear in seconds → Gemma 4 summary streams in after.
export default function Home() {
  const [status, setStatus] = useState('');
  const [report, setReport] = useState(null);
  const [ai, setAi] = useState(null);

  async function onPick(event) {
    const picked = Array.from(event.target.files || []);
    if (picked.length === 0) return;
    setReport(null);
    setAi(null);

    // webkitRelativePath is "folder/sub/file"; drop the top folder so paths are repo-relative.
    const name = picked[0].webkitRelativePath.split('/')[0];
    const chosen = picked
      .map((f) => ({ file: f, path: f.webkitRelativePath.split('/').slice(1).join('/') }))
      .filter(({ file, path }) => isScannablePath(path) && file.size <= MAX_FILE_BYTES);
    setStatus(`Reading ${chosen.length} files…`);
    const files = await Promise.all(chosen.map(async ({ file, path }) => ({ path, content: await file.text() })));

    setStatus('Scanning dependencies…');
    const res = await fetch('/api/scan/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, files }),
    });
    const data = await res.json();
    if (!res.ok) return setStatus(`Error: ${data.error}`);
    setReport(data);

    setStatus('Gemma 4 is writing the explanation (can take up to a minute)…');
    const sres = await fetch('/api/summary', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scanId: data.scanId }),
    });
    const sdata = await sres.json();
    setAi(sres.ok ? sdata : { mode: 'error', model: '-', summary: sdata.error });
    setStatus('');
  }

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Code-Muhafiz</h1>
      <p>Gemma 4 reads your dependencies so you don&apos;t have to.</p>
      <label>
        Upload a project folder:{' '}
        <input type="file" webkitdirectory="" directory="" multiple onChange={onPick} />
      </label>
      {status && <p><em>{status}</em></p>}

      {report && (
        <section>
          <h2>
            Risk {report.summary.score}/100 — {report.summary.level.toUpperCase()}
          </h2>
          <p>
            {report.stats.files} files · {report.stats.dependencies} dependencies ({report.stats.direct} direct,{' '}
            {report.stats.transitive} transitive) · {report.findings.length} findings
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr><th align="left">Severity</th><th align="left">Type</th><th align="left">Finding</th><th align="left">Where</th></tr>
            </thead>
            <tbody>
              {report.findings.map((f) => (
                <tr key={f.id} style={{ borderTop: '1px solid #ddd' }}>
                  <td>{f.severity}</td>
                  <td>{f.type}</td>
                  <td>{f.title}{f.fix ? <><br /><small>Fix: {f.fix}</small></> : null}</td>
                  <td><code>{f.file}{f.line ? `:${f.line}` : ''}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.warnings.length > 0 && <p><small>Warnings: {report.warnings.join('; ')}</small></p>}
        </section>
      )}

      {ai && (
        <section>
          <h2>Gemma 4 explanation <small>({ai.mode}, {ai.model})</small></h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{ai.summary}</pre>
        </section>
      )}
      {report && <p><small>Report hash: <code>{report.reportHash}</code></small></p>}
    </main>
  );
}
