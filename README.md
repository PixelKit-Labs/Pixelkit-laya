# @pixelkit-labs/laya

Source: [PixelKit Labs / Pixelkit-laya](https://github.com/PixelKit-Labs/Pixelkit-laya).

[![CI](https://github.com/PixelKit-Labs/Pixelkit-laya/actions/workflows/ci.yml/badge.svg)](https://github.com/PixelKit-Labs/Pixelkit-laya/actions/workflows/ci.yml)

Local typed decisions for TypeScript and React Native. This standalone SDK is
adapted from [Laya](https://github.com/NandhaKishorM/laya) by Convai Innovations.
See [NOTICE](NOTICE) and [LICENSE](LICENSE) for attribution and terms.

Laya takes text, a question, and a set of allowed answers, then returns a
decision and model probabilities. Use it to suggest a category, route a request,
or select a possible feature inside your own application. Inference runs in
your process or on your user's device.

## Laya Decision Lab

**Laya Decision Lab is a place to build and evaluate small, on-device text
decisions.** The [Android example](examples/pixel-verify/README.md) is the
working starting point. Its central question is:

> Can this local model reliably make this specific decision for my application?

The SDK provides inference; the Lab makes its behavior inspectable. The workflow
is to define a decision, try representative messages, and measure predictions
against expected answers before integrating them into a product.

| Use case | Suggested decision | Available in the Lab |
| --- | --- | --- |
| Support inbox | Billing, technical support, sales, or review | Yes |
| Notification triage | Attention now, later, quiet, or review | Yes; no notification is sent or silenced |
| Assistant interface | Reminder, calendar, search, or review | Yes; no tool is executed |
| Personal notes | A category for a note | Define your own questions and cases |
| Customer feedback | Bug, feature request, or praise | Define your own questions and cases |
| Document inbox | A workflow for a document's text | Define your own questions and cases |

The current app lets you select a predefined use case, edit its input text, run
24 labeled examples, inspect mistakes, and share the evaluation report. Define
new questions, answer descriptions, and expected labels in
[`cases.ts`](examples/pixel-verify/cases.ts). A visual decision editor, correction
collection, and report comparison UI are future extensions; they are not
implemented in the current app.

A useful first product integration is a **support-ticket sorting assistant**:
show a suggested team, let a person confirm or correct it, and collect those
corrections as evaluation examples. The host application owns that review flow
and storage. Adding examples to the Lab evaluates the model; it does not train it.

## What the current evaluation tells us

The [recorded Pixel 11 Pro CPU run](examples/pixel-verify/results/README.md)
completed all 24 authored cases with no runtime errors:

| Case group | Correct |
| --- | ---: |
| Basic | 14/18 |
| Challenge | 1/6 |
| Total | 15/24 |

Median decision latency was 205 ms and p95 was 221 ms for this debug-app run,
including text processing and the first decision. These results describe this
checkpoint, question set, and phone; they are not general accuracy or performance
guarantees.

Negation, unclear requests, and multiple intents exposed mistakes. For example,
“Do not set a reminder. I already called Sam.” returned `reminder` with probability
0.9342. A high model probability is not proof of correctness, and a `review`
answer option does not guarantee abstention. Start with suggestions people can
review. Evaluate any confidence threshold on a separate labeled dataset before
using it to control automatic actions.

## Integrating the SDK

The package contains the decision API, tokenization, language routing, hooks,
and ONNX inference adapters. It does **not** include model weights or a hosted
inference service. A host app supplies a compatible fused `model.onnx` graph,
its `model.onnx.data` weights if present, `tokenizer.json`, and
`rl_agent_config.json` from the same checkpoint revision. The split-graph
adapter remains available for `encoder.onnx` and `head.onnx` exports.

The integration flow is:

1. Supply compatible model artifacts and verify their revision and hashes.
2. Define the question and allowed answers in application code.
3. Load an agent and pass text to `predict`.
4. Present the suggestion and alternatives in your UI. Handle inference errors
   by leaving the decision available for manual review.
5. Reuse the loaded agent for subsequent decisions, then call `dispose()` when
   the owning screen or service is finished with it.

The host app owns model installation, UI, permissions, correction storage, and
any downstream action. Choosing `calendar`, for example, selects a label; the
app must separately obtain event details and confirmation before creating an
event. Laya's typed decision path supports choices, bounded scores, and yes/no
questions; it does not generate free-form replies. The example uses Laya ONNX
weights and contains no Gemini Nano integration.

### Install from this checkout

Build and pack the SDK from this repository:

```sh
npm ci
npm run build
npm pack
```

Then install that tarball and the runtime in your React Native host app. Replace
the tarball path with the location printed by `npm pack`:

```sh
npm install /path/to/pixelkit-labs-laya-0.1.7.tgz
npm install onnxruntime-react-native@1.24.3
```

The bundled example instead uses a local `file:../..` dependency. See its
[build instructions](examples/pixel-verify/README.md#build) for the pinned Expo
setup and native compatibility patches used by the verified Android build.

### React Native on a Pixel

Install `onnxruntime-react-native` in the host app and use a development build
with its native module. Copy model files into app-private storage and pass their
absolute local paths. Keep `model.onnx.data` beside `model.onnx` when the graph
uses external weights. The host app decides whether to bundle or download the
files; prediction never contacts a server.

For Expo, use a native development build with ONNX Runtime installed. Expo Go
does not contain the required native module. The example's
[`with-laya-android.cjs`](examples/pixel-verify/plugins/with-laya-android.cjs)
preserves native package registration and build settings across prebuilds;
follow that setup when adapting this Expo example.

In the following code, `localModelPath` is an absolute filesystem path, and
`parsedAgentConfig` and `parsedTokenizerJson` are the parsed contents of the
matching local files. See the [example model setup](examples/pixel-verify/README.md)
for the pinned checkpoint and artifact hashes.

```ts
import * as ort from "onnxruntime-react-native";
import { loadMobileFusedAgent } from "@pixelkit-labs/laya/mobile";

const agent = await loadMobileFusedAgent(ort, {
  modelPath: localModelPath,
  config: parsedAgentConfig,
  tokenizerJson: parsedTokenizerJson,
}, { executionProvider: "cpu" });

// Call this for each ticket while the owning screen/service keeps the agent loaded.
async function suggestDepartment(text: string) {
  if (!text.trim()) throw new Error("Enter a support request.");
  const result = await agent.predict(text, {
    department: {
      type: "choice",
      instructions: "Choose the team for the actual request. Use review when unclear.",
      criteria: {
        billing: "existing invoices, payments, refunds",
        technical: "bugs, outages, login problems",
        sales: "new purchases and pricing",
        review: "unclear, unrelated, or multiple teams needed",
      },
    },
  });
  const answer = result.answers.department;
  if (!answer || answer.type !== "choice") throw new Error("No department decision.");
  return {
    suggestedDepartment: answer.choice,
    modelProbability: answer.probabilities[answer.choice],
    alternatives: answer.probabilities,
  };
}

try {
  const suggestion = await suggestDepartment("Please refund the duplicate charge");
  console.log(suggestion); // Present for user review; no ticket is moved here.
} finally {
  // This one-request example is finished. A host app disposes on owner teardown.
  await agent.dispose();
}
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

### Node and web

The main entry point retains the existing TypeScript `Agent`, `Router`, and
decision helpers. Node and web ONNX adapters remain available for parity and
non-mobile consumers. Install `onnxruntime-node` or `onnxruntime-web` in the
host project for the adapter you use. The current `Agent.load` path uses split
`encoder.onnx` and `head.onnx` exports with the matching config and tokenizer;
the fused mobile checkpoint is not a drop-in artifact set for this loader:

```ts
import { Agent } from "@pixelkit-labs/laya";
const agent = await Agent.load("./model");
try {
  // Use agent.predict(text, questions) as above.
} finally {
  await agent.dispose();
}
```

For local-only Node setup, pass an existing model directory. In browsers the web
adapter fetches model assets from the supplied base URL and runs inference in
the browser; asset delivery and cache/offline behavior belong to the host app.

## Evaluating your own integration

Define expected labels before running inference. Include ordinary messages,
paraphrases, irrelevant text, negation, unclear requests, and messages containing
instructions that conflict with your routing rules. Keep development examples
separate from a held-out set used to judge changes.

Use the Lab's saved reports to compare the same inputs across question changes,
checkpoint revisions, or requested execution providers. Preserve wrong answers
and runtime errors in the results, and inspect failures by category as well as
the total score. Any user correction collection or automated report comparison
must currently be implemented by the host app or performed outside the Lab.

## Development and releases

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
