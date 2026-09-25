// ONNX Runtime React Native 1.24.3 still uses VersionNumber, removed by Gradle 9.
// Keep this exact patch until an upstream release builds with Expo SDK 57.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packageRoot = path.join(root, 'node_modules', 'onnxruntime-react-native');
const version = require(path.join(packageRoot, 'package.json')).version;
if (version !== '1.24.3') throw new Error(`Review the ONNX Gradle patch for version ${version}`);

const gradleFile = path.join(packageRoot, 'android', 'build.gradle');
const before = 'if (VersionNumber.parse(REACT_NATIVE_VERSION) < VersionNumber.parse("0.71")) {';
const after = [
  "// Gradle 9 removed VersionNumber; only React Native below 0.71 needs these headers.",
  "def reactParts = REACT_NATIVE_VERSION.tokenize('.')",
  'if (reactParts[0].toInteger() == 0 && reactParts[1].toInteger() < 71) {',
].join('\n  ');
const source = fs.readFileSync(gradleFile, 'utf8');
const occurrences = source.split(before).length - 1;
if (occurrences === 1) {
  fs.writeFileSync(gradleFile, source.replace(before, after));
  console.log('Applied ONNX Runtime Gradle 9 compatibility patch');
} else if (occurrences !== 0 || !source.includes(after)) {
  throw new Error('ONNX Runtime Gradle source changed; review the compatibility patch');
}
