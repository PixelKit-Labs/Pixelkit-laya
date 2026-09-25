# Pixel Laya verification app

This Expo SDK 57 Android development app exercises `@pixelkit-labs/laya/mobile`
with native ONNX Runtime. It is an example and measurement harness, not part of
the npm package. Inference runs locally; the app makes no model download or
inference request.

The first baseline uses the Apache-2.0
[`inferenceprince/laya-onnx-int8`](https://huggingface.co/inferenceprince/laya-onnx-int8)
export at revision `24e078dd26307a67ab2d6aaf79210f014c8ff46d`. It is an
independent conversion of Laya weights by Convai Innovations. Keep
`model.onnx`, `model.onnx.data`, `rl_agent_config.json`, and the checkpoint's
`tokenizer/tokenizer.json` together; copy the last file as `tokenizer.json`.
The model is not committed or packaged. The published SHA-256 digests are:

| File | SHA-256 |
| --- | --- |
| `model.onnx` | `ec1f61700829a73ea9f46e2401f79d654266472dedc33119d2781ca86085e71e` |
| `model.onnx.data` | `5a310b324a18bd517ba96192bfa6c061c23e0f047a28c7f157a22730fc94b85e` |

The app displays its private document directory on screen. Stage all four files
in its `laya` subdirectory before running inference. The Android application
ID is `com.pixelkit.layaverify`.

## Build

```sh
npm ci
npm run typecheck
npx expo prebuild --platform android --no-install
cd android
./gradlew assembleDebug
```

On Windows, build from a short workspace path to avoid a CMake path limit in
the ONNX Runtime native dependency. `npm ci` applies the exact Gradle 9
compatibility fix in `scripts/fix-ort-gradle.cjs`. The generated `android/`
directory and model artifacts stay out of git.

The app runs six identical decisions and shows session load time, first
inference time, five warm times, selected provider, and answer. Compare CPU,
XNNPACK, and NNAPI only after confirming the same answer and probabilities.
Device results are pending verification on the Pixel 11 Pro.
