"use client";

import { useEffect, useState } from "react";
import { listReports } from "../lib/api";
import { IconAlert } from "./Icons";
import { SEV_LABEL, formatDate, plural, timeAgo } from "../lib/format";

export default function ReportsList({ onOpen, onNewScan }) {
  const [reports, setReports] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listReports()
      .then((r) => setReports([...r].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))))
      .catch((e) => setError(`Could not load reports. ${e.message}`));
  }, []);

  return (
    <div className="stack-6">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <h1 className="t-h4">Reports</h1>
        <button type="button" className="btn btn-secondary" onClick={onNewScan}>New Scan</button>
      </div>

      {error && (
        <div className="callout callout-error" role="alert">
          <IconAlert />
          <div>{error}</div>
        </div>
      )}

      {!reports && !error && <div className="skeleton" style={{ height: 160 }} />}

      {reports && !reports.length && (
        <div className="card empty">
          <pre className="empty-art" aria-hidden="true">{"  .  :  .\n .:+*#*+:.\n  ':===:'"}</pre>
          <p className="t-label-m">No reports yet</p>
          <p className="t-body-s muted">Enter a repo URL or drop a folder to start your first scan.</p>
          <button type="button" className="btn btn-primary" onClick={onNewScan}>Start Scan</button>
        </div>
      )}

      {reports?.length > 0 && (
        <div className="card card-flush">
          <div className="list">
            {reports.map((r) => {
              const level = r.summary?.level;
              const total = Object.values(r.summary?.counts || {}).reduce((a, b) => a + b, 0);
              return (
                <button key={r.scanId} type="button" className="list-item" onClick={() => onOpen(r.scanId)}>
                  {level && <span className={`badge badge-${level}`} style={{ minWidth: 64, justifyContent: "center" }}>{SEV_LABEL[level] || level}</span>}
                  <div className="grow">
                    <div className="t-label-m mono break">{r.target}</div>
                    <div className="t-body-s muted">{plural(total, "finding")} · {r.source}</div>
                  </div>
                  <span className="t-body-s muted hide-md" title={formatDate(r.createdAt)}>{timeAgo(r.createdAt)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
