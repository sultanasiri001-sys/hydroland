import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyAcceptanceCertificate } from './native-signature.mjs';

// Exact certificate fields observed from the first compiled acceptance APK with
// official Android Build Tools 37.0.0. This is a public QA certificate, not a key.
const fingerprint = 'fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c';
const prefix = 'Verifies\nVerified using v1 scheme (JAR signing): false\nVerified using v2 scheme (APK Signature Scheme v2): true\nNumber of signers: 1\n';
const modern = prefix + 'V2 Signer: certificate DN: CN=Android Debug, OU=Android, O=Unknown, L=Unknown, ST=Unknown, C=US\nV2 Signer: certificate SHA-256 digest: ' + fingerprint + '\nV2 Signer: public key SHA-256 digest: 06104aa0b28fac286bae06b08313ac69c37c35a6462853db32d2ec5fa7b1ed0e\n';

test('accepts actual SDK 37 certificate fields and matches the expected keystore', () => assert.equal(verifyAcceptanceCertificate(modern, fingerprint), fingerprint));
test('accepts the prior apksigner certificate label', () => assert.equal(verifyAcceptanceCertificate(modern.replaceAll('V2 Signer:', 'Signer #1'), fingerprint), fingerprint));
test('rejects a valid different certificate even with an Android Debug name', () => assert.throws(() => verifyAcceptanceCertificate(modern, 'a'.repeat(64))));
test('does not accept public-key or SourceStamp hashes as the application certificate', () => {
  for (const label of ['V2 Signer: public key', 'SourceStamp']) assert.throws(() => verifyAcceptanceCertificate(prefix + label + ' SHA-256 digest: ' + fingerprint, fingerprint));
});
test('rejects missing verification, extra signers and malformed or ambiguous fingerprints', () => {
  for (const invalid of [modern.replace('Verifies\n', ''), modern.replace('Number of signers: 1', 'Number of signers: 2'), modern.replace(': true', ': false'), modern.replace(fingerprint, fingerprint.slice(1)), modern + 'Signer #2 certificate SHA-256 digest: ' + 'b'.repeat(64)]) assert.throws(() => verifyAcceptanceCertificate(invalid, fingerprint));
});
