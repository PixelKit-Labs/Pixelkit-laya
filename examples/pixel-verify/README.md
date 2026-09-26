# Pixel Laya verification app

This Expo SDK 57 Android development app exercises `@pixelkit-labs/laya/mobile`
with native ONNX Runtime. It is an example and evaluation harness, not part of
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
The checked-in `plugins/with-laya-android.cjs` preserves ONNX React package
registration, a short native build staging path, and 16 KB page support during
prebuild. When building from a Windows `subst` drive, also pass
`'-Pkotlin.incremental=false'` to Gradle to avoid Kotlin cross-drive cache errors.
The repository CI repeats the typecheck and Android debug APK build on Linux;
the model and physical Pixel are intentionally outside that build gate.

## What the examples prove

| Use case | Suggested decision | What it does not do |
| --- | --- | --- |
| Support routing | billing, technical, sales, review | Send tickets or issue refunds |
| Notification triage | now, later, quiet, review | Send or silence notifications |
| Assistant intent | reminder, calendar, search, review | Execute tools or extract complete tool arguments |

Choose a use case, edit the message, then tap **Classify message**. Custom inputs
have no assumed ground truth and never receive a pass/fail label. A model
probability describes its chosen answer, not measured accuracy. The `review`
option is a learned choice, not a reliable abstention or security boundary.

**Run 24 examples** runs 18 basic and 6 challenge cases with labels defined in
`cases.ts` before evaluating the checkpoint. Each case records expected/actual
labels, probability distribution, elapsed time, and any error. Failures remain
visible and errors stay in the denominator. Results include per-use-case and
basic/challenge summaries. These are small, authored examples, not an independent
held-out dataset; do not generalize the correct-answer fraction to production.

The app saves `laya-evaluation.json` in its private document directory after a
completed suite, overwriting the previous saved suite. **Share evaluation report**
opens Android's share sheet with the JSON. It includes the expected checkpoint
revision, suite definitions/version, SDK version, requested provider, model file
bytes, model load time, first-decision time, median/p95 decision latency, and all
case results. Local file hashes must be checked separately. Model file bytes are
not RAM usage; process memory is `null` unless separately measured. Latencies
include JavaScript tokenization and inference, include the first decision, and
exclude failed calls from latency percentiles. No repeated warm benchmark is implied.

Provider selection lives under **Model setup**. CPU is the baseline. NNAPI or
XNNPACK selection does not prove hardware placement or acceleration; providers
can fall back to CPU. Do not infer parity from matching one answer.

## Repeatable checks

The [recorded Pixel 11 Pro run](results/README.md) scored 15/24, including 1/6
challenge cases. Inspect the failures before considering any automated actions.

- `npm run typecheck` in this app checks the UI and evaluator types.
- `npm test -- --run` in the SDK runs evaluator accounting/validation tests with
  fake inference, alongside the existing SDK suite. These are not model-quality tests.
- On a device with the verified model files, tap **Run 24 examples** and inspect
  the saved report. Repeat after checkpoint or prompt changes without changing
  labels to fit predictions. Use a separate held-out dataset for product decisions.

The ADB UI flow was explored on a Pixel 11 Pro with explicit user authorization
to substitute ADB for unavailable ARTEMIS in this session. Automated device-test
code and general device-parity claims are not included.
