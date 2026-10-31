"use client";

import { Logo, IconSun, IconMoon } from "./Icons";

const VIEWS = [
  ["scan", "Scan"],
  ["reports", "Reports"],
];

export function StatusPills({ health }) {
  if (!health) return null;
  return (
    <>
      <span className="pill-status" data-state={health.aiEnabled ? "on" : "warn"} title={health.aiEnabled ? health.ai : "No AI key set. Using template explanations"}>
        <span className="dot" />
        {health.aiEnabled ? "Gemma 4" : "Template AI"}
      </span>
      {health.anthropic && (
        <span className="pill-status" data-state="on" title={`Fallback when Gemma fails: ${health.anthropicModel}`}>
          <span className="dot" />
          Claude Fallback
        </span>
      )}
      <span className="pill-status" data-state={health.snowflake ? "on" : "warn"} title={health.snowflake ? "Live Snowflake threat intel" : "Using local snapshot"}>
        <span className="dot" />
        {health.snowflake ? "Snowflake" : "Snapshot Intel"}
      </span>
    </>
  );
}

export default function Header({ view, onView, health, theme, onTheme }) {
  return (
    <header className="header">
      <div className="container header-inner">
        <button type="button" className="brand" onClick={() => onView("scan", true)} aria-label="Code-Muhafiz home">
          <Logo />
          <span>Code-Muhafiz</span>
        </button>

        <nav className="nav" aria-label="Primary">
          {VIEWS.map(([id, label]) => (
            <button key={id} type="button" className="nav-link" aria-current={view === id ? "page" : undefined} onClick={() => onView(id)}>
              {label}
            </button>
          ))}
        </nav>

        <div className="header-right">
          {(health?.mock || health?.partial) && (
            <span className="badge badge-special" title={health.mock ? "The backend at /api is not reachable. Showing sample data." : "Some API routes are not built yet. Those parts show sample data."}>
              Demo Data
            </span>
          )}
          <div className="row hide-md">
            <StatusPills health={health} />
          </div>
          <button type="button" className="btn btn-tertiary btn-icon" onClick={onTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
            {theme === "dark" ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </div>
    </header>
  );
}
