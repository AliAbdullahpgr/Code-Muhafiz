"use client";

import { useRef, useState } from "react";
import { IconGithub, IconFolder, IconUpload, IconX, IconAlert } from "./Icons";
import { itemsFromInput, itemsFromDrop, readProject } from "../lib/ingest";
import { formatBytes, plural } from "../lib/format";

const REPO_RE = /^(?:https?:\/\/(?:www\.)?github\.com\/)?[\w.-]+\/[\w.-]+(?:\/tree\/[^\s]+)?(?:\.git)?\/?$/i;

export default function ScanForm({ onGithub, onUpload, disabled, error }) {
  const [mode, setMode] = useState("github");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("");
  const [touched, setTouched] = useState(false);

  const [picked, setPicked] = useState(null); // { name, items }
  const [reading, setReading] = useState(false);
  const [over, setOver] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef(null);

  const repoValid = REPO_RE.test(repo.trim());

  function submitGithub(e) {
    e.preventDefault();
    setTouched(true);
    if (!repoValid) return;
    onGithub(repo.trim(), branch.trim());
  }

  function pick(result) {
    setUploadError("");
    if (!result.items.length) {
      setPicked(null);
      setUploadError("No files found. Drop a folder, not individual files.");
      return;
    }
    setPicked(result);
  }

  async function submitUpload() {
    if (!picked) return;
    setReading(true);
    setUploadError("");
    try {
      const project = await readProject(picked.items);
      if (!project.files.length) {
        setUploadError("No manifests found. Add a package.json, package-lock.json or requirements.txt.");
        return;
      }
      onUpload(picked.name, project);
    } catch {
      setUploadError("Could not read the folder. Try choosing it again.");
    } finally {
      setReading(false);
    }
  }

  async function onDrop(e) {
    e.preventDefault();
    setOver(false);
    if (disabled) return;
    pick(await itemsFromDrop(e.dataTransfer));
  }

  const busy = disabled || reading;

  return (
    <div className="card scan-card stack-4">
      <div className="tabs" role="tablist" aria-label="Scan source">
        <button type="button" role="tab" className="tab" aria-selected={mode === "github"} onClick={() => setMode("github")}>
          <IconGithub size={14} /> GitHub Repo
        </button>
        <button type="button" role="tab" className="tab" aria-selected={mode === "upload"} onClick={() => setMode("upload")}>
          <IconFolder size={14} /> Upload Folder
        </button>
      </div>

      {mode === "github" ? (
        <form onSubmit={submitGithub} noValidate className="stack-3">
          <div className="form-grid">
            <div className="field">
              <label className="field-label" htmlFor="repo">Repository</label>
              <input
                id="repo"
                className={`input input-mono ${touched && !repoValid ? "input-error" : ""}`}
                placeholder="github.com/owner/repo"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={touched && !repoValid}
                aria-describedby={touched && !repoValid ? "repo-err" : undefined}
                disabled={busy}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="branch">Branch</label>
              <input id="branch" className="input input-mono" placeholder="default" value={branch} onChange={(e) => setBranch(e.target.value)} autoComplete="off" spellCheck={false} disabled={busy} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Start Scan
            </button>
          </div>
          {touched && !repoValid && (
            <p id="repo-err" className="field-error" role="alert">
              Enter a public repo as owner/repo or a full GitHub URL.
            </p>
          )}
          <p className="t-body-s muted">Public repositories only. Nothing is cloned or executed. We read manifests and source text through the GitHub API.</p>
        </form>
      ) : (
        <div className="stack-3">
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            tabIndex={-1}
            webkitdirectory=""
            directory=""
            multiple
            onChange={(e) => {
              pick(itemsFromInput(e.target.files));
              e.target.value = "";
            }}
          />

          {picked ? (
            <div className="picked">
              <IconFolder size={20} />
              <div className="grow">
                <div className="t-label-m break">{picked.name}</div>
                <div className="t-body-s muted">{plural(picked.items.length, "file")} found</div>
              </div>
              <button type="button" className="btn btn-tertiary btn-icon" aria-label="Remove folder" onClick={() => setPicked(null)} disabled={busy}>
                <IconX />
              </button>
            </div>
          ) : (
            <div
              className="dropzone"
              data-over={over}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(true);
              }}
              onDragLeave={() => setOver(false)}
              onDrop={onDrop}
            >
              <span className="dropzone-icon"><IconUpload size={20} /></span>
              <div>
                <p className="t-label-m">Drop a project folder here</p>
                <p className="t-body-s muted">
                  We keep manifests, <span className="mono">node_modules/**/package.json</span> and source files under 200 KB.
                </p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => inputRef.current?.click()} disabled={busy}>
                Choose Folder
              </button>
            </div>
          )}

          {uploadError && (
            <p className="field-error" role="alert">{uploadError}</p>
          )}

          <div className="spread spread-sm">
            <p className="t-body-s muted">Files are filtered in your browser. Max {formatBytes(25 * 1024 * 1024)}.</p>
            <button type="button" className="btn btn-primary" onClick={submitUpload} disabled={!picked || busy}>
              {reading ? "Reading Files…" : "Start Scan"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="callout callout-error" role="alert">
          <IconAlert />
          <div>{error}</div>
        </div>
      )}
    </div>
  );
}
