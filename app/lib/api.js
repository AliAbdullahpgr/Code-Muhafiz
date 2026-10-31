// Frontend client for the REST API in plan/API.md.
// If the backend is not reachable (no /api/health), every call is served by app/lib/mock.js
// and the UI shows a "Demo Data" badge. Set NEXT_PUBLIC_MOCK=1 to force demo data.

import { mockRequest } from "./mock";

let useMock = process.env.NEXT_PUBLIC_MOCK === "1";

export const isMock = () => useMock;

// Endpoints the backend has not built yet fall back to demo data one by one.
const listeners = new Set();
export const onFallback = (fn) => (listeners.add(fn), () => listeners.delete(fn));

async function request(path, opts = {}) {
  if (useMock) return mockRequest(path, opts);

  const res = await fetch(path, {
    ...opts,
    headers: opts.body ? { "Content-Type": "application/json", ...opts.headers } : opts.headers,
  });
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;

  if (res.status === 404 && !isJson) {
    listeners.forEach((fn) => fn(path));
    return mockRequest(path, opts);
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body ?? {}) });

export async function health() {
  if (!useMock) {
    try {
      const res = await fetch("/api/health");
      const isJson = (res.headers.get("content-type") || "").includes("application/json");
      if (res.ok && isJson) return { ...(await res.json()), mock: false };
    } catch {
      /* fall through to demo data */
    }
    useMock = true;
  }
  return { ...(await mockRequest("/api/health")), mock: true };
}

export const scanGithub = (repo, branch) => post("/api/scan/github", branch ? { repo, branch } : { repo });
export const scanUpload = (name, files) => post("/api/scan/upload", { name, files });
export const getSummary = (scanId) => post("/api/summary", { scanId });
export const explain = (scanId, findingId) => post("/api/explain", { scanId, findingId });
export const getReport = (scanId) => request(`/api/reports/${scanId}`);

export async function listReports() {
  const data = await request("/api/reports");
  return Array.isArray(data) ? data : data?.reports || [];
}
