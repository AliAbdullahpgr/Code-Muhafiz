"use client";

export default function Toasts({ items }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toast">{t.text}</div>
      ))}
    </div>
  );
}
