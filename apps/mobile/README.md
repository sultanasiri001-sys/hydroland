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
Android SDK requirements and macOS 26/Xcode 26.6 for iOS. Expo SDK 57 requires
Xcode 26.4 or newer; the selected runner pins a supported installed toolchain
instead of inheriting an older Xcode default. See the [Expo SDK 57 compatibility
table](https://docs.expo.dev/versions/v57.0.0/) and the [GitHub macOS 26 image
inventory](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-Readme.md).
Before native compilation:

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
iOS produces an actual simulator `.app` archive. Its generated QA application
target links `application-identifier` and `keychain-access-groups`, both bound to
`HYDROQA001.com.hydroland.acceptance`, into the simulator's `__TEXT,__entitlements`
and `__TEXT,__ents_der` sections. `HYDROQA001` is a synthetic local test prefix,
not an Apple developer team. The change applies only to that application's
Release target; Pod/framework and project-wide linker settings are untouched.
These simulator permissions let the real native SecureStore use the app's own
Keychain group. They are separate from the macOS host code signature, which must
have no entitlements. Apple's build system makes this distinction in its
[entitlement task](https://github.com/swiftlang/swift-build/blob/d417bbcdd46bcd5afb99cc810b3d769d3e7f922f/Sources/SWBTaskExecution/TaskActions/ProcessProductEntitlementsTaskAction.swift)
and [binary verification helper](https://github.com/swiftlang/swift-build/blob/d417bbcdd46bcd5afb99cc810b3d769d3e7f922f/Sources/SwiftBuildTestSupport/CoreQualificationTester.swift).
Embedded frameworks must contain neither application entitlement sections nor
host entitlements. After Xcode/CocoaPods finish copying and stripping the pinned
framework set, each framework gets its own ad-hoc signature over the final
embedded resources. A prebuilt seal can become stale when privacy resource
bundles are embedded, and Hermes can have only a linker signature. This is an
explicit QA build step, not a fallback after failed verification. The resulting
framework signatures must all verify strictly under their own identities with
empty entitlements; unexpected framework names stop the build for review.
The runner verifies the app and nested ad-hoc signatures strictly, records the
actual empty host entitlements and metadata, and independently extracts both
simulated entitlement sections from the application binary. Apple's `derq`
decodes the embedded DER, and both decoded dictionaries must equal the exact
isolated QA permissions. This verification repeats on the installed simulator
bundle; its CodeDirectory hash, binary hash and both section hashes must match
the built app. Raw XML/DER sections, decoded DER, host-signature receipts and
their hashes are retained with the archive hash. Maestro still clears app state
and must actually launch the app and pass the native SecureStore probe. No device
provisioning profile, owner signing key, IPA or App Store signature is used.

Maestro is downloaded from its official release with a pinned SHA-256 digest.
The workflow installs the application and runs two independent Maestro flows.
The first exercises the guest UI and real native AES-256-GCM, authenticated-data,
SecureStore and encrypted-file operations.
Ciphertext alteration and a different authenticated scope must be rejected.
The probe deletes its synthetic key and file in a `finally` block.

The second opens the seven actual product screens (account, credentials, trips,
bookings, training, finance and notifications), waits for their loaded records,
and captures each in Arabic and English. A loopback-only HTTP fixture supplies
explicitly synthetic records and blocks business mutations. It is not imported
by the product or the API. These checks establish native navigation/rendering;
the separate D05 real-React and actual Nest/PostgreSQL suites establish actions
and server contracts. No real booking, charge, notification delivery or provider
approval is created by the virtual-device flow.

The artifact `acceptance.json` is produced only after successful compilation,
installation, both passing JUnit flows with no failed or skipped cases, and all
17 required screenshots (three guest/capability images and 14 bilingual product
images). Package hashes, source commit/tree, dependency versions, native environment and
screenshots are retained as workflow artifacts for 14 days. Small evidence
bundles (`native-android-acceptance-evidence` and
`native-ios-acceptance-evidence`) are separate from the compiled Android packages
and iOS simulator application. Inspect the actual
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
