const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const appJsonPath = path.join(__dirname, '..', 'app.json');

if (!fs.existsSync(appJsonPath)) {
  console.error('Error: app.json not found.');
  process.exit(1);
}

// 1. Read app.json
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const currentVersion = appJson.expo.version || '1.0.0';
const currentVersionCode = appJson.expo.android?.versionCode || 1;
const currentBuildNumber = parseInt(appJson.expo.ios?.buildNumber || '1', 10);

const nextVersionCode = currentVersionCode + 1;
const nextBuildNumber = currentBuildNumber + 1;

// 2. Update app.json versions
if (!appJson.expo.android) appJson.expo.android = {};
appJson.expo.android.versionCode = nextVersionCode;

if (!appJson.expo.ios) appJson.expo.ios = {};
appJson.expo.ios.buildNumber = nextBuildNumber.toString();

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');
console.log(`\n🚀 Version Code / Build Number Auto-Incremented:`);
console.log(`   - Version: ${currentVersion}`);
console.log(`   - Android Version Code: ${currentVersionCode} -> ${nextVersionCode}`);
console.log(`   - iOS Build Number: ${currentBuildNumber} -> ${nextBuildNumber}\n`);

// 3. Prebuild Android
console.log('📦 Running Expo Prebuild for Android...');
try {
  execSync('LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo prebuild --platform android --clean', { stdio: 'inherit' });
} catch (err) {
  console.error('Error during Expo prebuild:', err.message);
  process.exit(1);
}

// 4. Assemble Release APK
console.log('🔨 Compiling Android Release APK...');
try {
  execSync('cd android && ./gradlew assembleRelease && cd ..', { stdio: 'inherit' });
} catch (err) {
  console.error('Error during gradlew assembleRelease:', err.message);
  process.exit(1);
}

// 5. Rename output APK
const sourceApk = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const buildsDir = path.join(__dirname, '..', 'builds');

if (!fs.existsSync(buildsDir)) {
  fs.mkdirSync(buildsDir);
}

if (fs.existsSync(sourceApk)) {
  const appName = (appJson.expo.name || 'mobile').replace(/\s+/g, '_');
  const destName = `${appName}_v${currentVersion}_build${nextVersionCode}.apk`;
  const destApk = path.join(buildsDir, destName);
  fs.copyFileSync(sourceApk, destApk);
  console.log(`\n🎉 Success! APK generated and renamed:`);
  console.log(`👉 ${destApk}\n`);
} else {
  console.error('\n❌ Error: Output APK not found at default location (android/app/build/outputs/apk/release/app-release.apk).');
}
