import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const configure = require('../app.config.js');
const base = require('../app.json').expo;
const keys = [
  'HYDROLAND_BUILD_PROFILE', 'HYDROLAND_IOS_BUNDLE_ID', 'HYDROLAND_ANDROID_PACKAGE',
  'HYDROLAND_BUILD_NUMBER', 'HYDROLAND_EXPO_PROJECT_ID', 'EXPO_PUBLIC_API_BASE_URL',
  'HYDROLAND_ANDROID_GOOGLE_SERVICES_FILE',
];
function run(values = {}) {
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    for (const key of keys) delete process.env[key];
    Object.assign(process.env, values);
    return configure({ config: structuredClone(base) });
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}
const qa = {
  HYDROLAND_BUILD_PROFILE: 'acceptance',
  HYDROLAND_IOS_BUNDLE_ID: 'com.hydroland.acceptance',
  HYDROLAND_ANDROID_PACKAGE: 'com.hydroland.acceptance',
  HYDROLAND_BUILD_NUMBER: '27',
  EXPO_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3001/api/v1',
};
const production = {
  ...qa, HYDROLAND_BUILD_PROFILE: 'production',
  HYDROLAND_IOS_BUNDLE_ID: 'com.example.authorized',
  HYDROLAND_ANDROID_PACKAGE: 'com.example.authorized',
  EXPO_PUBLIC_API_BASE_URL: 'https://api.example.test/api/v1',
};
test('development preserves the existing optional identity and disables backup', () => {
  const app = run();
  assert.equal(app.name, 'HYDROLAND');
  assert.equal(app.scheme, 'hydroland');
  assert.equal(app.ios.bundleIdentifier, undefined);
  assert.equal(app.android.allowBackup, false);
});
test('acceptance has a distinct identity, build number and loopback-only API', () => {
  const app = run(qa);
  assert.equal(app.name, 'HYDROLAND QA');
  assert.equal(app.scheme, 'hydroland-qa');
  assert.equal(app.android.package, 'com.hydroland.acceptance');
  assert.equal(app.android.versionCode, 27);
  assert.equal(app.ios.buildNumber, '27');
  assert.equal(app.extra.hydrolandBuildProfile, 'acceptance');
  for (const host of ['localhost', '10.0.2.2', '[::1]']) {
    assert.equal(run({ ...qa, EXPO_PUBLIC_API_BASE_URL: 'http://' + host + ':3001/api/v1' }).name, 'HYDROLAND QA');
  }
  assert.throws(() => run({ ...qa, EXPO_PUBLIC_API_BASE_URL: 'https://hydroland.onrender.com/api/v1' }), /isolated loopback/);
  assert.throws(() => run({ ...qa, HYDROLAND_ANDROID_PACKAGE: 'com.example.production' }), /isolated/);
  assert.throws(() => run({ ...qa, HYDROLAND_ANDROID_GOOGLE_SERVICES_FILE: '/not/read/credentials.json' }), /credentials/);
  assert.throws(() => run({ ...qa, HYDROLAND_EXPO_PROJECT_ID: '11111111-2222-3333-4444-555555555555' }), /provider project/);
});
test('production requires explicit identifiers and HTTPS with no embedded credentials', () => {
  assert.equal(run(production).name, 'HYDROLAND');
  for (const key of ['HYDROLAND_IOS_BUNDLE_ID', 'HYDROLAND_ANDROID_PACKAGE', 'EXPO_PUBLIC_API_BASE_URL', 'HYDROLAND_BUILD_NUMBER']) {
    const invalid = { ...production }; delete invalid[key];
    assert.throws(() => run(invalid));
  }
  for (const url of ['http://api.example.test/api/v1', 'https://localhost/api/v1', 'https://user:secret@api.example.test/api/v1', 'https://api.example.test/api/v1?key=secret', 'https://api.example.test/api/v1#token', 'https://api.example.test/other']) {
    assert.throws(() => run({ ...production, EXPO_PUBLIC_API_BASE_URL: url }));
  }
  assert.throws(() => run({ ...production, HYDROLAND_IOS_BUNDLE_ID: 'com.hydroland.acceptance' }), /acceptance identity/);
});
test('malformed identifiers, profiles, versions and project IDs fail before prebuild', () => {
  for (const value of ['bad package', 'single', 'com..broken', 'com.test;cmd']) assert.throws(() => run({ ...qa, HYDROLAND_ANDROID_PACKAGE: value }));
  for (const value of ['0', '-1', '1.2', '2100000001', 'NaN', '']) assert.throws(() => run({ ...qa, HYDROLAND_BUILD_NUMBER: value }));
  assert.throws(() => run({ HYDROLAND_BUILD_PROFILE: 'release-ish' }), /Unknown/);
  assert.throws(() => run({ HYDROLAND_EXPO_PROJECT_ID: 'not-a-project' }), /UUID/);
});
