export type SymbolicMode = "expression" | "antiderivative" | "derivative";
export type RowOperation = {
  kind: "swap" | "scale" | "add" | "equivalence";
  source: number;
  target: number;
  factor: string;
};
export type MathCheckRequest =
  | {
      kind: "symbolic";
      reference: string;
      next: string;
      mode: SymbolicMode;
      variable: "x" | "y" | "z" | "t";
      /** Accepted earlier lines supply domain restrictions, never an answer key. */
      domainSources?: string[];
    }
  | { kind: "matrix"; reference: string; next: string; operation: RowOperation }
  | {
      kind: "quantity";
      reference: import("./quantity").Quantity;
      next: import("./quantity").Quantity;
    };
export type MathFeedback = {
  status: "equivalent" | "conditional" | "not-equivalent" | "unsupported";
  message: string;
  conditions?: string[];
  matrixEvidence?: {
    rowEquivalent: boolean;
    declaredOperationMatches: boolean;
    inferredOperation?: RowOperation;
  };
  residualLatex?: string;
  counterexample?: { values: Record<string, number>; previous: number; proposed: number };
};
export type MathProblem = {
  id: string;
  topic: "expand" | "derivative" | "integral" | "limit" | "matrix";
  title: string;
  question: string;
  reference: string;
  mode: SymbolicMode;
  answer: string;
  explanation: string;
};
