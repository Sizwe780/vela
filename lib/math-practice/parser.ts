export class UnsupportedMath extends Error {}
export type DomainCondition = { expression: string; relation: "ne" | "gt" | "ge" };
type Limit = {
  code: string;
  body: string;
  variable: string;
  point: number;
  rational: boolean;
  variables: string[];
  domain: DomainCondition[];
};
export type ParsedMath = {
  code: string;
  variables: string[];
  denominators: string[];
  domain: DomainCondition[];
  integralCount: number;
  rational: boolean;
  limits: Limit[];
  integral?: { body: string; variable: string };
};
const variables = new Set(["x", "y", "z", "t", "a", "b", "c", "C"]);
const functions = new Set(["sin", "cos", "tan", "exp", "ln", "log", "sqrt", "abs"]);
const merge = (a: ParsedMath, b: ParsedMath, code: string): ParsedMath => ({
  code,
  variables: [...new Set([...a.variables, ...b.variables])],
  denominators: [...a.denominators, ...b.denominators],
  domain: [...a.domain, ...b.domain],
  integralCount: a.integralCount + b.integralCount,
  rational: a.rational && b.rational,
  limits: [...a.limits, ...b.limits],
});
const leaf = (code: string, vars: string[] = []): ParsedMath => ({
  code,
  variables: vars,
  denominators: [],
  domain: [],
  integralCount: 0,
  rational: true,
  limits: [],
});
class Parser {
  private i = 0;
  private depth = 0;
  constructor(private readonly tokens: string[]) {}
  private peek(offset = 0) {
    return this.tokens[this.i + offset];
  }
  private take(expected?: string) {
    const t = this.tokens[this.i++];
    if (!t || (expected && t !== expected))
      throw new UnsupportedMath("Check the brackets and complete every placeholder.");
    return t;
  }
  parse(): ParsedMath {
    const result = this.expression();
    if (this.i !== this.tokens.length)
      throw new UnsupportedMath("This notation is outside the supported expression checker.");
    if (result.integralCount > 2 || result.limits.length > 1 || result.variables.length > 5)
      throw new UnsupportedMath("Break this into a smaller step.");
    return result;
  }
  private expression(): ParsedMath {
    let left = this.product();
    while (["+", "-"].includes(this.peek())) {
      const op = this.take(),
        right = this.product();
      left = merge(left, right, `(${left.code}${op}${right.code})`);
    }
    return left;
  }
  private product(): ParsedMath {
    let left = this.unary();
    while (this.peek() && this.peek() !== ")" && !["+", "-", ","].includes(this.peek())) {
      let op = "*";
      if (["*", "/"].includes(this.peek())) op = this.take();
      else if (!/^[a-zA-Z0-9.(]/.test(this.peek())) break;
      const right = this.unary(),
        next = merge(left, right, `(${left.code}${op}${right.code})`);
      if (op === "/") next.denominators.push(right.code);
      left = next;
    }
    return left;
  }
  private unary(): ParsedMath {
    if (this.peek() === "+") {
      this.take();
      return this.unary();
    }
    if (this.peek() === "-") {
      this.take();
      const n = this.unary();
      return { ...n, code: `(-${n.code})`, integral: undefined };
    }
    let base = this.primary();
    if (this.peek() === "^") {
      this.take();
      base = this.power(base, this.unary());
    }
    return base;
  }
  private power(base: ParsedMath, exponent: ParsedMath) {
    const value = Number(exponent.code.replace(/[()]/g, ""));
    const numericalBase = Number(base.code.replace(/[()]/g, ""));
    if (exponent.variables.length) {
      if (
        base.code !== "e" &&
        !(Number.isFinite(numericalBase) && numericalBase > 0 && numericalBase <= 10)
      )
        throw new UnsupportedMath(
          "Variable powers require a known positive base here. Domain-sensitive powers need tutor review.",
        );
    } else if (!Number.isInteger(value) || Math.abs(value) > 12)
      throw new UnsupportedMath(
        "Use integer powers between -12 and 12. Roots and fractional powers need a domain-aware review.",
      );
    const result = merge(base, exponent, `(${base.code}^(${exponent.code}))`);
    if (exponent.variables.length) result.rational = false;
    if (value < 0) result.denominators.push(base.code);
    return result;
  }
  private group() {
    this.take("(");
    const body = this.expression();
    this.take(")");
    return body;
  }
  private primary(): ParsedMath {
    if (++this.depth > 24)
      throw new UnsupportedMath("Break nested expressions into smaller steps.");
    try {
      // MathLive serializes the ordinary d/dx template this way; no arbitrary function evaluation.
      if (
        this.tokens.slice(this.i, this.i + 6).join("") === "(d)/(d" &&
        ["x", "y", "z", "t"].includes(this.peek(6)) &&
        this.peek(7) === ")"
      ) {
        this.i += 6;
        const variable = this.take();
        this.take(")");
        const body = this.group();
        return {
          ...body,
          code: `diff(${body.code},${variable})`,
          integral: undefined,
          rational: false,
        };
      }
      if (this.peek() === "(") return this.group();
      const token = this.take();
      if (/^\d+(?:\.\d+)?$/.test(token)) {
        if (Number(token) > 1e6 || token.length > 14)
          throw new UnsupportedMath("Use smaller coefficients for an interactive check.");
        return leaf(token);
      }
      if (token === "int") return this.integral();
      if (token === "lim") return this.limit();
      if (functions.has(token)) {
        let power: ParsedMath | undefined;
        if (this.peek() === "^") {
          this.take();
          power = this.unary();
        }
        if (this.peek() !== "(")
          throw new UnsupportedMath("Put the function's input in parentheses, for example sin(x).");
        const body = this.group();
        const result = {
          ...body,
          code:
            token === "exp"
              ? `(e^(${body.code}))`
              : `${token === "ln" ? "log" : token}(${body.code})`,
          integral: undefined,
          rational: false,
        };
        if (token === "ln" || token === "log")
          result.domain = [...body.domain, { expression: body.code, relation: "gt" as const }];
        if (token === "sqrt")
          result.domain = [...body.domain, { expression: body.code, relation: "ge" as const }];
        if (token === "tan") result.denominators.push(`cos(${body.code})`);
        return power ? this.power(result, power) : result;
      }
      if (["e", "pi"].includes(token)) return leaf(token);
      if (variables.has(token)) return leaf(token, [token]);
      throw new UnsupportedMath(
        "Supported variables are x, y, z, t, a, b, c and C. Use sin, cos, tan or exp with parentheses; other notation can still be sent to your tutor.",
      );
    } finally {
      this.depth--;
    }
  }
  private integral(): ParsedMath {
    if (this.peek() === "_")
      throw new UnsupportedMath(
        "Definite integrals are not checked in this first release. Use an indefinite integral or antiderivative.",
      );
    let level = 0,
      end = -1;
    for (let j = this.i; j < this.tokens.length; j++) {
      const t = this.tokens[j];
      if (t === "(") level++;
      if (t === ")" && --level < 0) break;
      if (level === 0 && t === "d" && ["x", "y", "z", "t"].includes(this.tokens[j + 1])) {
        end = j;
        break;
      }
    }
    if (end < 0)
      throw new UnsupportedMath("Complete the differential, for example dx, after the integrand.");
    const body = new Parser(this.tokens.slice(this.i, end)).parse(),
      variable = this.tokens[end + 1];
    this.i = end + 2;
    return {
      ...body,
      code: `integrate(${body.code},${variable})`,
      integralCount: body.integralCount + 1,
      rational: false,
      integral: { body: body.code, variable },
    };
  }
  private limit(): ParsedMath {
    this.take("_");
    this.take("(");
    const variable = this.take();
    this.take("->");
    let sign = 1;
    if (this.peek() === "-") {
      this.take();
      sign = -1;
    }
    const point = sign * Number(this.take());
    this.take(")");
    if (
      !["x", "y", "z", "t"].includes(variable) ||
      !Number.isFinite(point) ||
      Math.abs(point) > 100
    )
      throw new UnsupportedMath("Use a finite two-sided limit with a small real approach value.");
    if (this.peek() !== "(")
      throw new UnsupportedMath("Put the expression following the limit in parentheses.");
    const body = this.group(),
      code = `limit(${body.code},${variable},${point})`;
    return {
      ...leaf(code),
      rational: false,
      limits: [
        {
          code,
          body: body.code,
          variable,
          point,
          rational: body.rational && body.integralCount === 0 && body.limits.length === 0,
          variables: body.variables,
          domain: [
            ...body.domain,
            ...body.denominators.map((expression) => ({ expression, relation: "ne" as const })),
          ],
        },
      ],
    };
  }
}
export async function parseMath(latex: string): Promise<ParsedMath> {
  if (typeof latex !== "string" || !latex.trim() || latex.length > 600)
    throw new UnsupportedMath("Enter a complete expression of up to 600 characters.");
  const normalized = normalizeMathLine(latex);
  latex = normalized.expression;
  if (/\^\s*-?\d{2,}/.test(latex))
    throw new UnsupportedMath(
      "Use braces around a multi-digit exponent, and keep its magnitude at most 12.",
    );
  const allowed = new Set([
    "frac",
    "dfrac",
    "tfrac",
    "left",
    "right",
    "sin",
    "cos",
    "tan",
    "exp",
    "ln",
    "log",
    "sqrt",
    "abs",
    "vert",
    "lvert",
    "rvert",
    "int",
    "lim",
    "to",
    "pi",
    "cdot",
    "times",
    "div",
    "mathrm",
    "operatorname",
  ]);
  if ((latex.match(/\\[a-zA-Z]+/g) ?? []).some((command) => !allowed.has(command.slice(1))))
    throw new UnsupportedMath(
      "This command is outside the supported local checker. Ask your tutor to review it.",
    );
  const { convertLatexToAsciiMath } = await import("mathlive/ssr");
  latex = functionNotation(
    latex.replace(/\\operatorname\{(sqrt|abs|sin|cos|tan|exp|ln|log)\}/g, "$1"),
  ).replace(/(?<![A-Za-z\\])(sin|cos|tan|exp|ln|log)(?=\s*\()/g, "\\$1");
  let ascii = convertLatexToAsciiMath(latex).replace(/\s+/g, " ").trim();
  // MathLive's ordinary absolute-value serialization, including ln |x|.
  ascii = ascii.replace(/\b(ln|log)\s+\|([^|]+)\|/g, "$1(abs($2))");
  while (/\|[^|]+\|/.test(ascii)) ascii = ascii.replace(/\|([^|]+)\|/, "abs($1)");
  const tokens = ascii.match(/->|\d+(?:\.\d+)?|[A-Za-z]+|[()+\-*/^,_]/g) ?? [];
  if (tokens.length > 160 || tokens.join("") !== ascii.replace(/\s/g, ""))
    throw new UnsupportedMath(
      "This checker supports bounded real expressions, not arbitrary equations, prose or commands.",
    );
  const parsed = new Parser(tokens).parse();
  parsed.domain.push(...normalized.domain);
  return parsed;
}

function functionNotation(text: string): string {
  const match = /(?<![A-Za-z])\\?(sqrt|abs)\s*\(/.exec(text);
  if (!match) return text;
  const opening = match.index + match[0].length - 1;
  let depth = 1,
    end = opening + 1;
  for (; end < text.length && depth; end++) {
    if (text[end] === "(") depth++;
    if (text[end] === ")") depth--;
  }
  if (depth) throw new UnsupportedMath("Close the function parentheses.");
  const body = functionNotation(text.slice(opening + 1, end - 1));
  return (
    text.slice(0, match.index) +
    (match[1] === "sqrt" ? `\\sqrt{${body}}` : `\\left|${body}\\right|`) +
    functionNotation(text.slice(end))
  );
}

/** Presentation and a deliberately small, explicit domain-note grammar. */
export function normalizeMathLine(input: string): {
  expression: string;
  domain: DomainCondition[];
} {
  let expression = input
    .trim()
    .replace(/^\$\$([\s\S]*)\$\$$/, "$1")
    .replace(/^\$([\s\S]*)\$$/, "$1")
    .replace(/^\\\(([\s\S]*)\\\)$/, "$1")
    .replace(/^\\\[([\s\S]*)\\\]$/, "$1")
    .trim()
    .replace(/^=\s*/, "");
  const domain: DomainCondition[] = [];
  const note =
    /(?:;|(?<!\\),|\\quad(?:\\text\{(?:where|for)\})?|\s+(?:where|for)\s+)\s*(?:where\s+|for\s+)?([\s\S]+)$/.exec(
      expression,
    );
  if (note) {
    const notes = note[1]
      .replace(/\\(?:ne|neq)\b/g, "!=")
      .replace(/\\geq?\b/g, ">=")
      .replace(/\\leq?\b/g, "<=")
      .replaceAll("≠", "!=")
      .replaceAll("≥", ">=")
      .replaceAll("≤", "<=");
    for (const item of notes.split(/\s*(?:,|;|\band\b)\s*/)) {
      const match = /^([xyzt])\s*(!=|>=|<=|>|<)\s*(-?\d+(?:\.\d+)?)$/.exec(item.trim());
      if (!match)
        throw new UnsupportedMath(
          "Use a separate domain note such as ; x != 2 or ; x > 0. Check piecewise branches separately on their stated intervals.",
        );
      const [, variable, operator, value] = match;
      domain.push({
        expression: operator.startsWith("<")
          ? `(${value}-${variable})`
          : `(${variable}-(${value}))`,
        relation: operator === "!=" ? "ne" : operator.includes("=") ? "ge" : "gt",
      });
    }
    expression = expression.slice(0, note.index).trim();
  }
  expression = expression.replace(
    /^lim\s*_?\s*\(\s*([xyzt])\s*(?:->|→)\s*(-?\d+(?:\.\d+)?)\s*\)\s*([\s\S]+)$/,
    (_, v, point, body) => `\\lim_{${v}\\to ${point}}\\left(${body}\\right)`,
  );
  return { expression, domain };
}
