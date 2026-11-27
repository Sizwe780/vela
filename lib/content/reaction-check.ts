export function countFormula(formula: string) {
  const groups = [new Map<string, number>()];
  const tokens = formula.match(/[A-Z][a-z]?|[()]|\d+/g) ?? [];
  if (tokens.join("") !== formula || !tokens.length) throw Error("Unsupported formula: " + formula);
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === "(") {
      groups.push(new Map());
      continue;
    }
    const subscript = /^\d+$/.test(tokens[i + 1] ?? "") ? Number(tokens[++i]) : 1;
    if (subscript < 1 || subscript > 999) throw Error("Invalid subscript");
    if (token === ")") {
      const group = groups.pop();
      const parent = groups.at(-1);
      if (!group?.size || !parent) throw Error("Unmatched or empty formula group");
      for (const [element, quantity] of group) {
        parent.set(element, (parent.get(element) ?? 0) + quantity * subscript);
      }
    } else if (/^[A-Z]/.test(token)) {
      const group = groups.at(-1)!;
      group.set(token, (group.get(token) ?? 0) + subscript);
    } else {
      throw Error("Unexpected formula token: " + token);
    }
  }
  if (groups.length !== 1 || !groups[0].size) throw Error("Unclosed formula group");
  return groups[0];
}

function countSide(text: string) {
  const atoms = new Map<string, number>();
  let chargeTotal = 0;
  for (const species of text.trim().split(/\s+\+\s+/)) {
    const term = species.replace(/\s*\((?:aq|s|l|g)\)$/, "");
    const [match, prefix, formula, groupCharge, plainCharge] =
      /^(\d*)\s*(e|[A-Z][A-Za-z0-9()]*)\s*(?:\^\{(\d*[+-])\}|\^(\d*[+-]))?$/.exec(term) ?? [];
    const coefficient = Number(prefix || 1);
    if (!match || coefficient < 1 || coefficient > 999)
      throw Error("Unsupported reaction species: " + species);
    const charge = groupCharge ?? plainCharge;
    const signed = charge ? Number(charge.slice(0, -1) || 1) * (charge.endsWith("-") ? -1 : 1) : 0;
    if (!Number.isSafeInteger(signed) || Math.abs(signed) > 999) throw Error("Invalid charge");
    chargeTotal += coefficient * signed;
    if (formula === "e") {
      if (signed !== -1) throw Error("An electron must have charge −1.");
      continue;
    }
    for (const [element, quantity] of countFormula(formula)) {
      atoms.set(element, (atoms.get(element) ?? 0) + quantity * coefficient);
    }
  }
  return { atoms, chargeTotal };
}

export function equationBalance(equation: string) {
  const parts = equation.split(/<=>|->/);
  if (parts.length !== 2) throw Error("Expected one reaction arrow");
  const left = countSide(parts[0]);
  const right = countSide(parts[1]);
  const elements = [...new Set([...left.atoms.keys(), ...right.atoms.keys()])];
  const atoms = elements.map(element => ({
    element, left: left.atoms.get(element) ?? 0, right: right.atoms.get(element) ?? 0,
  }));
  return { atoms, charge: [left.chargeTotal, right.chargeTotal], balanced:
    left.chargeTotal === right.chargeTotal && atoms.every(row => row.left === row.right) };
}

export function auditReactionEquations(markdown: string, intentionalImbalances: readonly string[]) {
  // Supported mhchem subset: symbols, grouped subscripts, integer coefficients,
  // ionic charges, phases and electrons. Complex notation needs separate review.
  const seen = new Set<string>();
  const balanced = new Set<string>();
  const exceptions = new Set(intentionalImbalances);
  for (const match of markdown.matchAll(/\\ce\{/g)) {
    const start = match.index + match[0].length;
    let depth = 1;
    let end = start;
    while (depth && end < markdown.length) {
      const character = markdown[end++];
      if (character === "{") depth++;
      if (character === "}") depth--;
    }
    if (depth) throw Error("Unclosed chemistry expression");
    const equation = markdown.slice(start, end - 1).replace(/\s+/g, " ").trim();
    if (!/->|<=>/.test(equation)) continue;
    const result = equationBalance(equation);
    if (exceptions.has(equation)) {
      if (result.balanced) throw Error("Stale imbalance exception: " + equation);
      seen.add(equation);
    } else if (!result.balanced) {
      throw Error("Unbalanced atoms or charge: " + equation);
    } else {
      balanced.add(equation);
    }
  }
  if (!balanced.size) throw Error("No balanced reaction equations found");
  for (const exception of exceptions) {
    if (!seen.has(exception)) throw Error("Missing imbalance exercise: " + exception);
  }
  return { balanced: balanced.size, intentionalImbalances: seen.size };
}
