// Adapted from Laya (https://github.com/NandhaKishorM/laya), Apache-2.0.
// PixelKit Labs split the shared Agent from Node/web artifact loading for mobile bundlers.
import { Agent as BaseAgent, tokenizerFromHF, type AgentCfg, type AgentOptions } from "./agent-core.js";
import type { SessionProvider } from "./providers.js";

export { QTYPES, checkQuestion, toInternal, defaultTokenizer, tokenizerFromHF } from "./agent-core.js";
export type {
  QuestionDef, ActionInfo, ChoiceAnswer, ScoreAnswer, NoulAnswer, SystemAnswer,
  SystemUsage, SystemOneResult, AgentCfg, AgentOptions, PredictOptions,
} from "./agent-core.js";

/** Node and browser Agent, including local/Hub artifact loading. */
export class Agent extends BaseAgent {
  static async load(
    modelDirOrRepo: string,
    opts?: {
      device?: string;
      subfolder?: string | null;
      localDir?: string;
      token?: string | null;
      numThreads?: number;
      lang_temperatures?: AgentOptions["lang_temperatures"];
      revision?: string | null;
      expectedSha256?: Record<string, string>;
    },
  ): Promise<Agent> {
    const sub = opts?.subfolder ?? null;
    const isBrowser = typeof (globalThis as { window?: unknown }).window !== "undefined";
    let cfg: AgentCfg = {};
    let tokenizerJson: unknown | null = null;
    let dir = opts?.localDir ?? modelDirOrRepo;
    let revision: string | null = null;
    let provider: SessionProvider;
    if (isBrowser) {
      const { loadWebBundle, createWebProvider } = await import("./providers.js");
      const bundle = await loadWebBundle(modelDirOrRepo, {
        subfolder: sub,
        revision: opts?.revision,
        expectedSha256: opts?.expectedSha256,
      });
      cfg = bundle.cfg;
      tokenizerJson = bundle.tokenizerJson;
      dir = bundle.dir;
      revision = bundle.revision;
      provider = await createWebProvider(dir, {
        numThreads: opts?.numThreads,
        expectedSha256: opts?.expectedSha256,
      });
    } else {
      const { loadNodeBundle, createNodeProvider } = await import("./providers.js");
      const bundle = await loadNodeBundle(modelDirOrRepo, {
        subfolder: sub,
        localDir: opts?.localDir,
        token: opts?.token,
        revision: opts?.revision,
        expectedSha256: opts?.expectedSha256,
      });
      cfg = bundle.cfg;
      tokenizerJson = bundle.tokenizerJson;
      dir = bundle.dir;
      revision = bundle.revision;
      provider = await createNodeProvider(dir, {
        device: opts?.device, numThreads: opts?.numThreads, expectedSha256: opts?.expectedSha256,
      });
    }
    if (!tokenizerJson) {
      throw new Error(`Incompatible model: tokenizer.json is missing or invalid in ${JSON.stringify(dir)}`);
    }
    let tok;
    try {
      tok = tokenizerFromHF(tokenizerJson);
      if (!tok) throw new Error("unsupported tokenizer.json format");
    } catch (error) {
      throw new Error(
        `Incompatible model: tokenizer.json is missing or invalid in ${JSON.stringify(dir)}: ${String(error)}`,
      );
    }
    return new Agent({ provider, tok, cfg, revision, lang_temperatures: opts?.lang_temperatures });
  }
}
