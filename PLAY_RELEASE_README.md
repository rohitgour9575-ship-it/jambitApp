# Jambit Android Play Release

## Project identity

- Android application ID: `com.jambit`
- Current version code: `1`
- Current version name: `1.0`
- Production API: `https://jambit.in/api`

Do not change the application ID without also updating Google Play, Firebase, Google Sign-In, and push notification configuration. Increment `versionCode` in `android/app/build.gradle` before every later Play upload.

## Install dependencies

Use JDK 17, the Android SDK required by React Native, and a supported Node.js version.

```powershell
npm ci
```

The archive intentionally excludes `node_modules`, generated build folders, local environment files, screenshots, and signing keys.

## Configure signing

Release signing is provided through environment variables so credentials are never committed to source control:

```powershell
$env:JAMBIT_UPLOAD_STORE_FILE = 'C:\secure\jambit-upload-key.jks'
$env:JAMBIT_UPLOAD_STORE_PASSWORD = '<store password>'
$env:JAMBIT_UPLOAD_KEY_ALIAS = 'jambit-upload'
$env:JAMBIT_UPLOAD_KEY_PASSWORD = '<key password>'
$env:JAMBIT_API_BASE_URL = 'https://jambit.in/api'
```

Keep the upload keystore and its credentials private. Google Play App Signing can protect the distribution key, but future releases still require the same upload key unless it is reset through Play Console.

## Build

Run clean and release builds as separate Gradle invocations. This avoids stale prefab task ordering in React Native native modules.

```powershell
cd android
.\gradlew.bat clean --no-daemon
.\gradlew.bat bundleRelease assembleRelease --no-daemon
```

Artifacts are generated at:

- Play Store AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- Direct-install APK: `android/app/build/outputs/apk/release/app-release.apk`

Upload the `.aab` to Google Play Console. The APK is for direct client testing and is not the preferred Play Store artifact.
