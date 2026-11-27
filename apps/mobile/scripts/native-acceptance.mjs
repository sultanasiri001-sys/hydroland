import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

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
  const result = spawnSync(command, args, {
    cwd: mobile, env: process.env, encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit', ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(command + ' failed with ' + result.status + (options.capture ? ': ' + result.stderr : ''));
  return result.stdout?.trim() || '';
}
const git = (...args) => run('git', args, { cwd: root, capture: true });
const sha256 = filename => createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
const write = (name, value) => fs.writeFileSync(path.join(artifacts, platform, name), JSON.stringify(value, null, 2) + '\n');
const read = name => JSON.parse(fs.readFileSync(path.join(artifacts, platform, name), 'utf8'));
const source = () => ({ commit: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}'), event: process.env.GITHUB_EVENT_NAME || 'local', ref: process.env.GITHUB_REF || null });
const outputFile = filename => ({ path: path.relative(mobile, filename), size: fs.statSync(filename).size, sha256: sha256(filename) });

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
  assert(manifest.includes("package: name='com.hydroland.acceptance'"), 'Unexpected package identity.');
  assert(manifest.includes("native-code: 'x86_64'"), 'The APK must contain the emulator ABI.');
  assert(/Signer #1 certificate SHA-256 digest:/i.test(signature), 'No verified signing certificate.');
  assert(/Android Debug/i.test(signature), 'Acceptance APK must use the generated test certificate.');
  fs.writeFileSync(path.join(artifacts, platform, 'apk-signature.txt'), signature + '\n');
  fs.writeFileSync(path.join(artifacts, platform, 'apk-manifest.txt'), manifest + '\n');
  write('build.json', { ...read('source.json'), built: true, artifacts: [outputFile(apk), outputFile(bundle)], signing: 'generated Android debug certificate; not an owner upload key' });
} else if (operation === 'build' && platform === 'ios') {
  assert.equal(process.platform, 'darwin', 'An actual macOS/Xcode runner is required.');
  run('pod', ['install'], { cwd: path.join(mobile, 'ios') });
  const workspace = fs.readdirSync(path.join(mobile, 'ios')).filter(name => name.endsWith('.xcworkspace'));
  assert.equal(workspace.length, 1, 'Expected one generated Xcode workspace.');
  const scheme = workspace[0].slice(0, -'.xcworkspace'.length);
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
  const archive = path.join(artifacts, platform, 'hydroland-ios-simulator.app.tar.gz');
  run('tar', ['-czf', archive, '-C', products, apps[0]]);
  write('build.json', { ...read('source.json'), built: true, app: path.relative(mobile, app), architectures, artifacts: [outputFile(archive)], signing: 'unsigned iOS simulator application; no device profile or App Store signature' });
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
  const all = JSON.parse(run('xcrun', ['simctl', 'list', 'devices', 'available', '--json'], { capture: true }));
  const candidates = Object.entries(all.devices).flatMap(([runtime, devices]) => devices.map(device => ({ ...device, runtime })))
    .filter(device => device.isAvailable && device.runtime.includes('iOS') && device.name.startsWith('iPhone'));
  const device = candidates.find(item => item.state === 'Booted') || candidates[0];
  assert(device, 'No available iOS simulator.');
  if (device.state !== 'Booted') run('xcrun', ['simctl', 'boot', device.udid]);
  run('xcrun', ['simctl', 'bootstatus', device.udid, '-b']);
  run('xcrun', ['simctl', 'ui', device.udid, 'appearance', 'dark']);
  run('xcrun', ['simctl', 'install', device.udid, path.join(mobile, read('build.json').app)]);
  const container = run('xcrun', ['simctl', 'get_app_container', device.udid, 'com.hydroland.acceptance', 'app'], { capture: true });
  assert(container.endsWith('.app'), 'Simulator installation was not confirmed.');
  if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, 'HYDROLAND_SIMULATOR_ID=' + device.udid + '\n');
  write('installation.json', { ...source(), platform, installed: true, physicalDevice: false, name: device.name, runtime: device.runtime, udid: device.udid, container });
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
  assert(cases.length > 0, 'No native UI test cases ran.');
  assert(cases.every(test => !test.failure && !test.error && !test.skipped), 'Native UI test failed or was skipped.');
  const screenshots = ['home.png', 'login-validation.png', 'native-capabilities.png'].map(name => {
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
    scope: 'native compilation, QA package identity/signature, virtual-device installation, guest UI, real native AES/SecureStore/filesystem capability fixture',
  });
  console.log(JSON.stringify({ platform, commit: build.commit, nativeUiTestsPassed: cases.length, screenshots: screenshots.length, physicalDeviceAcceptance: false }));
}
