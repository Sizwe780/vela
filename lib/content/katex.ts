import katex from "katex";
import "katex/contrib/mhchem";

export const katexOptions = {
  trust: false,
  strict: "ignore",
  maxExpand: 1000,
} as const;

export { katex };
