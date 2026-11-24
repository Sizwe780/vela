export type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
export type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
export type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
export function spokenMath(latex: string) {
  if (/\\begin\{(?:bmatrix|pmatrix|matrix|array)\}/.test(latex)) return "matrix shown on screen";
  let s = latex.replace(/\\frac\{d\}\{d([a-z])\}/g, " derivative with respect to $1 of ");
  for (let i = 0; i < 4; i++)
    s = s.replace(/\\(?:d?frac)\{([^{}]*)\}\{([^{}]*)\}/g, " ( $1 ) over ( $2 ) ");
  const words: Record<string, string> = {
    epsilon: "epsilon",
    delta: "delta",
    alpha: "alpha",
    beta: "beta",
    theta: "theta",
    pi: "pi",
    infty: "infinity",
    to: "approaches",
    le: "less than or equal to",
    leq: "less than or equal to",
    ge: "greater than or equal to",
    geq: "greater than or equal to",
    ne: "not equal to",
    neq: "not equal to",
    cdot: "times",
    times: "times",
    int: "integral",
    lim: "limit",
    det: "determinant",
    sin: "sine",
    cos: "cosine",
    tan: "tangent",
    sqrt: "square root of",
    forall: "for every",
    exists: "there exists",
    in: "in",
  };
  s = s.replace(/\\([a-zA-Z]+)/g, (_, name: string) =>
    words[name]
      ? ` ${words[name]} `
      : ["left", "right", "mathrm", "displaystyle"].includes(name)
        ? ""
        : " symbol ",
  );
  return s
    .replace(/\^\{?2\}?/g, " squared ")
    .replace(/\^\{?3\}?/g, " cubed ")
    .replace(/\^/g, " to the power ")
    .replace(/_/g, " subscript ")
    .replace(/=/g, " equals ")
    .replace(/</g, " less than ")
    .replace(/>/g, " greater than ")
    .replace(/\+/g, " plus ")
    .replace(/-/g, " minus ")
    .replace(/[{}\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function speechText(markdown: string) {
  let text = markdown
    .slice(0, 16000)
    .replace(/```[\s\S]*?```/g, " Code shown on screen. ")
    .replace(/<(?:render_)?widget\b[^>]*\/?\s*>/gi, " Interactive visual shown on screen. ");
  // Do not voice an unfinished mathematical block during token streaming.
  const dollars = text.match(/\$\$|(?<!\$)\$(?!\$)/g) ?? [];
  if (dollars.filter((s) => s === "$$").length % 2) text = text.slice(0, text.lastIndexOf("$$"));
  else if (dollars.filter((s) => s === "$").length % 2) text = text.slice(0, text.lastIndexOf("$"));
  return text
    .replace(/\$\$([\s\S]*?)\$\$|\$([^$]+)\$/g, (_, display: string, inline: string) =>
      spokenMath(display ?? inline),
    )
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/[*_`|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function speechSegments(text: string, final: boolean) {
  const sentences: string[] = [];
  let end = 0;
  for (const match of text.matchAll(/[.!?](?=\s|$)/g)) {
    const at = match.index! + 1;
    const sentence = text.slice(end, at).trim();
    if (sentence) sentences.push(sentence);
    end = at;
  }
  if (final && text.slice(end).trim()) {
    sentences.push(text.slice(end).trim());
    end = text.length;
  }
  return { sentences, end };
}
