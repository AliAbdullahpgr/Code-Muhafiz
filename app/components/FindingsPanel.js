"use client";

import { useMemo, useState } from "react";
import { IconChevron, IconExternal, IconInfo } from "./Icons";
import Markdown from "./Markdown";
import { explain } from "../lib/api";
import { SEVERITIES, SEV_RANK, SEV_LABEL, TYPE_LABEL, SOURCE_LABEL, AI_LABEL, plural } from "../lib/format";

function Finding({ finding, scanId, open, onToggle, toast }) {
  const [state, setState] = useState({ status: "idle" }); // idle | loading | done | error

  async function runExplain() {
    setState({ status: "loading" });
    try {
      const res = await explain(scanId, finding.id);
      setState({ status: "done", text: res.explanation, mode: res.mode });
    } catch (e) {
      setState({ status: "error", message: e.message });
      toast("Explanation failed");
    }
  }

  const where = finding.file ? `${finding.file}${finding.line ? `:${finding.line}` : ""}` : null;

  return (
    <li className="finding" data-sev={finding.severity}>
      <button type="button" className="finding-head" aria-expanded={open} aria-controls={`f-${finding.id}`} onClick={onToggle}>
        <span className={`badge badge-${finding.severity}`}>{SEV_LABEL[finding.severity]}</span>
        <span className="grow">
          <span className="t-label-m break" style={{ display: "block" }}>{finding.title}</span>
          <span className="t-mono-xs muted break" style={{ display: "block", marginTop: 4 }}>
            {TYPE_LABEL[finding.type] || finding.type}
            {finding.package ? ` · ${finding.package}${finding.version ? `@${finding.version}` : ""}` : ""}
          </span>
        </span>
        <IconChevron className="chev" />
      </button>

      {open && (
        <div className="finding-body stack-4" id={`f-${finding.id}`}>
          <p className="t-body-m break">{finding.description}</p>

          {finding.evidence && (
            <div>
              <div className="code-head t-mono-xs">
                <span className="break">{where || "Evidence"}</span>
              </div>
              <pre className="code">{finding.evidence}</pre>
            </div>
          )}

          <dl className="meta">
            {finding.fix && (
              <>
                <dt>Fix</dt>
                <dd className="break">{finding.fix}</dd>
              </>
            )}
            <dt>Detected By</dt>
            <dd>
              <span className="badge badge-outline">{SOURCE_LABEL[finding.source] || finding.source}</span>
              {finding.ruleId && <span className="t-mono-xs muted" style={{ marginLeft: 8 }}>{finding.ruleId}</span>}
            </dd>
            {finding.references?.length > 0 && (
              <>
                <dt>References</dt>
                <dd className="stack-2">
                  {finding.references.map((url) => (
                    <div key={url}>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="break row" style={{ display: "inline-flex", gap: 4 }}>
                        {url.replace(/^https?:\/\//, "")} <IconExternal size={12} />
                      </a>
                    </div>
                  ))}
                </dd>
              </>
            )}
          </dl>

          {state.status === "done" ? (
            <div className="explain stack-3">
              <div className="spread">
                <span className="t-label-s">Explained for a Junior Dev</span>
                <span className={`badge ${state.mode === "fallback" ? "badge-outline" : "badge-heat"}`}>{AI_LABEL[state.mode] || "Template"}</span>
              </div>
              <Markdown>{state.text}</Markdown>
            </div>
          ) : (
            <div className="row-wrap">
              <button type="button" className="btn btn-secondary btn-sm" onClick={runExplain} disabled={state.status === "loading"}>
                {state.status === "loading" ? (
                  <>
                    <span className="spinner spinner-sm" /> Explaining…
                  </>
                ) : (
                  "Explain Finding"
                )}
              </button>
              {state.status === "error" && (
                <span className="field-error">{state.message} Try again.</span>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function FindingsPanel({ report, toast }) {
  const [sev, setSev] = useState("all");
  const [type, setType] = useState("all");

  const sorted = useMemo(
    () => [...report.findings].sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]),
    [report.findings],
  );
  const [openId, setOpenId] = useState(() => sorted[0]?.id ?? null);

  const counts = report.summary?.counts || {};
  const types = [...new Set(report.findings.map((f) => f.type))];
  const shown = sorted.filter((f) => (sev === "all" || f.severity === sev) && (type === "all" || f.type === type));

  if (!report.findings.length) {
    return (
      <div className="callout callout-ok" role="status">
        <IconInfo />
        <div>
          <p className="t-label-m">No findings</p>
          <p className="muted">We found no known vulnerabilities, malicious packages, typosquats or suspicious code in what we could read.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stack-4">
      <div className="toolbar">
        <button type="button" className="chip" aria-pressed={sev === "all"} onClick={() => setSev("all")}>
          All <span className="count">{report.findings.length}</span>
        </button>
        {SEVERITIES.map((s) => (
          <button key={s} type="button" className="chip" aria-pressed={sev === s} onClick={() => setSev(s)} disabled={!counts[s]} style={!counts[s] ? { opacity: 0.5 } : undefined}>
            {SEV_LABEL[s]} <span className="count">{counts[s] || 0}</span>
          </button>
        ))}
        <div className="grow" />
        <label className="sr-only" htmlFor="type-filter">Filter by type</label>
        <select id="type-filter" className="input input-sm" style={{ width: 180 }} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>{TYPE_LABEL[t] || t}</option>
          ))}
        </select>
      </div>

      <p className="t-body-s muted" aria-live="polite">Showing {plural(shown.length, "finding")}</p>

      {shown.length ? (
        <ul className="stack-3" style={{ listStyle: "none", padding: 0 }}>
          {shown.map((f) => (
            <Finding
              key={f.id}
              finding={f}
              scanId={report.scanId}
              open={openId === f.id}
              onToggle={() => setOpenId(openId === f.id ? null : f.id)}
              toast={toast}
            />
          ))}
        </ul>
      ) : (
        <div className="card empty">
          <p className="t-label-m">No findings match these filters</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSev("all"); setType("all"); }}>
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}
