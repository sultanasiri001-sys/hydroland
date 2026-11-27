import assert from 'node:assert/strict';

export const IOS_QA_BUNDLE_ID = 'com.hydroland.acceptance';
// A synthetic, local simulator prefix, not an Apple developer team identifier.
export const IOS_QA_APPLICATION_ID = 'HYDROQA001.' + IOS_QA_BUNDLE_ID;
export const IOS_QA_ENTITLEMENTS = Object.freeze({
  'application-identifier': IOS_QA_APPLICATION_ID,
  'keychain-access-groups': Object.freeze([IOS_QA_APPLICATION_ID]),
});

// The caller checks codesign exit status, the actual simulator bundle identity
// and absence of a provisioning profile before passing decoded entitlements.
function verifiedAdhocMetadata(metadata, verification) {
  const field = name => {
    const values = [...metadata.matchAll(new RegExp('^' + name + '=([^\\r\\n]*)\\r?$', 'gm'))].map(match => match[1]);
    assert.equal(values.length, 1, 'Expected one codesign field: ' + name);
    return values[0];
  };
  const bundleIdentifier = field('Identifier');
  assert(bundleIdentifier.length > 0, 'A signed-code identifier is required.');
  assert.equal(field('Signature'), 'adhoc', 'Simulator acceptance requires an ad-hoc signature.');
  assert.equal(field('TeamIdentifier'), 'not set', 'A simulator receipt cannot assert an Apple developer team.');
  assert.doesNotMatch(metadata, /^Authority=/m, 'An owner distribution certificate is outside this QA build.');
  const codeDirectoryHash = field('CDHash');
  assert.match(codeDirectoryHash, /^[a-f0-9]{40}$/i, 'A concrete signed CodeDirectory hash is required.');
  assert.match(verification, /^.+: valid on disk\r?$/m, 'codesign must verify the signed application.');
  assert.match(verification, /^.+: satisfies its Designated Requirement\r?$/m, 'codesign must verify the designated requirement.');
  return {bundleIdentifier, codeDirectoryHash: codeDirectoryHash.toLowerCase()};
}

export function verifyIosQaSignature(metadata, entitlements, verification) {
  const signed = verifiedAdhocMetadata(metadata, verification);
  assert.equal(signed.bundleIdentifier, IOS_QA_BUNDLE_ID, 'Only the isolated QA bundle may be accepted.');
  assert.deepEqual(entitlements, IOS_QA_ENTITLEMENTS, 'Only the explicit QA application and its own keychain group are permitted.');
  return {kind: 'ad-hoc-simulator-qa', verified: true, ...signed,
    applicationIdentifier: IOS_QA_APPLICATION_ID, entitlements,
    productionSigningVerified: false};
}

export function verifyIosEmbeddedSignature(metadata, entitlements, verification, bundleIdentifier) {
  const signed = verifiedAdhocMetadata(metadata, verification);
  assert.equal(signed.bundleIdentifier, bundleIdentifier, 'Signed framework identity must match its own Info.plist.');
  assert.deepEqual(entitlements, {}, 'Embedded frameworks must not inherit application or keychain entitlements.');
  return {kind: 'ad-hoc-embedded-framework', verified: true, ...signed, entitlements, productionSigningVerified: false};
}
