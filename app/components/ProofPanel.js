"use client";

import { useState } from "react";
import CopyButton from "./CopyButton";
import { IconCheck, IconX, IconExternal, IconShield, IconAlert } from "./Icons";
import { recordProof, verifyProof } from "../lib/api";
import { explorerTx, explorerAddress, formatDate } from "../lib/format";

const CHECKS = [
  ["hashMatches", "Report hash matches the recorded hash"],
  ["signerIsAgent", "Signed by the Code-Muhafiz agent"],
  ["onChain", "Memo found on Solana"],
];

function Value({ value, label, toast, href }) {
  return (
    <span className="kbd-copy">
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="mono break">{value}</a>
      ) : (
        <span className="mono break">{value}</span>
      )}
      <CopyButton value={value} label={label} onCopied={toast} />
    </span>
  );
}

export default function ProofPanel({ report, onReport, toast }) {
  const proof = report.proof;
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function record() {
    setBusy(true);
    setError("");
    try {
      const p = await recordProof(report.scanId);
      onReport({ ...report, proof: p });
      setResult(null);
      toast("Proof recorded");
    } catch (e) {
      setError(`Could not record the proof. ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError("");
    try {
      setResult(await verifyProof(report.scanId));
    } catch (e) {
      setError(`Could not verify the proof. ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!proof) {
    return (
      <div className="card empty">
        <IconShield size={24} />
        <p className="t-label-m">No proof recorded for this scan</p>
        <p className="t-body-s muted" style={{ maxWidth: 420 }}>
          A proof stamps the SHA-256 of this report on Solana, signed by the agent, so the result can be checked later.
        </p>
        <button type="button" className="btn btn-primary" onClick={record} disabled={busy}>
          {busy ? "Recording…" : "Record Proof"}
        </button>
        {error && <p className="field-error" role="alert">{error}</p>}
      </div>
    );
  }

  const devnet = proof.mode === "devnet";
  const explorer = proof.explorerUrl || (devnet ? explorerTx(proof.signature) : null);

  return (
    <div className="stack-4">
      <div className="card stack-6">
        <div className="spread">
          <div>
            <h3 className="t-label-l">Audit Proof</h3>
            <p className="t-body-s muted">Recorded {formatDate(proof.timestamp)}</p>
          </div>
          <span className={`badge ${devnet ? "badge-ok" : "badge-warn"}`}>{devnet ? "Solana Devnet" : "Simulated"}</span>
        </div>

        {!devnet && (
          <div className="callout callout-warn">
            <IconAlert />
            <div>
              This proof is in a local hash-chained ledger, not on Solana. The agent has no funded devnet key, or the RPC was unreachable.
            </div>
          </div>
        )}

        <dl className="kv">
          <dt>Report Hash</dt>
          <dd><Value value={proof.reportHash} label="report hash" toast={toast} /></dd>
          <dt>Signature</dt>
          <dd><Value value={proof.signature} label="signature" toast={toast} href={explorer} /></dd>
          <dt>Signed By</dt>
          <dd><Value value={proof.agent} label="agent key" toast={toast} href={devnet ? explorerAddress(proof.agent) : undefined} /></dd>
          {proof.prevHash && (
            <>
              <dt>Previous Entry</dt>
              <dd><span className="mono break">{proof.prevHash}</span></dd>
            </>
          )}
          <dt>Memo</dt>
          <dd><pre className="code" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{proof.memo}</pre></dd>
        </dl>

        <div className="row-wrap">
          <button type="button" className="btn btn-secondary" onClick={verify} disabled={busy}>
            {busy ? <><span className="spinner spinner-sm" /> Verifying…</> : "Verify Proof"}
          </button>
          {explorer && (
            <a className="btn btn-tertiary" href={explorer} target="_blank" rel="noopener noreferrer">
              View In Explorer <IconExternal size={14} />
            </a>
          )}
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
      </div>

      {result && (
        <div className={`callout ${result.valid ? "callout-ok" : "callout-error"}`} role="status">
          {result.valid ? <IconCheck /> : <IconX />}
          <div className="stack-3 grow">
            <p className="t-label-m">{result.valid ? "Verified. This report has not been altered" : "Verification failed. This report does not match its proof"}</p>
            <ul className="check-list">
              {CHECKS.map(([key, label]) => {
                const ok = result.checks?.[key];
                const na = key === "onChain" && result.mode !== "devnet";
                if (na) {
                  return (
                    <li key={key}>
                      <span className="check-ic" style={{ background: "var(--alpha-24)" }}><IconX size={12} strokeWidth={2.5} /></span>
                      {label} <span className="muted">(not applicable in simulated mode)</span>
                    </li>
                  );
                }
                return (
                  <li key={key}>
                    <span className={`check-ic ${ok ? "ok" : "bad"}`}>{ok ? <IconCheck size={12} strokeWidth={2.5} /> : <IconX size={12} strokeWidth={2.5} />}</span>
                    {label}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
