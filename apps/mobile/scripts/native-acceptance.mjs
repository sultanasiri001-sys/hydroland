import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, X509Certificate } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { verifyAcceptanceCertificate } from './native-signature.mjs';
import { IOS_QA_BUNDLE_ID, IOS_QA_ENTITLEMENTS, verifyIosQaSignature, verifyIosEmbeddedSignature } from './native-ios-signature.mjs';
import { configureIosSimulatorEntitlements, readIosSimulatorEntitlementSections, verifyIosSimulatorEntitlements } from './native-ios-simulator.mjs';

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(mobile, '../..');
const mobileRequire = createRequire(path.join(mobile, 'package.json'));
const artifacts = path.join(mobile, 'native-artifacts');
const [operation, platform] = process.argv.slice(2);
assert(['prepare', 'build', 'install', 'record-tests'].includes(operation), 'Unknown native acceptance operation.');
assert(['android', 'ios'].includes(platform), 'A concrete native platform is required.');
assert.equal(process.env.HYDROLAND_BUILD_PROFILE, 'acceptance', 'This runner is for isolated acceptance builds only.');
fs.mkdirSync(path.join(artifacts, platform), { recursive: true });

function run(command, args, options = {}) {
  const { capture = false, captureStderr = false, ...processOptions } = options;
  const result = spawnSync(command, args, {
    cwd: mobile, env: process.env, encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit', ...processOptions,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(command + ' failed with ' + result.status + (capture ? ': ' + result.stderr : ''));
  if (captureStderr) return [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
  return result.stdout?.trim() || '';
}
const git = (...args) => run('git', args, { cwd: root, capture: true });
const sha256 = filename => createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
const write = (name, value) => fs.writeFileSync(path.join(artifacts, platform, name), JSON.stringify(value, null, 2) + '\n');
const read = name => JSON.parse(fs.readFileSync(path.join(artifacts, platform, name), 'utf8'));
const source = () => ({ commit: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}'), event: process.env.GITHUB_EVENT_NAME || 'local', ref: process.env.GITHUB_REF || null });
const outputFile = filename => ({ path: path.relative(mobile, filename), size: fs.statSync(filename).size, sha256: sha256(filename) });

function inspectIosQaSignature(app, prefix, embedded = false) {
  assert.equal(process.platform, 'darwin', 'Actual codesign verification requires macOS.');
  const plist = path.join(app, 'Info.plist');
  const bundleIdentifier = run('/usr/libexec/PlistBuddy', ['-c', 'Print:CFBundleIdentifier', plist], { capture: true });
  if (!embedded) {
    assert.equal(bundleIdentifier, IOS_QA_BUNDLE_ID);
    assert.equal(run('/usr/libexec/PlistBuddy', ['-c', 'Print:DTPlatformName', plist], { capture: true }), 'iphonesimulator');
  }
  assert(!fs.existsSync(path.join(app, 'embedded.mobileprovision')), 'A QA simulator must not carry device provisioning material.');
  const verification = run('/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=2', app], { capture: true, captureStderr: true });
  const metadata = run('/usr/bin/codesign', ['--display', '--verbose=4', app], { capture: true, captureStderr: true });
  const entitlementXml = run('/usr/bin/codesign', ['--display', '--entitlements', '-', '--xml', app], { capture: true });
  const entitlementFile = path.join(artifacts, platform, prefix + '-entitlements.xml');
  const metadataFile = path.join(artifacts, platform, prefix + '-signature.txt');
  const verificationFile = path.join(artifacts, platform, prefix + '-signature-verification.txt');
  fs.writeFileSync(entitlementFile, entitlementXml + '\n');
  const entitlements = entitlementXml ? JSON.parse(run('/usr/bin/plutil', ['-convert', 'json', '-o', '-', entitlementFile], { capture: true })) : {};
  const verified = embedded ? verifyIosEmbeddedSignature(metadata, entitlements, verification, bundleIdentifier) : verifyIosQaSignature(metadata, entitlements, verification);
  if (embedded) {
    const executable = run('/usr/libexec/PlistBuddy', ['-c', 'Print:CFBundleExecutable', plist], { capture: true });
    assert.equal(path.basename(executable), executable);
    const image = readIosSimulatorEntitlementSections(fs.readFileSync(path.join(app, executable)), {allowSingleFatSlice: true});
    assert.equal(image.fileType, 6, 'An embedded framework must be a Mach-O dynamic library.');
    assert.deepEqual(image.sections, {}, 'Embedded frameworks must not contain simulated application entitlements.');
    verified.simulatedEntitlementsAbsent = true;
  }
  fs.writeFileSync(metadataFile, metadata + '\n');
  fs.writeFileSync(verificationFile, verification + '\n');
  return { ...verified, metadata: outputFile(metadataFile), verificationLog: outputFile(verificationFile), entitlementsFile: outputFile(entitlementFile) };
}

function inspectIosSimulatorEntitlements(app, prefix) {
  const plist = path.join(app, 'Info.plist');
  assert.equal(run('/usr/libexec/PlistBuddy', ['-c', 'Print:CFBundleIdentifier', plist], { capture: true }), IOS_QA_BUNDLE_ID);
  const executable = run('/usr/libexec/PlistBuddy', ['-c', 'Print:CFBundleExecutable', plist], { capture: true });
  assert.equal(path.basename(executable), executable);
  const binaryPath = path.join(app, executable), binary = fs.readFileSync(binaryPath);
  const image = readIosSimulatorEntitlementSections(binary);
  assert.equal(image.fileType, 2, 'Simulated entitlements must be linked into the QA application executable.');
  assert.deepEqual(Object.keys(image.sections).sort(), ['__entitlements', '__ents_der'].sort(), 'Both simulated entitlement sections are required.');
  const xmlPath = path.join(artifacts, platform, prefix + '-simulator-entitlements.xml');
  const derPath = path.join(artifacts, platform, prefix + '-simulator-entitlements.der');
  const decodedDerPath = path.join(artifacts, platform, prefix + '-simulator-entitlements-der.xml');
  fs.writeFileSync(xmlPath, image.sections.__entitlements.bytes);
  fs.writeFileSync(derPath, image.sections.__ents_der.bytes);
  run('/usr/bin/derq', ['query', '-i', derPath, '-o', decodedDerPath, '--xml']);
  const decode = filename => JSON.parse(run('/usr/bin/plutil', ['-convert', 'json', '-o', '-', filename], { capture: true }));
  const verified = verifyIosSimulatorEntitlements(decode(xmlPath), decode(decodedDerPath));
  const sectionReceipt = (section, filename) => ({segment: section.segment, name: section.name,
    offset: section.offset, size: section.size, sha256: sha256(filename), artifact: outputFile(filename)});
  return {...verified, architecture: image.architecture,
    binary: {name: executable, size: binary.length, sha256: sha256(binaryPath)},
    xmlSection: sectionReceipt(image.sections.__entitlements, xmlPath),
    derSection: sectionReceipt(image.sections.__ents_der, derPath), decodedDer: outputFile(decodedDerPath)};
}

if (operation === 'prepare') {
  const fixture = path.join(mobile, 'scripts/native-capabilities.tsx');
  assert(fs.existsSync(fixture), 'The reviewed native-capability fixture is required.');
  const generatedRoute = path.join(mobile, 'app/native-acceptance.tsx');
  assert(!fs.existsSync(generatedRoute), 'Refusing to overwrite an existing product route.');
  fs.copyFileSync(fixture, generatedRoute);
  run(process.execPath, [path.join(path.dirname(mobileRequire.resolve('expo/package.json')), 'bin/cli'), 'prebuild', '--no-install', '--platform', platform, '--skip-dependency-update', 'react,react-native']);
  run('git', ['diff', '--exit-code', '--', 'apps/mobile/package.json', 'package-lock.json'], { cwd: root });
  const packages = Object.fromEntries(['expo', 'react', 'react-native', 'expo-crypto', 'expo-secure-store', 'expo-file-system', 'expo-document-picker', 'expo-sharing'].map(name => [
    name, JSON.parse(fs.readFileSync(mobileRequire.resolve(name + '/package.json'), 'utf8')).version,
  ]));
  write('source.json', {
    schemaVersion: 1, ...source(), platform, packages,
    profile: 'acceptance', appId: 'com.hydroland.acceptance',
    api: process.env.EXPO_PUBLIC_API_BASE_URL,
    capabilityFixtureSha256: sha256(fixture),
    generatedRouteSha256: sha256(generatedRoute),
    storeSubmissionApproved: false, physicalDeviceAcceptance: false,
  });
} else if (operation === 'build' && platform === 'android') {
  run('./gradlew', ['app:assembleRelease', 'app:bundleRelease', '--no-daemon', '--max-workers=2', '-PreactNativeArchitectures=x86_64'], { cwd: path.join(mobile, 'android') });
  const apk = path.join(mobile, 'android/app/build/outputs/apk/release/app-release.apk');
  const bundle = path.join(mobile, 'android/app/build/outputs/bundle/release/app-release.aab');
  assert(fs.existsSync(apk) && fs.existsSync(bundle), 'Both native APK and AAB must exist.');
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  assert(sdk, 'Android SDK path required for independent package verification.');
  const toolDir = fs.readdirSync(path.join(sdk, 'build-tools')).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).reverse()
    .map(name => path.join(sdk, 'build-tools', name)).find(dir => fs.existsSync(path.join(dir, 'apksigner')));
  assert(toolDir);
  const signature = run(path.join(toolDir, 'apksigner'), ['verify', '--verbose', '--print-certs', apk], { capture: true });
  const manifest = run(path.join(toolDir, 'aapt2'), ['dump', 'badging', apk], { capture: true });
  fs.writeFileSync(path.join(artifacts, platform, 'apk-signature.txt'), signature + '\n');
  fs.writeFileSync(path.join(artifacts, platform, 'apk-manifest.txt'), manifest + '\n');
  assert(manifest.includes("package: name='com.hydroland.acceptance'"), 'Unexpected package identity.');
  assert(manifest.includes("native-code: 'x86_64'"), 'The APK must contain the emulator ABI.');
  const certificate = new X509Certificate(run('keytool', ['-exportcert', '-rfc', '-keystore', path.join(mobile, 'android/app/debug.keystore'), '-alias', 'androiddebugkey', '-storepass', 'android'], { capture: true }));
  assert.match(certificate.subject, /CN=Android Debug/, 'Acceptance keystore must contain the generated QA certificate.');
  const signingCertificateSha256 = verifyAcceptanceCertificate(signature, createHash('sha256').update(certificate.raw).digest('hex'));
  write('build.json', { ...read('source.json'), built: true, artifacts: [outputFile(apk), outputFile(bundle)], signingCertificateSha256, signing: 'generated Android debug certificate; not an owner upload key' });
} else if (operation === 'build' && platform === 'ios') {
  assert.equal(process.platform, 'darwin', 'An actual macOS/Xcode runner is required.');
  const toolchain = { xcode: run('xcodebuild', ['-version'], { capture: true }), swift: run('xcrun', ['swift', '--version'], { capture: true }) };
  run('pod', ['install'], { cwd: path.join(mobile, 'ios') });
  const workspace = fs.readdirSync(path.join(mobile, 'ios')).filter(name => name.endsWith('.xcworkspace'));
  assert.equal(workspace.length, 1, 'Expected one generated Xcode workspace.');
  const scheme = workspace[0].slice(0, -'.xcworkspace'.length);
  const requestedEntitlements = path.join(artifacts, platform, 'ios-qa-simulated-entitlements.xml');
  const requestedDer = path.join(artifacts, platform, 'ios-qa-simulated-entitlements.der');
  fs.writeFileSync(requestedEntitlements, JSON.stringify(IOS_QA_ENTITLEMENTS));
  run('/usr/bin/plutil', ['-convert', 'xml1', requestedEntitlements]);
  run('/usr/bin/derq', ['query', '-f', 'xml', '-i', requestedEntitlements, '-o', requestedDer, '--raw']);
  const projectPath = path.join(mobile, 'ios', scheme + '.xcodeproj', 'project.pbxproj');
  assert(fs.existsSync(projectPath), 'Expected the generated application Xcode project.');
  const project = mobileRequire('xcode').project(projectPath);
  project.parseSync();
  const simulatorEntitlementLinkerConfiguration = configureIosSimulatorEntitlements(project, requestedEntitlements, requestedDer);
  fs.writeFileSync(projectPath, project.writeSync());
  write('ios-simulator-linker-configuration.json', {...simulatorEntitlementLinkerConfiguration,
    generatedProjectSha256: sha256(projectPath), requestedXml: outputFile(requestedEntitlements), requestedDer: outputFile(requestedDer)});
  const derived = path.join(artifacts, platform, 'build');
  run('xcodebuild', [
    '-workspace', path.join(mobile, 'ios', workspace[0]), '-scheme', scheme,
    '-configuration', 'Release', '-sdk', 'iphonesimulator',
    '-destination', 'generic/platform=iOS Simulator', '-derivedDataPath', derived,
    'CODE_SIGNING_ALLOWED=NO', 'CODE_SIGNING_REQUIRED=NO', 'ONLY_ACTIVE_ARCH=YES',
    'ARCHS=' + run('uname', ['-m'], { capture: true }), '-quiet', 'build',
  ]);
  const products = path.join(derived, 'Build/Products/Release-iphonesimulator');
  const apps = fs.readdirSync(products).filter(name => name.endsWith('.app'));
  assert.equal(apps.length, 1, 'Expected one native application.');
  const app = path.join(products, apps[0]);
  const plist = path.join(app, 'Info.plist');
  const appId = run('/usr/libexec/PlistBuddy', ['-c', 'Print:CFBundleIdentifier', plist], { capture: true });
  assert.equal(appId, 'com.hydroland.acceptance');
  const executable = run('/usr/libexec/PlistBuddy', ['-c', 'Print:CFBundleExecutable', plist], { capture: true });
  const architectures = run('lipo', ['-archs', path.join(app, executable)], { capture: true });
  assert.equal(run('/usr/libexec/PlistBuddy', ['-c', 'Print:DTPlatformName', plist], { capture: true }), 'iphonesimulator');
  assert(!fs.existsSync(path.join(app, 'embedded.mobileprovision')), 'Only an isolated simulator bundle may be signed here.');
  const frameworks = path.join(app, 'Frameworks');
  const frameworkEntries = fs.readdirSync(frameworks, { withFileTypes: true });
  assert(frameworkEntries.length > 0 && frameworkEntries.every(entry => entry.isDirectory() && entry.name.endsWith('.framework')), 'Review unexpected embedded code before signing this QA bundle.');
  assert.deepEqual(frameworkEntries.map(entry => entry.name).sort(), [
    'ExpoFileSystem.framework', 'ExpoFont.framework', 'ExpoModulesCore.framework', 'ExpoModulesJSI.framework',
    'ExpoModulesWorklets.framework', 'React.framework', 'ReactNativeDependencies.framework', 'hermesvm.framework',
  ].sort(), 'Review changes to the pinned embedded framework set before QA signing.');
  const iosEmbeddedSignatures = frameworkEntries.sort((a, b) => a.name.localeCompare(b.name)).map((entry, index) => {
    const framework = path.join(frameworks, entry.name);
    // Sign the final embedded QA output, after Xcode/CocoaPods copy and strip.
    // ReactNativeDependencies gains privacy bundles after its prebuilt seal was
    // created, while Hermes has only a linker signature. Neither old envelope
    // describes the final embedded resources when CODE_SIGNING_ALLOWED=NO.
    // This explicit signing step grants no entitlements and has no failure
    // fallback. Every resulting framework still must pass strict verification.
    const priorResourceEnvelopePresent = fs.existsSync(path.join(framework, '_CodeSignature', 'CodeResources'));
    run('/usr/bin/codesign', ['--force', '--sign', '-', '--timestamp=none', framework]);
    return {name: entry.name, envelopeAdded: !priorResourceEnvelopePresent, priorResourceEnvelopePresent, qaSignedAfterEmbedding: true, ...inspectIosQaSignature(framework, 'ios-embedded-' + index, true)};
  });
  // The simulator consumes the linked XML/DER above. Its macOS host signature
  // must not claim the restricted iOS keychain entitlements. Keep host signatures
  // unprivileged and sign the app envelope after its frameworks; --deep verifies.
  run('/usr/bin/codesign', ['--force', '--sign', '-', '--timestamp=none', app]);
  const iosSignature = inspectIosQaSignature(app, 'ios-build');
  const iosSimulatorEntitlements = inspectIosSimulatorEntitlements(app, 'ios-build');
  assert.equal(iosSimulatorEntitlements.architecture, architectures);
  const archive = path.join(artifacts, platform, 'hydroland-ios-simulator.app.tar.gz');
  run('tar', ['-czf', archive, '-C', products, apps[0]]);
  write('build.json', { ...read('source.json'), built: true, app: path.relative(mobile, app), architectures, toolchain, iosSignature, iosEmbeddedSignatures, iosSimulatorEntitlements,
    simulatorEntitlementLinkerConfiguration: outputFile(path.join(artifacts, platform, 'ios-simulator-linker-configuration.json')),
    artifacts: [outputFile(archive)], signing: 'unprivileged ad-hoc host signatures; isolated application/keychain entitlements linked into simulator XML/DER sections; no Apple developer team, device profile or App Store signature' });
} else if (operation === 'install' && platform === 'android') {
  run('adb', ['install', '-r', path.join(mobile, 'android/app/build/outputs/apk/release/app-release.apk')]);
  const apkPath = run('adb', ['shell', 'pm', 'path', 'com.hydroland.acceptance'], { capture: true });
  assert(apkPath.startsWith('package:'), 'APK installation was not confirmed.');
  write('installation.json', {
    ...source(), platform, installed: true, physicalDevice: false,
    apiLevel: run('adb', ['shell', 'getprop', 'ro.build.version.sdk'], { capture: true }),
    fingerprint: run('adb', ['shell', 'getprop', 'ro.build.fingerprint'], { capture: true }),
    model: run('adb', ['shell', 'getprop', 'ro.product.model'], { capture: true }),
    installedPackage: apkPath,
  });
} else if (operation === 'install' && platform === 'ios') {
  const build = read('build.json');
  assert.equal(build.commit, source().commit); assert.equal(build.tree, source().tree);
  assert.equal(build.iosSignature?.verified, true, 'The signed QA build receipt is required before installation.');
  const all = JSON.parse(run('xcrun', ['simctl', 'list', 'devices', 'available', '--json'], { capture: true }));
  const candidates = Object.entries(all.devices).flatMap(([runtime, devices]) => devices.map(device => ({ ...device, runtime })))
    .filter(device => device.isAvailable && device.runtime.includes('iOS') && device.name.startsWith('iPhone'));
  const device = candidates.find(item => item.state === 'Booted') || candidates[0];
  assert(device, 'No available iOS simulator.');
  if (device.state !== 'Booted') run('xcrun', ['simctl', 'boot', device.udid]);
  run('xcrun', ['simctl', 'bootstatus', device.udid, '-b']);
  run('xcrun', ['simctl', 'ui', device.udid, 'appearance', 'dark']);
  run('xcrun', ['simctl', 'install', device.udid, path.join(mobile, build.app)]);
  const container = run('xcrun', ['simctl', 'get_app_container', device.udid, 'com.hydroland.acceptance', 'app'], { capture: true });
  assert(container.endsWith('.app'), 'Simulator installation was not confirmed.');
  const iosSignature = inspectIosQaSignature(container, 'ios-installed');
  assert.equal(iosSignature.codeDirectoryHash, build.iosSignature.codeDirectoryHash, 'Installed signed code must match the archived QA build.');
  const iosSimulatorEntitlements = inspectIosSimulatorEntitlements(container, 'ios-installed');
  assert.equal(iosSimulatorEntitlements.architecture, build.architectures);
  assert.deepEqual(iosSimulatorEntitlements.binary, build.iosSimulatorEntitlements.binary, 'Installed simulator executable must match the built binary.');
  for (const key of ['xmlSection', 'derSection']) {
    for (const field of ['segment', 'name', 'offset', 'size', 'sha256']) {
      assert.equal(iosSimulatorEntitlements[key][field], build.iosSimulatorEntitlements[key][field], 'Installed simulator entitlement section differs from the build: ' + key + '.' + field);
    }
  }
  if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, 'HYDROLAND_SIMULATOR_ID=' + device.udid + '\n');
  write('installation.json', { ...source(), platform, installed: true, physicalDevice: false, name: device.name, runtime: device.runtime, udid: device.udid, container, iosSignature, iosSimulatorEntitlements });
} else if (operation === 'record-tests') {
  const { parseStringPromise } = await import('xml2js');
  const result = await parseStringPromise(fs.readFileSync(path.join(artifacts, platform, 'junit.xml'), 'utf8'));
  const cases = [];
  const walk = value => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) return value.forEach(walk);
    for (const [name, child] of Object.entries(value)) {
      if (name === 'testcase') cases.push(...child);
      else walk(child);
    }
  };
  walk(result);
  assert(cases.length >= 2, 'Both native capability and product journey flows must run.');
  assert(cases.every(test => !test.failure && !test.error && !test.skipped), 'Native UI test failed or was skipped.');
  const productScreens = ['ar', 'en'].flatMap(locale => ['account', 'credentials', 'trips', 'bookings', 'training', 'finance', 'notifications'].map(screen => 'product-' + locale + '-' + screen + '.png'));
  const screenshots = ['home.png', 'login-validation.png', 'native-capabilities.png', ...productScreens].map(name => {
    const filename = path.join(artifacts, platform, name);
    assert(fs.existsSync(filename) && fs.statSync(filename).size > 1000, 'Missing native screenshot: ' + name);
    return outputFile(filename);
  });
  const build = read('build.json');
  const installation = read('installation.json');
  assert.equal(build.commit, source().commit);
  assert.equal(installation.commit, build.commit);
  write('acceptance.json', {
    ...build, installation, screenshots, nativeUiTestsPassed: cases.length,
    tests: cases.map(test => test.$), completedAt: new Date().toISOString(),
    physicalDeviceAcceptance: false, productionSigningVerified: false, storeSubmissionApproved: false,
    scope: 'native compilation, QA package identity/signature, virtual-device installation, guest UI, seven actual product screens in Arabic/English with isolated synthetic HTTP, real native AES/SecureStore/filesystem capability fixture',
  });
  console.log(JSON.stringify({ platform, commit: build.commit, nativeUiTestsPassed: cases.length, screenshots: screenshots.length, physicalDeviceAcceptance: false }));
}
