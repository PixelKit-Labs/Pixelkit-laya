// Adapted from Laya (https://github.com/NandhaKishorM/laya), Apache-2.0.
// PixelKit Labs added this local React Native ONNX adapter.
import { Agent, tokenizerFromHF, type AgentCfg, type AgentOptions } from "./agent-core.js";
import type { Batch, FusedSessionProvider, SplitSessionProvider } from "./providers.js";
import { feed, feedFused, feedHead, pickOutput, toNested } from "./tensors.js";

/** The small ONNX Runtime surface used by the mobile adapter. Pass `onnxruntime-react-native`. */
export interface MobileOrtRuntime {
  Tensor: new (...args: any[]) => any;
  InferenceSession: {
    create(...args: any[]): Promise<any>;
  };
}

export interface MobileModelArtifacts {
  /** Absolute local file paths. The host app owns model installation and updates. */
  encoderPath: string;
  headPath: string;
  /** Parsed rl_agent_config.json. */
  config: AgentCfg;
  /** Parsed tokenizer.json from the same checkpoint revision. */
  tokenizerJson: unknown;
  revision?: string | null;
}

export interface MobileFusedArtifacts {
  /** Absolute local model.onnx path; keep any model.onnx.data beside it. */
  modelPath: string;
  config: AgentCfg;
  tokenizerJson: unknown;
  revision?: string | null;
}

export interface MobileLoadOptions extends Omit<AgentOptions, "provider" | "tok" | "cfg" | "revision"> {
  /** CPU is the compatibility baseline; benchmark XNNPACK and NNAPI on the target model. */
  executionProvider?: "cpu" | "xnnpack" | "nnapi";
}

/** Run split ONNX graphs on-device, with no network or Node filesystem dependency. */
export async function createMobileProvider(
  ort: MobileOrtRuntime,
  artifacts: Pick<MobileModelArtifacts, "encoderPath" | "headPath">,
  executionProvider: "cpu" | "xnnpack" | "nnapi" = "cpu",
): Promise<SplitSessionProvider> {
  if (!artifacts.encoderPath || !artifacts.headPath) {
    throw new Error("Mobile Laya needs local encoderPath and headPath files");
  }
  const encoder = await ort.InferenceSession.create(artifacts.encoderPath, {
    executionProviders: [executionProvider],
  });
  let head: Awaited<ReturnType<typeof ort.InferenceSession.create>>;
  try {
    head = await ort.InferenceSession.create(artifacts.headPath, { executionProviders: ["cpu"] });
  } catch (error) {
    await encoder.release?.();
    throw error;
  }
  return {
    runEncoder: async (batch: Batch) => {
      const result = await encoder.run(feed(ort, batch));
      const output = pickOutput(result, ["last_hidden_state", "lastHidden", "hidden_states"]);
      return { lastHidden: toNested(output.data, output.dims) };
    },
    runHead: async (hidden, batch: Batch) => {
      const result = await head.run(feedHead(ort, hidden, batch));
      const outputs = Object.values(result);
      const logits = pickOutput(result, ["logits"]);
      const act = result.act_logits ?? result.act ?? outputs[1] ?? outputs[0];
      return { logits: toNested(logits.data, logits.dims), act: toNested(act.data, act.dims) };
    },
    release: async () => {
      await Promise.all([encoder.release?.(), head.release?.()]);
    },
  };
}

/** Run a fused encoder and decision head in one native call. */
export async function createMobileFusedProvider(
  ort: MobileOrtRuntime,
  modelPath: string,
  padId: number,
  executionProvider: "cpu" | "xnnpack" | "nnapi" = "cpu",
): Promise<FusedSessionProvider> {
  if (!modelPath || !Number.isInteger(padId) || padId < 0) {
    throw new Error("Mobile fused Laya needs a local modelPath and tokenizer pad ID");
  }
  const session = await ort.InferenceSession.create(modelPath, {
    executionProviders: [executionProvider],
  });
  return {
    runBatch: async (batch: Batch) => {
      const result = await session.run(feedFused(ort, batch, padId), ["logits", "act_logits"]);
      const logits = result.logits;
      const act = result.act_logits;
      if (!logits || !act) throw new Error("Fused Laya model must return logits and act_logits");
      return { logits: toNested(logits.data, logits.dims), act: toNested(act.data, act.dims) };
    },
    release: async () => { await session.release?.(); },
  };
}

/** Create an Agent from local mobile artifacts supplied by the host app. */
export async function loadMobileAgent(
  ort: MobileOrtRuntime,
  artifacts: MobileModelArtifacts,
  options: MobileLoadOptions = {},
): Promise<Agent> {
  const tokenizer = tokenizerFromHF(artifacts.tokenizerJson);
  if (!tokenizer) throw new Error("Incompatible model: tokenizerJson is missing or invalid");
  const provider = await createMobileProvider(ort, artifacts, options.executionProvider);
  const { executionProvider: _executionProvider, ...agentOptions } = options;
  return new Agent({
    ...agentOptions,
    provider,
    tok: tokenizer,
    cfg: artifacts.config,
    revision: artifacts.revision ?? null,
  });
}

/** Load a local fused ONNX export; model weights stay outside the npm package. */
export async function loadMobileFusedAgent(
  ort: MobileOrtRuntime,
  artifacts: MobileFusedArtifacts,
  options: MobileLoadOptions = {},
): Promise<Agent> {
  const tokenizer = tokenizerFromHF(artifacts.tokenizerJson);
  if (!tokenizer) throw new Error("Incompatible model: tokenizerJson is missing or invalid");
  const provider = await createMobileFusedProvider(
    ort, artifacts.modelPath, tokenizer.padId, options.executionProvider,
  );
  const { executionProvider: _executionProvider, ...agentOptions } = options;
  return new Agent({
    ...agentOptions,
    provider,
    tok: tokenizer,
    cfg: artifacts.config,
    revision: artifacts.revision ?? null,
  });
}
