import test from 'node:test';
import assert from 'node:assert/strict';
import { IOS_QA_ENTITLEMENTS } from './native-ios-signature.mjs';
import { configureIosSimulatorEntitlements, readIosSimulatorEntitlementSections, verifyIosSimulatorEntitlements } from './native-ios-simulator.mjs';

function projectFixture() {
  const targets = {APP: {name: 'QA', productType: '"com.apple.product-type.application"', buildConfigurationList: 'APP_LIST'},
    POD: {name: 'Framework', productType: '"com.apple.product-type.framework"', buildConfigurationList: 'POD_LIST'}};
  const lists = {APP_LIST: {buildConfigurations: [{value: 'APP_DEBUG'}, {value: 'APP_RELEASE'}]},
    POD_LIST: {buildConfigurations: [{value: 'POD_RELEASE'}]}, PROJECT_LIST: {buildConfigurations: [{value: 'PROJECT_RELEASE'}]}};
  const configs = Object.fromEntries(['APP_DEBUG', 'APP_RELEASE', 'POD_RELEASE', 'PROJECT_RELEASE'].map(id => [id,
    {name: id === 'APP_DEBUG' ? 'Debug' : 'Release', buildSettings: {PRODUCT_BUNDLE_IDENTIFIER: 'com.hydroland.acceptance', OTHER_LDFLAGS: ['"$(inherited)"', '"-ObjC"']}}]));
  return {targets, lists, configs, pbxNativeTargetSection: () => targets, pbxXCConfigurationList: () => lists, pbxXCBuildConfigurationSection: () => configs};
}

test('links simulator entitlements only into the generated QA application Release target', () => {
  const p = projectFixture(), before = structuredClone(p.configs);
  const receipt = configureIosSimulatorEntitlements(p, '/qa/entitlements.xml', '/qa/entitlements.der');
  assert.equal(receipt.scope, 'generated-application-target-only');
  assert.deepEqual(p.configs.APP_DEBUG, before.APP_DEBUG);
  assert.deepEqual(p.configs.POD_RELEASE, before.POD_RELEASE);
  assert.deepEqual(p.configs.PROJECT_RELEASE, before.PROJECT_RELEASE);
  assert.deepEqual(p.configs.APP_RELEASE.buildSettings.OTHER_LDFLAGS, [...before.APP_RELEASE.buildSettings.OTHER_LDFLAGS,
    '"-Wl,-sectcreate,__TEXT,__entitlements,/qa/entitlements.xml"', '"-Wl,-sectcreate,__TEXT,__ents_der,/qa/entitlements.der"']);
  assert.throws(() => configureIosSimulatorEntitlements(p, '/qa/entitlements.xml', '/qa/entitlements.der'));
});

test('refuses production identity, shared configurations and ambiguous application targets', () => {
  for (const change of [p => {p.configs.APP_RELEASE.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = 'com.example.production';},
    p => {p.lists.POD_LIST.buildConfigurations.push({value: 'APP_RELEASE'});},
    p => {p.targets.POD.buildConfigurationList = 'APP_LIST';},
    p => {p.targets.OTHER = {...p.targets.APP};}]) {
    const p = projectFixture(); change(p);
    assert.throws(() => configureIosSimulatorEntitlements(p, '/qa/entitlements.xml', '/qa/entitlements.der'));
  }
});

// Minimal synthetic Mach-O images exercise only section parsing. Actual macOS
// codesign, DER decoding, installation and real SecureStore remain CI gates.
function machoFixture(names = ['__entitlements', '__ents_der']) {
  const commandSize = 72 + names.length * 80, dataOffset = 32 + commandSize;
  const binary = Buffer.alloc(dataOffset + names.length * 16);
  binary.writeUInt32LE(0xfeedfacf, 0); binary.writeUInt32LE(0x0100000c, 4);
  binary.writeUInt32LE(2, 12); binary.writeUInt32LE(1, 16); binary.writeUInt32LE(commandSize, 20);
  binary.writeUInt32LE(0x19, 32); binary.writeUInt32LE(commandSize, 36); binary.write('__TEXT', 40);
  binary.writeBigUInt64LE(BigInt(binary.length), 80); binary.writeUInt32LE(names.length, 96);
  names.forEach((name, index) => {
    const section = 104 + index * 80;
    binary.write(name, section); binary.write('__TEXT', section + 16);
    binary.writeBigUInt64LE(16n, section + 40); binary.writeUInt32LE(dataOffset + index * 16, section + 48);
    binary.fill(index + 1, dataOffset + index * 16, dataOffset + (index + 1) * 16);
  });
  return binary;
}

