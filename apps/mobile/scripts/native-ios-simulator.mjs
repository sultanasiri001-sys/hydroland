import assert from 'node:assert/strict';
import { IOS_QA_BUNDLE_ID, IOS_QA_ENTITLEMENTS } from './native-ios-signature.mjs';

const unquote = value => typeof value === 'string' && value.startsWith('"') ? JSON.parse(value) : value;

// Apply only to the generated QA application target. Command-line/global linker
// settings would also inject application entitlements into Pod frameworks.
export function configureIosSimulatorEntitlements(project, xmlPath, derPath) {
  for (const value of [xmlPath, derPath]) {
    assert(typeof value === 'string' && value.startsWith('/') && !value.includes(',') && !/[\r\n]/.test(value), 'Expected an absolute linker input path without commas or newlines.');
  }
  const targets = Object.entries(project.pbxNativeTargetSection()).filter(([, value]) =>
    value && typeof value === 'object' && unquote(value.productType) === 'com.apple.product-type.application');
  assert.equal(targets.length, 1, 'Expected one generated QA application target.');
  const [targetId, target] = targets[0];
  const list = project.pbxXCConfigurationList()[target.buildConfigurationList];
  assert(list && Array.isArray(list.buildConfigurations), 'Missing application build configurations.');
  const allConfigs = project.pbxXCBuildConfigurationSection();
  const configs = list.buildConfigurations.map(ref => ({id: ref.value, ...allConfigs[ref.value]}));
  const release = configs.filter(config => unquote(config.name) === 'Release');
  assert.equal(release.length, 1, 'Expected one application Release configuration.');
  const config = release[0];
  for (const [id, value] of Object.entries(project.pbxNativeTargetSection())) {
    if (id !== targetId && value && typeof value === 'object') assert.notEqual(value.buildConfigurationList, target.buildConfigurationList, 'Application settings must not be shared with another target.');
  }
  for (const [id, value] of Object.entries(project.pbxXCConfigurationList())) {
    if (id !== target.buildConfigurationList && value && typeof value === 'object') assert(!value.buildConfigurations?.some(ref => ref.value === config.id), 'Application Release settings must not be shared with another configuration list.');
  }
  assert.equal(unquote(config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER), IOS_QA_BUNDLE_ID, 'Only the generated QA app may receive simulated entitlements.');
  const current = config.buildSettings.OTHER_LDFLAGS ?? ['"$(inherited)"'];
  assert(Array.isArray(current) && current.every(value => typeof value === 'string'), 'Review unexpected application linker flags.');
  assert(current.every(value => !value.includes('__entitlements') && !value.includes('__ents_der')), 'Refusing duplicate simulator entitlement sections.');
  const sectionFlags = [
    '-Wl,-sectcreate,__TEXT,__entitlements,' + xmlPath,
    '-Wl,-sectcreate,__TEXT,__ents_der,' + derPath,
  ];
  config.buildSettings.OTHER_LDFLAGS = [...current, ...sectionFlags.map(value => JSON.stringify(value))];
  return {targetId, targetName: unquote(target.name), configurationId: config.id, configuration: 'Release',
    bundleIdentifier: IOS_QA_BUNDLE_ID, scope: 'generated-application-target-only', sectionFlags};
}

