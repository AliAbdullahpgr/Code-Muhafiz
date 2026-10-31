"use client";

import { useEffect, useRef } from "react";

const RAMP = " .:-=+*#%@";
const COLS = 120;
const ROWS = 14;
const FRAME_MS = 85;

// Classic fire automaton rendered as ASCII. Runs only while on screen and
// renders a single static frame when the user prefers reduced motion.
export default function AsciiFlame() {
  const wrap = useRef(null);
  const pre = useRef(null);

  useEffect(() => {
    const cells = new Float32Array(COLS * ROWS);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const step = () => {
      for (let x = 0; x < COLS; x++) {
        const edge = Math.abs(x - COLS / 2) / (COLS / 2);
        cells[(ROWS - 1) * COLS + x] = Math.random() < 0.9 - edge * 0.5 ? 1 : 0.2;
      }
      for (let y = 0; y < ROWS - 1; y++) {
        for (let x = 0; x < COLS; x++) {
          const below = (y + 1) * COLS;
          const l = cells[below + ((x - 1 + COLS) % COLS)];
          const c = cells[below + x];
          const r = cells[below + ((x + 1) % COLS)];
          const b2 = y + 2 < ROWS ? cells[(y + 2) * COLS + x] : c;
          cells[y * COLS + x] = Math.max(0, (l + c + r + b2) / 4 - 0.07 - Math.random() * 0.05);
        }
      }
    };

    const draw = () => {
      let out = "";
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) out += RAMP[Math.min(RAMP.length - 1, Math.floor(cells[y * COLS + x] * RAMP.length))];
        out += "\n";
      }
      if (pre.current) pre.current.textContent = out;
    };

    for (let i = 0; i < ROWS * 2; i++) step();
    draw();
    if (reduce) return;

    let timer = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        step();
        draw();
      }, FRAME_MS);
    };
    const stop = () => {
      clearInterval(timer);
      timer = null;
    };

    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    io.observe(wrap.current);
    const onVisibility = () => (document.hidden ? stop() : null);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="flame" ref={wrap} aria-hidden="true">
      <pre ref={pre} />
    </div>
  );
}
