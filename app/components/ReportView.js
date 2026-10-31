"use client";

import { useState } from "react";
import FindingsPanel from "./FindingsPanel";
import DependenciesPanel from "./DependenciesPanel";
import ProofPanel from "./ProofPanel";
import Markdown from "./Markdown";
import CopyButton from "./CopyButton";
import { IconAlert, IconPlus } from "./Icons";
import { SEV_LABEL, SEVERITIES, formatDate } from "../lib/format";

const LEVEL_COLOR = {
  safe: "var(--accent-forest)",
  low: "var(--accent-bluetron)",
  medium: "var(--accent-honey)",
  high: "var(--accent-crimson)",
  critical: "var(--accent-crimson)",
};

function ScoreCard({ summary }) {
  const { score, level, counts = {} } = summary;
  const R = 74;
  const C = 2 * Math.PI * R;
  return (
    <div className="card">
      <p className="t-label-s muted card-title">Risk Score</p>
      <div className="score-wrap" role="img" aria-label={`Risk score ${score} out of 100, ${level}`}>
        <svg width="168" height="168" viewBox="0 0 168 168">
          <circle cx="84" cy="84" r={R} fill="none" stroke="var(--alpha-6)" strokeWidth="10" />
          <circle
            cx="84" cy="84" r={R} fill="none"
            stroke={LEVEL_COLOR[level] || LEVEL_COLOR.low}
            strokeWidth="10" strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - Math.min(100, score) / 100)}
            style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)" }}
          />
        </svg>
        <div className="score-num">
          <span className="n">{score}</span>
          <span className={`badge badge-${level}`}>{SEV_LABEL[level] || level}</span>
        </div>
      </div>
      <div className="counts">
        {SEVERITIES.map((s) => (
          <div key={s} className="count-cell">
            <div className="n">{counts[s] || 0}</div>
            <div className="t-body-s muted">{SEV_LABEL[s]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="n">{value}</div>
      <div className="t-body-s muted">{label}</div>
    </div>
  );
}

export default function ReportView({ report, onReport, onNewScan, toast }) {
  const [tab, setTab] = useState("findings");
  const { stats = {}, ai, warnings = [] } = report;
  const ecosystems = Object.entries(stats.ecosystems || {}).map(([k, v]) => `${k} ${v}`).join(" · ");

  const tabs = [
    ["findings", "Findings", report.findings.length],
    ["dependencies", "Dependencies", report.dependencies.length],
    ["proof", "Proof", report.proof ? (report.proof.mode === "devnet" ? "Devnet" : "Simulated") : "None"],
  ];

  return (
    <div className="stack-6">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div style={{ minWidth: 0 }}>
          <p className="t-label-s muted">Scan Report</p>
          <h1 className="t-h5 break">{report.target}</h1>
          <p className="t-body-s muted row-wrap" style={{ marginTop: 4 }}>
            <span>{formatDate(report.createdAt)}</span>
            <span className="badge badge-outline">{report.source}</span>
            <span className="mono">{report.scanId}</span>
            <CopyButton value={report.scanId} label="scan ID" onCopied={toast} />
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onNewScan}>
          <IconPlus size={14} /> New Scan
        </button>
      </div>

      {warnings.length > 0 && (
        <div className="callout callout-warn" role="status">
          <IconAlert />
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
      )}

      <div className="report-grid">
        <ScoreCard summary={report.summary} />
        <div className="card">
          <div className="spread card-title">
            <p className="t-label-s muted">Summary</p>
            {ai && <span className={`badge ${ai.mode === "gemma" ? "badge-heat" : "badge-outline"}`}>{ai.mode === "gemma" ? `Gemma 4 · ${ai.model}` : "Template Summary"}</span>}
          </div>
          {ai?.summary ? <Markdown>{ai.summary}</Markdown> : <p className="muted">No summary was generated for this scan.</p>}
        </div>
      </div>

      <div className="stats">
        <Stat label="Files Read" value={stats.files ?? "—"} />
        <Stat label="Manifests" value={stats.manifests ?? "—"} />
        <Stat label="Dependencies" value={stats.dependencies ?? report.dependencies.length} />
        <Stat label="Direct" value={stats.direct ?? "—"} />
        <Stat label="Transitive" value={stats.transitive ?? "—"} />
        {ecosystems && <Stat label="Ecosystems" value={<span style={{ fontSize: 14, lineHeight: "32px" }}>{ecosystems}</span>} />}
      </div>

      <div className="stack-4">
        <div className="tabs-line" role="tablist" aria-label="Report sections">
          {tabs.map(([id, label, count]) => (
            <button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} className="tab-line" onClick={() => setTab(id)}>
              {label} <span className="count">{count}</span>
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === "findings" && <FindingsPanel report={report} toast={toast} />}
          {tab === "dependencies" && <DependenciesPanel report={report} />}
          {tab === "proof" && <ProofPanel report={report} onReport={onReport} toast={toast} />}
        </div>
      </div>
    </div>
  );
}
