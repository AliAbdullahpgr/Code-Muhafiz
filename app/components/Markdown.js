import { Fragment } from "react";

// Tiny, safe markdown renderer for Gemma output. Builds React elements only (no innerHTML),
// so model text can never inject markup. Supports headings, lists, code blocks, **bold**, `code`.

function inline(text, keyBase) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={key}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={key}>{inline(part.slice(2, -2), key)}</strong>;
    return <Fragment key={key}>{part}</Fragment>;
  });
}

export default function Markdown({ children }) {
  const lines = String(children || "").replace(/\r/g, "").split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
    } else if (line.startsWith("```")) {
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++;
      blocks.push({ t: "pre", text: code.join("\n") });
    } else if (/^#{1,6}\s/.test(line)) {
      blocks.push({ t: "h", text: line.replace(/^#{1,6}\s+/, "") });
      i++;
    } else if (/^\s*([-*•])\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*([-*•])\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*•])\s+/, ""));
      blocks.push({ t: "ul", items });
    } else if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ""));
      blocks.push({ t: "ol", items });
    } else {
      const para = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|\s*([-*•]|\d+[.)])\s+)/.test(lines[i])) para.push(lines[i++]);
      blocks.push({ t: "p", text: para.join(" ") });
    }
  }

  return (
    <div className="prose">
      {blocks.map((b, idx) => {
        const key = `b${idx}`;
        if (b.t === "h") return <h4 key={key}>{inline(b.text, key)}</h4>;
        if (b.t === "pre") return <pre key={key}><code>{b.text}</code></pre>;
        if (b.t === "ul" || b.t === "ol") {
          const Tag = b.t;
          return <Tag key={key}>{b.items.map((it, j) => <li key={j}>{inline(it, `${key}-${j}`)}</li>)}</Tag>;
        }
        return <p key={key}>{inline(b.text, key)}</p>;
      })}
    </div>
  );
}
