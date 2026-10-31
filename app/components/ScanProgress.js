"use client";

import { useEffect, useState } from "react";
import { IconCheck } from "./Icons";

const STEPS = [
  ["Ingesting Files…", "Reading manifests and source text"],
  ["Parsing Dependencies…", "Direct and transitive, from lockfiles"],
  ["Detecting Risks…", "OSV.dev, threat intel, typosquats, install scripts, code patterns"],
  ["Explaining With Gemma…", "Writing a plain-language summary"],
  ["Recording Proof…", "Hashing the report and signing it as the agent"],
];

// The scan API is a single request, so these stages are paced client-side.
// They hold on the last stage until the response arrives.
export default function ScanProgress({ target }) {
  const [active, setActive] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => Math.min(a + 1, STEPS.length - 1)), 1800);
    const slowTimer = setTimeout(() => setSlow(true), 15000);
    return () => {
      clearInterval(t);
      clearTimeout(slowTimer);
    };
  }, []);

  return (
    <div className="card scan-card stack-4" role="status" aria-live="polite">
      <div>
        <p className="t-label-l">Scanning</p>
        <p className="t-mono-s muted break">{target}</p>
      </div>
      <div className="bar" aria-hidden="true">
        <span style={{ width: `${((active + 0.5) / STEPS.length) * 100}%` }} />
      </div>
      <ol className="steps">
        {STEPS.map(([title, detail], i) => {
          const state = i < active ? "done" : i === active ? "active" : "todo";
          return (
            <li key={title} className="step" data-state={state}>
              <span className="step-mark">
                {state === "done" ? <IconCheck size={12} strokeWidth={2.5} /> : state === "active" ? <span className="spinner spinner-sm" /> : null}
              </span>
              <div className="grow">
                <div className="t-label-m">{title}</div>
                {state === "active" && <div className="t-body-s muted">{detail}</div>}
              </div>
            </li>
          );
        })}
      </ol>
      {slow && (
        <p className="t-body-s muted">This is taking longer than usual. Gemma may be slow, and the scan falls back to a template summary if it times out.</p>
      )}
    </div>
  );
}
