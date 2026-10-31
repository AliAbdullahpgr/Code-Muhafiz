// requirements*.txt parser -> Dependency[] (ecosystem 'PyPI').

const SPEC_RE = /^([A-Za-z0-9][A-Za-z0-9._-]*)\s*(?:\[[^\]]*\])?\s*(.*)$/;

export function parseRequirements(content, file) {
  const deps = [];
  for (const raw of content.split(/\r?\n/)) {
    let line = raw.replace(/(^|\s)#.*$/, '').trim(); // comments
    if (!line || line.startsWith('-')) continue;      // -r, -e, --index-url, ...
    if (/^(https?|git\+|file:)/i.test(line)) continue; // direct URLs
    line = line.split(';')[0].trim();                 // env markers
    const m = line.match(SPEC_RE);
    if (!m) continue;
    const range = m[2].replace(/\s+/g, '');
    // version = exact pin (==, ===) or minimum (>=, ~=); '' if only upper bounds / unpinned.
    const pin = range.match(/(?:===|==|~=|>=)([^,]+)/);
    const version = pin ? pin[1].replace(/\.\*$/, '') : '';
    deps.push({
      name: m[1].toLowerCase(), version, range,
      ecosystem: 'PyPI', file, direct: true, depth: 0, dev: false,
    });
  }
  return deps;
}
