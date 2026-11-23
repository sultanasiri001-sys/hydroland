// Supply the existing app identifiers from the build environment. Keep local development optional.
module.exports = ({ config }) => {
  const extra = { ...config.extra };
  const ios = { ...config.ios };
  const android = { ...config.android };
  const projectId = process.env.HYDROLAND_EXPO_PROJECT_ID?.trim();
  if (projectId) {
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(projectId)) {
      throw new Error('HYDROLAND_EXPO_PROJECT_ID must be an Expo project UUID.');
    }
    extra.eas = { ...extra.eas, projectId };
  }
  if (process.env.HYDROLAND_IOS_BUNDLE_ID) ios.bundleIdentifier = process.env.HYDROLAND_IOS_BUNDLE_ID.trim();
  if (process.env.HYDROLAND_ANDROID_PACKAGE) android.package = process.env.HYDROLAND_ANDROID_PACKAGE.trim();
  if (process.env.HYDROLAND_ANDROID_GOOGLE_SERVICES_FILE) android.googleServicesFile = process.env.HYDROLAND_ANDROID_GOOGLE_SERVICES_FILE;
  return { ...config, extra, ios, android };
};
