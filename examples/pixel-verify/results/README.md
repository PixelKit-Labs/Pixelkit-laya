# Pixel 11 Pro evaluation, suite v1

Captured on 2026-09-26 from the app's saved report, using requested provider CPU
and checkpoint `inferenceprince/laya-onnx-int8` at
`24e078dd26307a67ab2d6aaf79210f014c8ff46d`. The graph/weights SHA-256 values
were verified on the device against the example README before this evaluation.
See [the complete report](pixel-11-pro-suite-v1.json) for fixed prompts, labels,
probability distributions, and every failure.

| Cases | Correct | Wrong | Runtime errors |
| --- | ---: | ---: | ---: |
| All | 15/24 | 9 | 0 |
| Basic | 14/18 | 4 | 0 |
| Challenge | 1/6 | 5 | 0 |
| Support routing | 6/8 | 2 | 0 |
| Notification triage | 4/8 | 4 | 0 |
| Assistant intent | 5/8 | 3 | 0 |

Model load: 1,011 ms. First decision: 221 ms. Median decision: 205 ms; p95:
221 ms. These are end-to-end JS tokenization/inference timings for different
messages in a debug app, not a repeated warm microbenchmark. The previous
single-message smoke example used only three support labels; its ~90–104 ms warm
timings are not directly comparable to these four-label questions and longer prompts.

The model missed negation, unclear intent, time prioritization, and multiple
requests. In particular, “Do not set a reminder. I already called Sam.” returned
`reminder` with probability 0.9342. `review` is not reliable abstention. These
results do not justify unattended action execution, and probabilities must not
be treated as correctness guarantees. Expected answers were not changed after
observing predictions. No model weights or SDK inference logic were changed.

A later `adb shell dumpsys meminfo com.pixelkit.layaverify` snapshot, after the
session was disposed and the app had been reopened, reported TOTAL PSS 392,902 KB,
TOTAL RSS 393,528 KB, and TOTAL SWAP PSS 144,860 KB. This is whole debug-process
memory at that moment, not peak inference memory, a before/after delta, or the
model's isolated RAM footprint. The report's in-run memory field remains null.

UI exploration used ADB screenshots and UI XML with the user's explicit approval
to substitute it for unavailable ARTEMIS. SDK evaluator tests use fake inference
and verify accounting, malformed-output handling, and non-leakage of labels;
they do not validate the model's answers. No cross-device/provider parity claim
is made.
