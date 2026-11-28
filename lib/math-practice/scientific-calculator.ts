export type AngleMode = "DEG" | "RAD";
type Token = { kind: "number" | "name" | "operator"; text: string };
const finite = (value: number) => {
  if (!Number.isFinite(value))
    throw Error(
      "The result is not a finite real number. Check the domain, denominator and magnitude.",
    );
  return Object.is(value, -0) ? 0 : value;
};
export function calculatorNumber(value: number) {
  return String(Number(finite(value).toPrecision(14)));
}
function factorial(n: number) {
  if (!Number.isInteger(n) || n < 0 || n > 170)
    throw Error("Factorial needs an integer from 0 to 170.");
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}
function combinations(n: number, r: number, ordered: boolean) {
  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n || n > 1000)
    throw Error("nCr/nPr need integers with 0 ≤ r ≤ n ≤ 1000.");
  let result = 1;
  const count = ordered ? r : Math.min(r, n - r);
  for (let i = 1; i <= count; i++)
    result = finite(result * (ordered ? n - i + 1 : (n - count + i) / i));
  return result <= Number.MAX_SAFE_INTEGER ? Math.round(result) : result;
}
/** Bounded numeric grammar. No eval, Function, property access or arbitrary function calls. */
export function evaluateScientific(
  expression: string,
  mode: AngleMode = "RAD",
  answer = 0,
): number {
  if (mode !== "DEG" && mode !== "RAD") throw Error("Choose DEG or RAD.");
  if (!expression.trim() || expression.length > 1000)
    throw Error("Enter an expression of at most 1000 characters.");
  const source = expression
    .replaceAll("−", "-")
    .replaceAll("×", "*")
    .replaceAll("÷", "/")
    .replaceAll("π", "pi")
    .replaceAll("√", "sqrt");
  const tokens: Token[] = [];
  let cursor = 0;
  while (cursor < source.length) {
    if (/\s/.test(source[cursor])) {
      cursor++;
      continue;
    }
    const rest = source.slice(cursor),
      number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest),
      name = /^[A-Za-z][A-Za-z0-9_]*/.exec(rest);
    if (number) {
      tokens.push({ kind: "number", text: number[0] });
      cursor += number[0].length;
    } else if (name) {
      tokens.push({ kind: "name", text: name[0].toLowerCase() });
      cursor += name[0].length;
    } else if ("+-*/^(),!%".includes(source[cursor]))
      tokens.push({ kind: "operator", text: source[cursor++] });
    else
      throw Error(
        `Unsupported character: ${source[cursor]}. Use the calculator keys or ordinary mathematical notation.`,
      );
    if (tokens.length > 400) throw Error("Use a shorter expression (at most 400 tokens).");
  }
  let position = 0,
    depth = 0;
  const peek = () => tokens[position]?.text;
  const accept = (text: string) => {
    if (peek() === text) {
      position++;
      return true;
    }
    return false;
  };
  function call(name: string, args: number[]) {
    const aliases: Record<string, string> = {
      arcsin: "asin",
      arccos: "acos",
      arctan: "atan",
      log10: "log",
    };
    name = Object.hasOwn(aliases, name) ? aliases[name] : name;
    if (name === "ncr" || name === "npr" || name === "root") {
      if (args.length !== 2) throw Error(`${name} needs two arguments separated by a comma.`);
      if (name !== "root") return combinations(args[0], args[1], name === "npr");
      const [value, n] = args;
      if (!Number.isInteger(n) || n < 1 || n > 1000)
        throw Error("Use root(value, n) with an integer root index from 1 to 1000.");
      if (value < 0 && n % 2 === 0) throw Error("An even root of a negative number is not real.");
      return finite(Math.sign(value) * Math.abs(value) ** (1 / n));
    }
    if (args.length !== 1) throw Error(`${name} needs one argument in parentheses.`);
    const x = args[0];
    if (["sin", "cos", "tan"].includes(name)) {
      const quarter = mode === "DEG" ? x / 90 : x / (Math.PI / 2);
      if (Number.isInteger(quarter) && Math.abs(quarter) <= 1e12) {
        const k = ((quarter % 4) + 4) % 4;
        if (name === "sin") return [0, 1, 0, -1][k];
        if (name === "cos") return [1, 0, -1, 0][k];
        if (k % 2) throw Error("tan is undefined at odd multiples of 90° (π/2 radians).");
        return 0;
      }
      const radians = mode === "DEG" ? (x * Math.PI) / 180 : x;
      return finite(
        name === "sin" ? Math.sin(radians) : name === "cos" ? Math.cos(radians) : Math.tan(radians),
      );
    }
    if (name === "asin" || name === "acos" || name === "atan") {
      if (name !== "atan" && Math.abs(x) > 1)
        throw Error("asin/acos need a value between −1 and 1.");
      const radians =
        name === "asin" ? Math.asin(x) : name === "acos" ? Math.acos(x) : Math.atan(x);
      return mode === "DEG" ? (radians * 180) / Math.PI : radians;
    }
    if (name === "sqrt") return finite(Math.sqrt(x));
    if (name === "cbrt") return Math.cbrt(x);
    if (name === "ln" || name === "log") {
      if (x <= 0) throw Error("Logarithms need a positive argument.");
      return name === "ln" ? Math.log(x) : Math.log10(x);
    }
    if (name === "exp") return finite(Math.exp(x));
    if (name === "abs") return Math.abs(x);
    if (name === "factorial") return factorial(x);
    throw Error(`Unknown function: ${name}. Use the labelled calculator functions.`);
  }
  function primary(): number {
    if (++depth > 32) throw Error("Use at most 32 levels of nested parentheses.");
    let result: number;
    const token = tokens[position++];
    if (!token) throw Error("Complete the expression before evaluating.");
    if (token.kind === "number") result = finite(Number(token.text));
    else if (token.text === "(") {
      result = sum();
      if (!accept(")")) throw Error("Close the expression parentheses.");
    } else if (token.kind === "name") {
      if (token.text === "pi") result = Math.PI;
      else if (token.text === "e") result = Math.E;
      else if (token.text === "ans") result = finite(answer);
      else {
        if (!accept("(")) throw Error(`Use ${token.text}(...) with parentheses.`);
        const args: number[] = [];
        if (!accept(")")) {
          do {
            args.push(sum());
            if (args.length > 2) throw Error("This function accepts at most two arguments.");
          } while (accept(","));
          if (!accept(")")) throw Error("Close the function parentheses.");
        }
        result = call(token.text, args);
      }
    } else throw Error("Enter a number, constant or function here.");
    depth--;
    return finite(result);
  }
  function postfix(): number {
    let value = primary();
    while (peek() === "!" || peek() === "%") {
      if (accept("!")) {
        value = factorial(value);
        if (peek() === "!")
          throw Error(
            "Double factorial is not supported; use explicit parentheses for nested factorials.",
          );
      } else {
        accept("%");
        value /= 100;
      }
    }
    return value;
  }
  function power(): number {
    const value = postfix();
    return accept("^") ? finite(value ** unary()) : value;
  }
  function unary(): number {
    if (accept("+")) return unary();
    if (accept("-")) return finite(-unary());
    return power();
  }
  function product(): number {
    let value = unary();
    while (true) {
      if (accept("*")) value = finite(value * unary());
      else if (accept("/")) {
        const divisor = unary();
        if (divisor === 0) throw Error("Division by zero is undefined.");
        value = finite(value / divisor);
      } else if (
        tokens[position]?.kind === "name" ||
        tokens[position]?.kind === "number" ||
        peek() === "("
      )
        value = finite(value * unary());
      else break;
    }
    return value;
  }
  function sum(): number {
    let value = product();
    while (peek() === "+" || peek() === "-") {
      const plus = accept("+");
      if (!plus) accept("-");
      const next = product();
      value = finite(plus ? value + next : value - next);
    }
    return value;
  }
  const result = sum();
  if (position !== tokens.length)
    throw Error("Check for an extra closing parenthesis or missing operator.");
  return finite(result);
}
