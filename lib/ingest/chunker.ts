import { Tiktoken } from "js-tiktoken/lite";
import ranks from "js-tiktoken/ranks/cl100k_base";
import { IngestError } from "./errors";

export const CHUNK_SIZE = 500;
export const OVERLAP = 50;
export const TOKENIZER = "cl100k_base";
export const MAX_SOURCE_TOKENS = 100_000;
const tokenizer = new Tiktoken(ranks);
// Public rank data provides exact UTF-8 byte lengths for token offsets.
const byteLengths = new Map<number, number>();
for (const line of ranks.bpe_ranks.split("\n").filter(Boolean)) {
  const [, offset, ...entries] = line.split(" ");
  entries.forEach((entry, index) =>
    byteLengths.set(Number(offset) + index, Buffer.from(entry, "base64").length),
  );
}

export type TextChunk = {
  index: number;
  tokenStart: number;
  tokenEnd: number;
  tokenCount: number;
  tokenIds: number[];
  body: string;
  sourceByteStart: number;
  sourceByteEnd: number;
};

export function encodeText(text: string): number[] {
  return tokenizer.encode(text, [], []);
}

export function chunkText(text: string): TextChunk[] {
  // Treat strings resembling tokenizer control tokens as ordinary study text.
  const tokens = encodeText(text);
  if (tokens.length > MAX_SOURCE_TOKENS)
    throw new IngestError(
      413,
      "TOO_MANY_TOKENS",
      "Study text exceeds 100,000 tokens. Submit smaller criterion-specific sections.",
    );
  const chunks: TextChunk[] = [];
  const source = Buffer.from(text, "utf8");
  const offsets = [0];
  for (const token of tokens) offsets.push(offsets[offsets.length - 1] + byteLengths.get(token)!);
  const continuation = (index: number) => index < source.length && (source[index] & 0xc0) === 0x80;
  for (let start = 0; start < tokens.length; start += CHUNK_SIZE - OVERLAP) {
    const end = Math.min(start + CHUNK_SIZE, tokens.length);
    const tokenIds = tokens.slice(start, end);
    // Token boundaries can bisect UTF-8 characters. Keep exact embedding token
    // windows; expand only display-text boundaries to preserve complete glyphs.
    let sourceByteStart = offsets[start];
    let sourceByteEnd = offsets[end];
    while (sourceByteStart > 0 && continuation(sourceByteStart)) sourceByteStart--;
    while (continuation(sourceByteEnd)) sourceByteEnd++;
    chunks.push({
      index: chunks.length,
      tokenStart: start,
      tokenEnd: end,
      tokenCount: end - start,
      tokenIds,
      body: source.subarray(sourceByteStart, sourceByteEnd).toString("utf8"),
      sourceByteStart,
      sourceByteEnd,
    });
    // Avoid a trailing chunk made solely of the preceding chunk's overlap.
    if (end === tokens.length) break;
  }
  return chunks;
}
