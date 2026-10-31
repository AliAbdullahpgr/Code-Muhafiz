"use client";

import { IconCopy } from "./Icons";

export default function CopyButton({ value, label, onCopied }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      onCopied?.(`${label} copied`);
    } catch {
      onCopied?.("Copy failed. Select the text and copy it manually");
    }
  }
  return (
    <button type="button" className="btn btn-tertiary btn-icon" onClick={copy} aria-label={`Copy ${label}`} title={`Copy ${label}`}>
      <IconCopy />
    </button>
  );
}
