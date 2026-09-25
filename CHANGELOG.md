# Changelog

## 0.1.5

- Add an Android CI job that installs the verification app from its lockfile, typechecks it, generates the native project, and builds a debug APK.
- Review README and the Pixel verification guide for the new build gate; on-device parity and performance remain pending.

## 0.1.4

- Add a fused mobile ONNX loader for single-graph Laya exports. It runs the encoder and decision heads in one native call, with the graph's required minimum padding.
- Make the fused loader the recommended mobile path in README; retain the split loader for compatible exports.
- Add an Expo Android verification app and a reproducible Gradle 9 compatibility fix for ONNX Runtime React Native 1.24.3.
- Review release instructions; the tag, npm credential, and provenance gates are unchanged.

## 0.1.3

- Validate the configured npm credential during manual and tagged release runs before packing or publishing.
- Update README and release instructions for the credential check; public SDK behavior is unchanged.

## 0.1.2

- Restrict npm publication to a matching version tag; manual release runs only validate and pack.
- Review the README against the current API and clarify the release guard there.

## 0.1.1

- Verify local ONNX files and requested digests before loading the optional Node runtime.
- Record the public PixelKit Labs repository location after the requested rename.
- Require README and changelog review on every change and document release gates.

## 0.1.0

- Started the standalone `@pixelkit-labs/laya` TypeScript SDK from the Laya TypeScript decision engine.
- Added a local React Native ONNX adapter for split Laya checkpoints.
- Preserved the Apache-2.0 license and added upstream attribution.