// Xcode's simulator permissions live in Mach-O sections, separate from the
// macOS host code signature. The QA build deliberately contains one 64-bit slice.
export function readIosSimulatorEntitlementSections(binary, {allowSingleFatSlice = false} = {}) {
  assert(Buffer.isBuffer(binary) && binary.length >= 32, 'A bounded Mach-O image is required.');
  // CocoaPods retains FAT headers around the single selected framework slice.
  // Inspect that existing slice without thinning or otherwise changing its seal.
  if (binary.readUInt32BE(0) === 0xcafebabe) {
    assert(allowSingleFatSlice, 'The QA application must be a thin simulator executable.');
    assert.equal(binary.readUInt32BE(4), 1, 'Only one built simulator framework slice is permitted.');
    const cpu = binary.readUInt32BE(8), subtype = binary.readUInt32BE(12);
    const sliceOffset = binary.readUInt32BE(16), sliceSize = binary.readUInt32BE(20), alignment = binary.readUInt32BE(24);
    assert(alignment <= 30 && sliceOffset >= 28 && sliceOffset % (2 ** alignment) === 0, 'Invalid FAT slice offset or alignment.');
    assert(sliceSize >= 32 && sliceOffset + sliceSize <= binary.length, 'FAT slice extends beyond the framework.');
    const slice = binary.subarray(sliceOffset, sliceOffset + sliceSize);
    assert.equal(slice.readUInt32LE(4), cpu, 'FAT and Mach-O architectures differ.');
    assert.equal(slice.readUInt32LE(8), subtype, 'FAT and Mach-O CPU subtypes differ.');
    const image = readIosSimulatorEntitlementSections(slice);
    assert.equal(image.fileType, 6, 'Only embedded frameworks may use a single-slice FAT container.');
    return {...image, container: 'single-slice-fat', sliceOffset, sliceSize};
  }
  assert.equal(binary.readUInt32LE(0), 0xfeedfacf, 'Expected a thin, little-endian 64-bit simulator image.');
  const architecture = new Map([[0x0100000c, 'arm64'], [0x01000007, 'x86_64']]).get(binary.readUInt32LE(4));
  assert(architecture, 'Unexpected simulator architecture.');
  const fileType = binary.readUInt32LE(12);
  assert([2, 6].includes(fileType), 'Expected an application or framework Mach-O image.');
  const commandCount = binary.readUInt32LE(16), commandBytes = binary.readUInt32LE(20);
  const commandEnd = 32 + commandBytes;
  assert(commandEnd <= binary.length && commandCount > 0 && commandCount <= commandBytes / 8, 'Invalid Mach-O command bounds.');
  const sections = {};
  const nameAt = offset => binary.subarray(offset, offset + 16).toString('utf8').split('\0')[0];
  const bounded64 = offset => {
    const value = Number(binary.readBigUInt64LE(offset));
    assert(Number.isSafeInteger(value) && value <= binary.length, 'Mach-O offset or size exceeds the supplied binary.');
    return value;
  };
  let offset = 32;
  for (let index = 0; index < commandCount; index++) {
    assert(offset + 8 <= commandEnd, 'Truncated Mach-O load command.');
    const command = binary.readUInt32LE(offset), size = binary.readUInt32LE(offset + 4);
    assert(size >= 8 && offset + size <= commandEnd, 'Invalid Mach-O load-command size.');
    if (command === 0x19) {
      assert(size >= 72, 'Truncated 64-bit Mach-O segment.');
      const count = binary.readUInt32LE(offset + 64);
      assert.equal(size, 72 + count * 80, 'Invalid Mach-O section table.');
      const segmentName = nameAt(offset + 8);
      const fileOffset = bounded64(offset + 40), fileSize = bounded64(offset + 48);
      assert(fileOffset + fileSize <= binary.length, 'Mach-O segment extends beyond the binary.');
      for (let sectionIndex = 0; sectionIndex < count; sectionIndex++) {
        const entry = offset + 72 + sectionIndex * 80, name = nameAt(entry);
        if (!['__entitlements', '__ents_der'].includes(name)) continue;
        assert.equal(segmentName, '__TEXT', 'Simulator entitlements must belong to __TEXT.');
        assert.equal(nameAt(entry + 16), '__TEXT', 'Entitlement section has an inconsistent segment.');
        assert(!sections[name], 'Duplicate simulator entitlement section: ' + name);
        const sectionSize = bounded64(entry + 40), sectionOffset = binary.readUInt32LE(entry + 48);
        assert(sectionSize > 0 && sectionOffset >= fileOffset && sectionOffset + sectionSize <= fileOffset + fileSize, 'Invalid simulator entitlement section bounds.');
        assert.equal(binary.readUInt32LE(entry + 64) & 0xff, 0, 'Entitlements must be a regular file-backed section.');
        sections[name] = {segment: '__TEXT', name, offset: sectionOffset, size: sectionSize,
          bytes: binary.subarray(sectionOffset, sectionOffset + sectionSize)};
      }
    }
    offset += size;
  }
  assert.equal(offset, commandEnd, 'Mach-O commands do not cover their declared size.');
  if (sections.__entitlements && sections.__ents_der) {
    const first = sections.__entitlements, second = sections.__ents_der;
    assert(first.offset + first.size <= second.offset || second.offset + second.size <= first.offset, 'Simulator entitlement sections must not overlap.');
  }
  return {architecture, fileType, sections};
}

export function verifyIosSimulatorEntitlements(xmlEntitlements, derEntitlements) {
  assert.deepEqual(xmlEntitlements, IOS_QA_ENTITLEMENTS, 'Simulated entitlements must contain exactly the isolated QA application and its own keychain group.');
  assert.deepEqual(derEntitlements, xmlEntitlements, 'Simulated XML and DER entitlements must agree.');
  return {kind: 'linked-simulator-entitlements', verified: true, bundleIdentifier: IOS_QA_BUNDLE_ID,
    applicationIdentifier: IOS_QA_ENTITLEMENTS['application-identifier'], entitlements: xmlEntitlements,
    derEntitlements, productionSigningVerified: false};
}
