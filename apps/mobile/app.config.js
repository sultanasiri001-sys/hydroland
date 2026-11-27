// Native acceptance builds have a separate identity and never carry store credentials.
// Production identifiers are supplied by the owner's existing build environment.
const profiles = new Set(['development', 'acceptance', 'production']);
const androidId = /^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
const appleId = /^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

module.exports = ({ config }) => {
  const profile = process.env.HYDROLAND_BUILD_PROFILE?.trim() || 'development';
  if (!profiles.has(profile)) throw new Error('Unknown HYDROLAND_BUILD_PROFILE.');
  const acceptance = profile === 'acceptance';
  const production = profile === 'production';
  const extra = { ...config.extra, hydrolandBuildProfile: profile };
  const ios = { ...config.ios };
  const android = { ...config.android, allowBackup: false };
  const projectId = process.env.HYDROLAND_EXPO_PROJECT_ID?.trim();
  if (projectId) {
    if (acceptance) throw new Error('Isolated acceptance builds must not connect an Expo provider project.');
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(projectId)) {
      throw new Error('HYDROLAND_EXPO_PROJECT_ID must be an Expo project UUID.');
    }
    extra.eas = { ...extra.eas, projectId };
  }
  if (process.env.HYDROLAND_IOS_BUNDLE_ID) ios.bundleIdentifier = process.env.HYDROLAND_IOS_BUNDLE_ID.trim();
  if (process.env.HYDROLAND_ANDROID_PACKAGE) android.package = process.env.HYDROLAND_ANDROID_PACKAGE.trim();
  if (ios.bundleIdentifier && !appleId.test(ios.bundleIdentifier)) throw new Error('Invalid iOS bundle identifier.');
  if (android.package && !androidId.test(android.package)) throw new Error('Invalid Android package identifier.');
  const endpoint = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (production || acceptance) {
    if (!ios.bundleIdentifier || !android.package) throw new Error('Native builds require both explicit application identifiers.');
    if (!endpoint) throw new Error('Native builds require EXPO_PUBLIC_API_BASE_URL.');
    let url;
    try { url = new URL(endpoint); } catch { throw new Error('Invalid EXPO_PUBLIC_API_BASE_URL.'); }
    if (url.username || url.password || url.search || url.hash || !/\/api\/v1\/?$/.test(url.pathname)) {
      throw new Error('The API endpoint must be an API v1 URL without credentials, query, or fragment.');
    }
    const local = ['localhost', '127.0.0.1', '[::1]', '10.0.2.2'].includes(url.hostname);
    if (acceptance && (!local || url.protocol !== 'http:')) throw new Error('Acceptance builds only connect to an isolated loopback API.');
    if (production && (url.protocol !== 'https:' || local)) throw new Error('Production builds require a non-loopback HTTPS API.');
    if (acceptance && (ios.bundleIdentifier !== 'com.hydroland.acceptance' || android.package !== 'com.hydroland.acceptance')) {
      throw new Error('Acceptance builds must use the isolated com.hydroland.acceptance identity.');
    }
    if (production && (ios.bundleIdentifier.endsWith('.acceptance') || android.package.endsWith('.acceptance'))) {
      throw new Error('An acceptance identity cannot be used for production.');
    }
    const buildNumber = process.env.HYDROLAND_BUILD_NUMBER?.trim();
    if (!buildNumber || !/^[1-9]\d*$/.test(buildNumber) || Number(buildNumber) > 2_100_000_000) {
      throw new Error('Native builds require a positive HYDROLAND_BUILD_NUMBER within the Android versionCode range.');
    }
    ios.buildNumber = buildNumber;
    android.versionCode = Number(buildNumber);
  }
  if (process.env.HYDROLAND_ANDROID_GOOGLE_SERVICES_FILE) {
    if (acceptance) throw new Error('Acceptance builds must not include production push-provider credentials.');
    android.googleServicesFile = process.env.HYDROLAND_ANDROID_GOOGLE_SERVICES_FILE;
  }
  return {
    ...config,
    ...(acceptance ? { name: 'HYDROLAND QA', scheme: 'hydroland-qa' } : {}),
    extra, ios, android,
    plugins: [...(config.plugins || []), ['./plugins/with-native-privacy.js', { acceptance }]],
  };
};
