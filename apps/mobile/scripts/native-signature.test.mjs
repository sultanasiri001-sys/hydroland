import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyAcceptanceCertificate } from './native-signature.mjs';
import { IOS_QA_APPLICATION_ID, IOS_QA_ENTITLEMENTS, verifyIosQaSignature, verifyIosEmbeddedSignature } from './native-ios-signature.mjs';

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

// Synthetic codesign fields exercise the source validator. A real signed build
// and installed-bundle verification remain mandatory on the macOS runner.
const iosMetadata = 'Executable=/qa/HYDROLANDQA.app/HYDROLANDQA\nIdentifier=com.hydroland.acceptance\nSignature=adhoc\nTeamIdentifier=not set\nCDHash=' + 'a'.repeat(40) + '\n';
const iosVerified = '/qa/HYDROLANDQA.app: valid on disk\n/qa/HYDROLANDQA.app: satisfies its Designated Requirement\n';
test('accepts only explicit ad-hoc QA signing and the isolated application keychain group', () => {
  const result = verifyIosQaSignature(iosMetadata, structuredClone(IOS_QA_ENTITLEMENTS), iosVerified);
  assert.equal(result.applicationIdentifier, IOS_QA_APPLICATION_ID);
  assert.equal(result.verified, true); assert.equal(result.productionSigningVerified, false);
});
test('rejects missing or unrelated simulator keychain entitlements', () => {
  for (const entitlements of [{}, {'application-identifier': IOS_QA_APPLICATION_ID}, {...IOS_QA_ENTITLEMENTS, 'application-identifier': 'OWNERTEAM.com.example.production'}, {...IOS_QA_ENTITLEMENTS, 'keychain-access-groups': ['OWNERTEAM.com.example.production']}, {...IOS_QA_ENTITLEMENTS, 'keychain-access-groups': [IOS_QA_APPLICATION_ID, 'shared.group']}]) {
    assert.throws(() => verifyIosQaSignature(iosMetadata, entitlements, iosVerified));
  }
});
test('rejects additional push, team, shared-container or debugging entitlements in QA', () => {
  for (const key of ['aps-environment', 'com.apple.developer.team-identifier', 'com.apple.security.application-groups', 'get-task-allow']) {
    assert.throws(() => verifyIosQaSignature(iosMetadata, {...IOS_QA_ENTITLEMENTS, [key]: true}, iosVerified));
  }
});
test('rejects certificate signing, wrong bundle or team and ambiguous CodeDirectory metadata', () => {
  for (const metadata of [iosMetadata.replace('Signature=adhoc', 'Signature=CMS'), iosMetadata + 'Authority=Apple Development: Owner\n', iosMetadata.replace('com.hydroland.acceptance', 'com.example.production'), iosMetadata.replace('TeamIdentifier=not set', 'TeamIdentifier=OWNERTEAM'), iosMetadata.replace('a'.repeat(40), 'a'.repeat(39)), iosMetadata + 'CDHash=' + 'b'.repeat(40) + '\n']) {
    assert.throws(() => verifyIosQaSignature(metadata, IOS_QA_ENTITLEMENTS, iosVerified));
  }
});
test('rejects signature metadata without successful disk and requirement verification', () => {
  for (const verification of ['', '/qa/HYDROLANDQA.app: valid on disk\n', '/qa/HYDROLANDQA.app: satisfies its Designated Requirement\n', '/qa/HYDROLANDQA.app: invalid signature']) {
    assert.throws(() => verifyIosQaSignature(iosMetadata, IOS_QA_ENTITLEMENTS, verification));
  }
});
test('embedded frameworks verify under their own identities without application entitlements', () => {
  const metadata = iosMetadata.replace('Identifier=com.hydroland.acceptance', 'Identifier=dev.hermesengine.hermes');
  assert.equal(verifyIosEmbeddedSignature(metadata, {}, iosVerified, 'dev.hermesengine.hermes').verified, true);
  assert.throws(() => verifyIosEmbeddedSignature(metadata, IOS_QA_ENTITLEMENTS, iosVerified, 'dev.hermesengine.hermes'));
  assert.throws(() => verifyIosEmbeddedSignature(metadata, {}, iosVerified, 'com.example.unrelated'));
});
