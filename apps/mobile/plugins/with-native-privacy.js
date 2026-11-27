const { withAndroidManifest, withInfoPlist, withAppBuildGradle, AndroidConfig } = require('expo/config-plugins');

module.exports = function withNativePrivacy(config, { acceptance = false } = {}) {
  config = withAndroidManifest(config, next => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(next.modResults);
    app.$['android:allowBackup'] = 'false';
    app.$['android:usesCleartextTraffic'] = acceptance ? 'true' : 'false';
    return next;
  });
  config = withInfoPlist(config, next => {
    next.modResults.UIFileSharingEnabled = false;
    next.modResults.LSSupportsOpeningDocumentsInPlace = false;
    next.modResults.NSAppTransportSecurity = {
      ...(next.modResults.NSAppTransportSecurity || {}),
      NSAllowsArbitraryLoads: false,
      NSAllowsLocalNetworking: acceptance,
    };
    return next;
  });
  if (config.extra?.hydrolandBuildProfile === 'production') {
    config = withAppBuildGradle(config, next => {
      if (next.modResults.language !== 'groovy') throw new Error('Production signing requires a reviewed Gradle configuration.');
      const marker = '// HYDROLAND_OWNER_SIGNING';
      if (!next.modResults.contents.includes(marker)) {
        next.modResults.contents += '\n' + marker + '\n' + [
          "def hydrolandSigning = ['HYDROLAND_ANDROID_KEYSTORE_PATH', 'HYDROLAND_ANDROID_KEYSTORE_PASSWORD', 'HYDROLAND_ANDROID_KEY_ALIAS', 'HYDROLAND_ANDROID_KEY_PASSWORD'].collectEntries { [(it): System.getenv(it)] }",
          "def hydrolandSigningReady = hydrolandSigning.values().every { it != null && !it.trim().isEmpty() }",
          "if (gradle.startParameter.taskNames.any { it.toLowerCase().contains('release') } && (!hydrolandSigningReady || hydrolandSigning['HYDROLAND_ANDROID_KEY_ALIAS'] == 'androiddebugkey')) {",
          "    throw new GradleException('Production release requires owner-provided non-debug signing credentials.')",
          "}",
          'android {',
          '    signingConfigs {',
          '        hydrolandRelease {',
          '            if (hydrolandSigningReady) {',
          "                storeFile file(hydrolandSigning['HYDROLAND_ANDROID_KEYSTORE_PATH'])",
          "                storePassword hydrolandSigning['HYDROLAND_ANDROID_KEYSTORE_PASSWORD']",
          "                keyAlias hydrolandSigning['HYDROLAND_ANDROID_KEY_ALIAS']",
          "                keyPassword hydrolandSigning['HYDROLAND_ANDROID_KEY_PASSWORD']",
          '            }',
          '        }',
          '    }',
          '    buildTypes { release { signingConfig signingConfigs.hydrolandRelease } }',
          '}',
        ].join('\n') + '\n';
      }
      return next;
    });
  }
  return config;
};
