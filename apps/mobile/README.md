# Native mobile builds

The `Mobile validation` workflow builds the checked-out source on Android and
macOS. JavaScript export, TypeScript checks, native compilation, installation and
UI checks are separate steps. A successful export alone is not native acceptance.

## Isolated acceptance profile

The CI application is named **HYDROLAND QA**, with package and bundle identifier
`com.hydroland.acceptance` and URL scheme `hydroland-qa`. It connects only to the
runner's loopback API. It cannot include an Expo provider project or production
Google services credentials. Test data and the capability probe belong only to
the isolated QA build.

The workflow uses Node 22, the committed npm lockfile, JDK 17, the generated
Android SDK requirements and macOS/Xcode for iOS. Before native compilation:

```sh
npm ci --ignore-scripts
export HYDROLAND_BUILD_PROFILE=acceptance
export HYDROLAND_IOS_BUNDLE_ID=com.hydroland.acceptance
export HYDROLAND_ANDROID_PACKAGE=com.hydroland.acceptance
export HYDROLAND_BUILD_NUMBER=1
export EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3001/api/v1
node apps/mobile/scripts/native-acceptance.mjs prepare android
node apps/mobile/scripts/native-acceptance.mjs build android
```

Use `http://127.0.0.1:3001/api/v1` and `ios` on macOS. The preparation step copies
`scripts/native-capabilities.tsx` into the ignored QA route, generates the native
project and refuses to accept a modified package manifest or lockfile.

Android produces an x86_64 APK and AAB for virtual-device testing. The runner
independently checks the package identity, ABI and generated Android debug
certificate. The AAB is a compilation artifact, not a store-ready upload.
iOS produces an actual unsigned simulator `.app` archive; this does not imply an
iPhone provisioning profile, an IPA or App Store signing.

Maestro is downloaded from its official release with a pinned SHA-256 digest.
The workflow installs the application, exercises the guest UI and executes real
native AES-256-GCM, authenticated-data, SecureStore and encrypted-file operations.
Ciphertext alteration and a different authenticated scope must be rejected.
The probe deletes its synthetic key and file in a `finally` block.

The artifact `acceptance.json` is produced only after successful compilation,
installation and a non-empty JUnit result with no failed or skipped cases.
Package hashes, source commit/tree, dependency versions, native environment and
screenshots are retained as workflow artifacts for 14 days. Inspect the actual
workflow result; the existence of this runbook is not execution evidence.

## Production build configuration

The owner supplies the existing application identifiers, an HTTPS API URL and a
positive build number with `HYDROLAND_BUILD_PROFILE=production`. An acceptance
identifier or loopback API is rejected. Android backup and iOS document sharing
are disabled; production cleartext network traffic is disabled.

Android release tasks require the owner's existing signing material through:

- `HYDROLAND_ANDROID_KEYSTORE_PATH`
- `HYDROLAND_ANDROID_KEYSTORE_PASSWORD`
- `HYDROLAND_ANDROID_KEY_ALIAS`
- `HYDROLAND_ANDROID_KEY_PASSWORD`

The generated Gradle configuration reads these at build time, refuses the
default `androiddebugkey` alias and never writes secrets into the repository.
iOS distribution still requires the owner's signing team, certificate and
provisioning profile through the authorized Xcode/build environment.

Real-device offline/synchronization behavior, actual push-provider delivery,
production signatures, accessibility acceptance and store submission remain
separate recorded decisions under Q01. The QA workflow never submits to a store
or treats synthetic provider data as production approval.
