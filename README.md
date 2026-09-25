# @pixelkit-labs/laya

Source: [PixelKit Labs / Pixelkit-laya](https://github.com/PixelKit-Labs/Pixelkit-laya).

[![CI](https://github.com/PixelKit-Labs/Pixelkit-laya/actions/workflows/ci.yml/badge.svg)](https://github.com/PixelKit-Labs/Pixelkit-laya/actions/workflows/ci.yml)

Local typed decisions for TypeScript and React Native. This standalone SDK is
adapted from [Laya](https://github.com/NandhaKishorM/laya) by Convai Innovations.
See [NOTICE](NOTICE) and [LICENSE](LICENSE) for attribution and terms.

The package contains the decision API, tokenization, language routing, hooks,
and ONNX inference adapters. It does **not** include model weights or a hosted
inference service. A host app supplies compatible split ONNX artifacts:
`encoder.onnx`, `head.onnx`, `tokenizer.json`, and `rl_agent_config.json` from
the same checkpoint revision. The existing Laya exporter documents their
format; model export is an offline preparation step outside this TypeScript SDK.

## React Native on a Pixel

Install `onnxruntime-react-native` in the host app and use a development build
with its native module. Copy model files into app-private storage and pass their
absolute local paths. The host app decides whether to bundle or download those
files; prediction never contacts a server.

```ts
import * as ort from "onnxruntime-react-native";
import { loadMobileAgent } from "@pixelkit-labs/laya/mobile";

const agent = await loadMobileAgent(ort, {
  encoderPath: localEncoderPath,
  headPath: localHeadPath,
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

The default execution provider is CPU. You can pass
`{ executionProvider: "xnnpack" }` or `{ executionProvider: "nnapi" }` as the
third argument after measuring that provider with your checkpoint on the phone.
The Android adapter has not yet been verified with a real Laya checkpoint on a
Pixel; its current gate is the TypeScript build and shared decision tests.

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