test('reads bounded simulator section bytes and reports absence explicitly', () => {
  const image = readIosSimulatorEntitlementSections(machoFixture());
  assert.equal(image.architecture, 'arm64'); assert.equal(image.fileType, 2);
  assert.deepEqual(image.sections.__entitlements.bytes, Buffer.alloc(16, 1));
  assert.deepEqual(image.sections.__ents_der.bytes, Buffer.alloc(16, 2));
  assert.deepEqual(readIosSimulatorEntitlementSections(machoFixture([])).sections, {});
});

test('rejects duplicate, overlapping, non-file-backed or out-of-bounds simulator sections', () => {
  assert.throws(() => readIosSimulatorEntitlementSections(machoFixture(['__entitlements', '__entitlements'])));
  for (const change of [b => b.writeUInt32LE(0, 0), b => b.writeUInt32LE(99, 4),
    b => b.writeUInt32LE(0xffffffff, 20), b => b.writeUInt32LE(8, 36),
    b => b.writeBigUInt64LE(0xffffffffffffffffn, 144), b => b.writeUInt32LE(b.length, 152),
    b => b.writeUInt32LE(1, 168), b => b.writeUInt32LE(b.readUInt32LE(152), 232),
    b => b.write('__DATA', 40), b => b.write('__DATA', 120)]) {
    const binary = machoFixture(); change(binary);
    assert.throws(() => readIosSimulatorEntitlementSections(binary));
  }
});

test('inspects a bounded single-slice FAT framework without accepting a universal or mismatched image', () => {
  const thin = machoFixture([]); thin.writeUInt32LE(6, 12);
  const fat = Buffer.alloc(32 + thin.length);
  fat.writeUInt32BE(0xcafebabe, 0); fat.writeUInt32BE(1, 4); fat.writeUInt32BE(0x0100000c, 8);
  fat.writeUInt32BE(32, 16); fat.writeUInt32BE(thin.length, 20); fat.writeUInt32BE(5, 24); thin.copy(fat, 32);
  assert.throws(() => readIosSimulatorEntitlementSections(fat));
  const result = readIosSimulatorEntitlementSections(fat, {allowSingleFatSlice: true});
  assert.equal(result.architecture, 'arm64'); assert.equal(result.container, 'single-slice-fat');
  assert.deepEqual(result.sections, {});
  for (const change of [b => b.writeUInt32BE(2, 4), b => b.writeUInt32BE(0x01000007, 8),
    b => b.writeUInt32BE(1, 12), b => b.writeUInt32BE(33, 16), b => b.writeUInt32BE(0xffffffff, 20),
    b => b.writeUInt32BE(31, 24), b => b.writeUInt32LE(2, 44)]) {
    const invalid = Buffer.from(fat); change(invalid);
    assert.throws(() => readIosSimulatorEntitlementSections(invalid, {allowSingleFatSlice: true}));
  }
});

test('requires the same exact isolated application/keychain entitlements in simulated XML and DER', () => {
  const result = verifyIosSimulatorEntitlements(structuredClone(IOS_QA_ENTITLEMENTS), structuredClone(IOS_QA_ENTITLEMENTS));
  assert.equal(result.verified, true); assert.equal(result.productionSigningVerified, false);
  for (const entitlements of [{}, {'application-identifier': IOS_QA_ENTITLEMENTS['application-identifier']},
    {...IOS_QA_ENTITLEMENTS, 'application-identifier': 'OWNERTEAM.com.example.production'},
    {...IOS_QA_ENTITLEMENTS, 'keychain-access-groups': ['shared.group']},
    {...IOS_QA_ENTITLEMENTS, 'keychain-access-groups': [...IOS_QA_ENTITLEMENTS['keychain-access-groups'], 'shared.group']},
    {...IOS_QA_ENTITLEMENTS, 'get-task-allow': true}, {...IOS_QA_ENTITLEMENTS, 'aps-environment': 'production'}]) {
    assert.throws(() => verifyIosSimulatorEntitlements(entitlements, entitlements));
    assert.throws(() => verifyIosSimulatorEntitlements(IOS_QA_ENTITLEMENTS, entitlements));
  }
});
