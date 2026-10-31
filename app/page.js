"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "./components/Header";
import ScanForm from "./components/ScanForm";
import ScanProgress from "./components/ScanProgress";
import ReportView from "./components/ReportView";
import ReportsList from "./components/ReportsList";
import AsciiFlame from "./components/AsciiFlame";
import Toasts from "./components/Toasts";
import { saveLocalReport, findLocalReport } from "./lib/history";
import { health as fetchHealth, scanGithub, scanUpload, getReport, getSummary, onFallback } from "./lib/api";

const FEATURES = [
  ["Ingest", "Point it at a public repo or drop a folder. Lockfiles and node_modules give us the deep dependencies."],
  ["Detect", "OSV.dev, a Snowflake threat-intel table, typosquat checks, install scripts and suspicious code patterns."],
  ["Explain", "Gemma 4 turns raw advisories and code lines into what, why and how to fix. Claude Sonnet 5.5 steps in if Gemma is down."],
  ["Fingerprint", "Every report gets a SHA-256 hash of its findings, so you can tell if a saved result was changed."],
];

export default function Home() {
  const [view, setView] = useState("scan");
  const [phase, setPhase] = useState("idle"); // idle | scanning
  const [target, setTarget] = useState("");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [health, setHealth] = useState(null);
  const [theme, setTheme] = useState("light");
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || "light");
    fetchHealth().then(setHealth);
    return onFallback(() => setHealth((h) => (h && !h.mock ? { ...h, partial: true } : h)));
  }, []);

  useEffect(() => {
    if (report && report.ai?.mode !== "pending") saveLocalReport(report);
  }, [report]);

  const toast = useCallback((text) => {
    const id = Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode: theme just won't persist */
    }
    setTheme(next);
  }

  function goTo(next, reset) {
    setView(next);
    if (reset) {
      setReport(null);
      setError("");
    }
    window.scrollTo({ top: 0 });
  }

  // The API returns findings first; Gemma's summary arrives from a second call.
  async function loadSummary(scanId) {
    setReport((r) => (r?.scanId === scanId ? { ...r, ai: { mode: "pending", model: null, summary: "" } } : r));
    let ai;
    try {
      ai = await getSummary(scanId);
    } catch (e) {
      ai = { mode: "error", model: null, summary: `Could not write the summary. ${e.message}` };
    }
    setReport((r) => (r?.scanId === scanId ? { ...r, ai } : r));
  }

  async function runScan(label, call) {
    setError("");
    setTarget(label);
    setPhase("scanning");
    try {
      const r = await call();
      setReport(r);
      toast("Scan complete");
      if (r.ai?.mode === "pending") loadSummary(r.scanId);
    } catch (e) {
      setError(`Scan failed. ${e.message}`);
    } finally {
      setPhase("idle");
      window.scrollTo({ top: 0 });
    }
  }

  const onGithub = (repo, branch) =>
    runScan(branch ? `${repo}@${branch}` : repo, () => scanGithub(repo, branch));

  const onUpload = (name, project) =>
    runScan(`upload:${name}`, () => scanUpload(name, project.files));

  async function openReport(scanId) {
    try {
      // Server copy first: the local one may be stale (e.g. saved before Gemma's summary arrived).
      const r = await getReport(scanId).catch(() => findLocalReport(scanId));
      if (!r) throw new Error("Report not found");
      setReport(r);
      setView("scan");
      window.scrollTo({ top: 0 });
      if (r.ai?.mode === "pending") loadSummary(r.scanId);
    } catch (e) {
      toast("Could not open report");
    }
  }

  const showHero = view === "scan" && !report;

  return (
    <>
      <Header view={view} onView={goTo} health={health} theme={theme} onTheme={toggleTheme} />
      <main className="page">
        {showHero && (
          <>
            <section className="hero">
              <div className="container hero-inner">
                <span className="eyebrow">Dependency Trap Guard</span>
                <h1 className="sr-only">Code-Muhafiz</h1>
                <p className="lede t-body-l">Find poisoned packages and get every risk explained in plain language.</p>
                {phase === "scanning" ? (
                  <ScanProgress target={target} />
                ) : (
                  <ScanForm onGithub={onGithub} onUpload={onUpload} error={error} />
                )}
              </div>
              <AsciiFlame />
            </section>

            <section className="container section">
              <div className="features">
                {FEATURES.map(([title, body], i) => (
                  <div key={title} className="card card-compact feature">
                    <span className="mono num t-mono-xs">0{i + 1}</span>
                    <h2 className="t-label-l" style={{ marginTop: 8 }}>{title}</h2>
                    <p className="t-body-s muted" style={{ marginTop: 4 }}>{body}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {view === "scan" && report && (
          <section className="container section">
            <ReportView
              key={report.scanId}
              report={report}
                            onNewScan={() => goTo("scan", true)}
              onRetrySummary={() => loadSummary(report.scanId)}
              toast={toast}
            />
          </section>
        )}

        {view === "reports" && (
          <section className="container section">
            <ReportsList onOpen={openReport} onNewScan={() => goTo("scan", true)} />
          </section>
        )}

        <footer className="footer">
          <div className="container spread spread-sm t-body-s">
            <span>Code-Muhafiz · Hacktoberfest 2026 · Challenge 2</span>
            <span>MIT License</span>
          </div>
        </footer>
      </main>
      <Toasts items={toasts} />
    </>
  );
}
