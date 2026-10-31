// Browser-side copy of recent reports so the Reports tab works before /api/reports exists.
// Server reports win when both have the same scanId (see ReportsList).

const KEY = "muhafiz:reports";
const MAX = 10;

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export const loadLocalReports = read;

export function saveLocalReport(report) {
  const rest = read().filter((r) => r.scanId !== report.scanId);
  let list = [report, ...rest].slice(0, MAX);
  // localStorage is ~5 MB; drop the oldest until the write fits.
  while (list.length) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
      return;
    } catch {
      list = list.slice(0, -1);
    }
  }
}

export const findLocalReport = (scanId) => read().find((r) => r.scanId === scanId) || null;
