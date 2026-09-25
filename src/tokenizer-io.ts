// Adapted from Laya (https://github.com/NandhaKishorM/laya), Apache-2.0.
// PixelKit Labs separated filesystem loading from the mobile tokenizer core.
import { parseTokenizerJson, type TokenizerData } from "./tokenizer.js";

/** Load an HF tokenizer.json from a local path (Node) or URL. */
export async function loadTokenizerJson(pathOrUrl: string): Promise<TokenizerData | null> {
  let raw: unknown;
  if (/^https?:\/\//.test(pathOrUrl)) {
    const res = await fetch(pathOrUrl);
    if (!res.ok) return null;
    raw = await res.json();
  } else {
    const fs: typeof import("node:fs/promises") = await import("node:fs/promises");
    raw = JSON.parse(await fs.readFile(pathOrUrl, "utf8"));
  }
  return parseTokenizerJson(raw);
}
