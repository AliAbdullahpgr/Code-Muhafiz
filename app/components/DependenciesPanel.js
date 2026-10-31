"use client";

import { useMemo, useState } from "react";
import { SEV_RANK, SEV_LABEL, plural } from "../lib/format";

const PAGE = 100;

export default function DependenciesPanel({ report }) {
  const [q, setQ] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [directOnly, setDirectOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  // Worst severity per name@version, so flagged rows carry a label (not color alone).
  const worst = useMemo(() => {
    const map = new Map();
    for (const f of report.findings) {
      if (!f.package) continue;
      const key = `${f.package}@${f.version ?? ""}`;
      const prev = map.get(key);
      if (!prev || SEV_RANK[f.severity] < SEV_RANK[prev.sev]) map.set(key, { sev: f.severity, n: (prev?.n || 0) + 1 });
      else prev.n++;
    }
    return map;
  }, [report.findings]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return report.dependencies
      .map((d) => ({ ...d, flag: worst.get(`${d.name}@${d.version}`) }))
      .filter((d) => (!term || d.name.toLowerCase().includes(term)) && (!flaggedOnly || d.flag) && (!directOnly || d.direct))
      .sort((a, b) => (a.flag ? SEV_RANK[a.flag.sev] : 9) - (b.flag ? SEV_RANK[b.flag.sev] : 9) || a.name.localeCompare(b.name));
  }, [report.dependencies, worst, q, flaggedOnly, directOnly]);

  return (
    <div className="stack-4">
      <div className="toolbar">
        <label className="sr-only" htmlFor="dep-search">Search dependencies</label>
        <input
          id="dep-search"
          type="search"
          className="input input-sm"
          style={{ maxWidth: 280 }}
          placeholder="Search packages…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }}
        />
        <button type="button" className="chip" aria-pressed={flaggedOnly} onClick={() => setFlaggedOnly((v) => !v)}>Flagged Only</button>
        <button type="button" className="chip" aria-pressed={directOnly} onClick={() => setDirectOnly((v) => !v)}>Direct Only</button>
        <span className="t-body-s muted" style={{ marginLeft: "auto" }} aria-live="polite">{plural(rows.length, "package")}</span>
      </div>

      <div className="card card-flush">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Package</th>
                <th scope="col">Version</th>
                <th scope="col">Range</th>
                <th scope="col">Type</th>
                <th scope="col">Ecosystem</th>
                <th scope="col">Source File</th>
                <th scope="col">Risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((d) => (
                <tr key={`${d.ecosystem}:${d.name}@${d.version}:${d.file}`}>
                  <td className="mono break">{d.name}</td>
                  <td className="mono">{d.version}</td>
                  <td className="mono muted">{d.range}</td>
                  <td>
                    {d.direct ? "Direct" : `Transitive${d.depth ? ` · depth ${d.depth}` : ""}`}
                    {d.dev && <span className="badge badge-outline" style={{ marginLeft: 8 }}>Dev</span>}
                  </td>
                  <td>{d.ecosystem}</td>
                  <td className="mono muted break">{d.file}</td>
                  <td>
                    {d.flag ? (
                      <span className={`badge badge-${d.flag.sev}`}>{SEV_LABEL[d.flag.sev]} · {d.flag.n}</span>
                    ) : (
                      <span className="faint">None</span>
                    )}
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="muted" style={{ textAlign: "center", padding: 32 }}>
                    No packages match. Clear the search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rows.length > limit && (
        <div style={{ textAlign: "center" }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLimit((l) => l + PAGE)}>
            Show {Math.min(PAGE, rows.length - limit)} More Packages
          </button>
        </div>
      )}
    </div>
  );
}
