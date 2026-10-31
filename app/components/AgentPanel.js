"use client";

import { useCallback, useEffect, useState } from "react";
import CopyButton from "./CopyButton";
import { IconExternal, IconKey, IconAlert, IconRefresh } from "./Icons";
import { getAgent, getHistory, registerAgent } from "../lib/api";
import { explorerAddress, explorerTx, formatDate, shorten } from "../lib/format";

function memoLabel(memo) {
  try {
    const m = JSON.parse(memo);
    if (m.t === "audit") return { kind: "Audit", detail: `${m.target || m.scan} · ${m.risk || ""}`.trim() };
    if (m.t === "agent_register") return { kind: "Registration", detail: m.name || "agent" };
  } catch {
    /* not JSON */
  }
  return { kind: "Memo", detail: memo ? shorten(memo, 40, 0) : "" };
}

export default function AgentPanel({ toast }) {
  const [agent, setAgent] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const [a, h] = await Promise.all([getAgent(), getHistory().catch(() => [])]);
      setAgent(a);
      setHistory(h);
    } catch (e) {
      setError(`Could not load the agent. ${e.message}`);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function register() {
    setBusy(true);
    try {
      setAgent(await registerAgent());
      setHistory(await getHistory().catch(() => []));
      toast("Agent registered");
    } catch (e) {
      setError(`Registration failed. ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  const devnet = agent?.mode === "devnet";

  return (
    <div className="stack-6">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="t-h4">Agent</h1>
          <p className="t-body-m muted" style={{ marginTop: 8, maxWidth: 560 }}>
            Every scan is signed by one on-chain identity. Its history is a public, tamper-evident record of what it has audited.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={load}>
          <IconRefresh size={14} /> Refresh Agent
        </button>
      </div>

      {error && (
        <div className="callout callout-error" role="alert">
          <IconAlert />
          <div>{error}</div>
        </div>
      )}

      {!agent && !error && <div className="skeleton" style={{ height: 220 }} />}

      {agent && (
        <div className="card stack-6">
          <div className="spread">
            <div className="row">
              <span className="dropzone-icon"><IconKey size={20} /></span>
              <div>
                <p className="t-label-l">Code-Muhafiz Agent</p>
                <p className="t-body-s muted">Identity and registration</p>
              </div>
            </div>
            <div className="row">
              <span className={`badge ${devnet ? "badge-ok" : "badge-warn"}`}>{devnet ? "Solana Devnet" : "Simulated"}</span>
              <span className={`badge ${agent.registered ? "badge-ok" : "badge-outline"}`}>{agent.registered ? "Registered" : "Not Registered"}</span>
            </div>
          </div>

          <dl className="kv">
            <dt>Public Key</dt>
            <dd>
              <span className="kbd-copy">
                {agent.publicKey ? (
                  <a className="mono break" href={explorerAddress(agent.publicKey)} target="_blank" rel="noopener noreferrer">{agent.publicKey}</a>
                ) : (
                  <span className="muted">No keypair found. Run npm run keygen</span>
                )}
                {agent.publicKey && <CopyButton value={agent.publicKey} label="public key" onCopied={toast} />}
              </span>
            </dd>
            <dt>Balance</dt>
            <dd className="mono">{agent.balance == null ? "Unknown" : `${agent.balance} SOL`}</dd>
            <dt>Registration</dt>
            <dd>
              {agent.registrationSignature ? (
                <span className="kbd-copy">
                  <a className="mono break" href={agent.explorerUrl || explorerTx(agent.registrationSignature)} target="_blank" rel="noopener noreferrer">
                    {shorten(agent.registrationSignature, 12, 12)} <IconExternal size={12} style={{ verticalAlign: "-1px" }} />
                  </a>
                  <CopyButton value={agent.registrationSignature} label="registration signature" onCopied={toast} />
                </span>
              ) : (
                <span className="muted">Not registered yet</span>
              )}
            </dd>
          </dl>

          {!agent.registered && (
            <div>
              <button type="button" className="btn btn-primary" onClick={register} disabled={busy}>
                {busy ? "Registering…" : "Register Agent"}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="stack-3">
        <h2 className="t-label-l">Reputation History</h2>
        <div className="card card-flush">
          {history === null ? (
            <div style={{ padding: 24 }}><div className="skeleton" style={{ height: 48 }} /></div>
          ) : history.length === 0 ? (
            <div className="empty">
              <p className="t-label-m">No records yet</p>
              <p className="t-body-s muted">Run a scan to write the first audit proof.</p>
            </div>
          ) : (
            <div className="list">
              {history.map((h) => {
                const { kind, detail } = memoLabel(h.memo);
                return (
                  <div key={h.signature} className="list-item">
                    <span className={`badge ${kind === "Audit" ? "badge-info" : kind === "Registration" ? "badge-special" : "badge-outline"}`}>{kind}</span>
                    <div className="grow">
                      <div className="t-label-s break">{detail}</div>
                      <div className="t-mono-xs muted">{shorten(h.signature, 10, 10)}</div>
                    </div>
                    <span className="t-body-s muted hide-md">{formatDate(h.timestamp)}</span>
                    <a className="btn btn-tertiary btn-sm" href={h.explorerUrl || explorerTx(h.signature)} target="_blank" rel="noopener noreferrer" aria-label="View transaction in explorer">
                      <IconExternal size={14} />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
