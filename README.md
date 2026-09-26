# @pixelkit-labs/laya

Source: [PixelKit Labs / Pixelkit-laya](https://github.com/PixelKit-Labs/Pixelkit-laya).

[![CI](https://github.com/PixelKit-Labs/Pixelkit-laya/actions/workflows/ci.yml/badge.svg)](https://github.com/PixelKit-Labs/Pixelkit-laya/actions/workflows/ci.yml)

Local typed decisions for TypeScript and React Native. This standalone SDK is
adapted from [Laya](https://github.com/NandhaKishorM/laya) by Convai Innovations.
See [NOTICE](NOTICE) and [LICENSE](LICENSE) for attribution and terms.

The package contains the decision API, tokenization, language routing, hooks,
and ONNX inference adapters. It does **not** include model weights or a hosted
inference service. A host app supplies a compatible fused `model.onnx` graph,
its `model.onnx.data` weights if present, `tokenizer.json`, and
`rl_agent_config.json` from the same checkpoint revision. The split-graph
adapter remains available for `encoder.onnx` and `head.onnx` exports.

## React Native on a Pixel

Install `onnxruntime-react-native` in the host app and use a development build
with its native module. Copy model files into app-private storage and pass their
absolute local paths. Keep `model.onnx.data` beside `model.onnx` when the graph
uses external weights. The host app decides whether to bundle or download the
files; prediction never contacts a server.

```ts
import * as ort from "onnxruntime-react-native";
import { loadMobileFusedAgent } from "@pixelkit-labs/laya/mobile";

const agent = await loadMobileFusedAgent(ort, {
  modelPath: localModelPath,
  config: parsedAgentConfig,
  tokenizerJson: parsedTokenizerJson,
});

const result = await agent.predict("Please refund the duplicate charge", {
  department: {
    type: "choice",
    instructions: "Which department should handle this?",
    criteria: { billing: "payments and refunds", other: "everything else" },
  },
});
console.log(result.answers.department);
await agent.dispose();
```

For split exports, use `loadMobileAgent` with `encoderPath` and `headPath`.
The default execution provider is CPU. You can pass
`{ executionProvider: "xnnpack" }` or `{ executionProvider: "nnapi" }` as the
third argument after measuring that provider with your checkpoint on the phone.
The Android example has completed a local CPU smoke run with a real checkpoint
on a Pixel 11 Pro. This is not a general accuracy or cross-provider parity claim.
CI checks the SDK and builds the Android verification app from a locked install.
The [Pixel verification example](examples/pixel-verify/README.md) builds an
Android development app for a pinned public fused checkpoint. The fused path
has passed a local ONNX Runtime smoke run.

The example now offers editable support routing, notification triage, and
assistant intent selection. **Run 24 examples** compares predictions with
predeclared expected labels, includes runtime errors in the failure count, and
saves a JSON report with every input, expected/actual answer, probability, and
latency. Six cases probe negation, ambiguity, multiple intents, and misleading
instructions. These authored cases demonstrate behavior; they are not a held-out
accuracy benchmark. No notification, calendar, or reminder action is executed.

## Node and web

The main entry point retains the existing TypeScript `Agent`, `Router`, and
decision helpers. Node and web ONNX adapters remain available for parity and
non-mobile consumers. Install `onnxruntime-node` or `onnxruntime-web` in the
host project for the adapter you use:

```ts
import { Agent } from "@pixelkit-labs/laya";
const agent = await Agent.load("./model");
```

Run `npm run build`, `npm test -- --run`, and `npm run test:package` before
publishing. This folder is the new SDK workspace; the Python project elsewhere
in the repository is a reference during the migration and is not packaged.
See [RELEASING.md](RELEASING.md) for the PixelKit Labs CI and release gates.
Manual release workflow runs validate and pack only. npm publication requires
a maintainer-requested `v<version>` tag matching the package version.
The release workflow checks the `PIXELKIT` GitHub Actions secret with npm before
packing, so a missing or expired token fails the release early.
CI also requires SDK and workflow changes to bump the version and include README and CHANGELOG
updates. CI and release check that the [PixelKit Laya guide](https://github.com/PixelKit-Labs/pixelkit-docs/blob/main/docs/guides/laya.md)
names this package version and imports existing SDK exports. Update that guide
before pushing a matching SDK version; run `npm run check:docs` to check locally.
