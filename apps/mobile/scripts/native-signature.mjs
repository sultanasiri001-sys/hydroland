import assert from 'node:assert/strict';

// apksigner exit status is checked by the caller. SDK 37 labels the verified
// certificate "V2 Signer:"; older tools label it "Signer #1". Public-key and
// SourceStamp hashes are not application signing-certificate fingerprints.
export function verifyAcceptanceCertificate(output, expectedFingerprint) {
  assert.match(expectedFingerprint, /^[a-f0-9]{64}$/, 'A valid expected certificate fingerprint is required.');
  assert.match(output, /^Verifies\r?$/m, 'APK signature verification was not confirmed.');
  assert.match(output, /^Number of signers: 1\r?$/m, 'Exactly one application signer is required.');
  assert.match(output, /^Verified using v[234](?:\.\d+)? scheme [^\r\n]+: true\r?$/m, 'An APK signing scheme must verify.');
  const fingerprints = new Set([...output.matchAll(/^(?:Signer #\d+|V[1-4](?:\.\d+)? Signer(?: \([^\r\n)]*\))?|Signer \([^\r\n)]*\)):? certificate SHA-256 digest: ([a-f0-9]{64})\r?$/gmi)].map(match => match[1].toLowerCase()));
  assert.equal(fingerprints.size, 1, 'Expected one unambiguous verified signing certificate.');
  const [actual] = fingerprints;
  assert.equal(actual, expectedFingerprint, 'APK does not use the isolated acceptance keystore certificate.');
  return actual;
}
