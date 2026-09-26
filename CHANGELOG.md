# Changelog

## 0.1.8

- Fix SDK CI test collection by explicitly using the root TypeScript configuration in Vitest; evaluator tests no longer require the example's Expo dependencies.
- Update README installation and test setup guidance. Model behavior and public decision APIs are unchanged.

## 0.1.7

- Replace the single-message Pixel demo with editable support routing, notification triage, and assistant intent examples.
- Add 24 predeclared evaluation cases, per-case failures, latency summaries, and a local JSON report; distinguish curated correctness from model probabilities and general accuracy.
- Test evaluation error accounting, malformed outputs, timing summaries, and separation of expected labels from inference inputs.
- Preserve ONNX React package registration and native page-size/build-path settings through Expo prebuild.
- Update README and the local PixelKit guide. Public decision APIs are unchanged.

## 0.1.6

- Require SDK and CI changes to bump the version and update README and CHANGELOG in the same change set.
- Check the PixelKit docs Laya guide against the SDK version and public imports before CI or release passes.
- Review README and the public guide for the new documentation gate; inference behavior is unchanged.

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
