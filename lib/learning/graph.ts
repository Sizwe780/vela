import { createHash } from "node:crypto";
import { z } from "zod";
import data from "../../.vela/concepts/graph.json";
import { bktParameters } from "./bkt";
const node = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9.-]{1,80}$/),
    version: z.number().int().positive(),
    title: z.string().min(1).max(120),
    probeKind: z.enum([
      "balance",
      "powers",
      "limit",
      "derivative",
      "chain",
      "ftc",
      "row",
      "determinant",
      "volume-conversion",
      "density",
    ]),
    prerequisites: z.array(z.string()).max(10),
    parameters: bktParameters.optional(),
    mappings: z
      .array(
        z
          .object({
            institution: z.string().min(1),
            moduleCode: z.string().min(1),
            unitCode: z.string().min(1),
            position: z.number().int().positive(),
          })
          .strict(),
      )
      .min(1)
      .max(20),
    refresher: z.string().min(80).max(6000),
    connections: z
      .array(z.object({ label: z.string().max(100), text: z.string().max(500) }).strict())
      .max(3),
  })
  .strict();
const graphSchema = z
  .object({
    version: z.literal(1),
    modelVersion: z.string().min(1).max(80),
    parameters: bktParameters,
    nodes: z.array(node).max(500),
  })
  .strict();
export type ConceptNode = z.infer<typeof node>;
export function validateConceptGraph(value: unknown) {
  const graph = graphSchema.parse(value),
    nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  if (nodes.size !== graph.nodes.length) throw Error("Duplicate concept identity");
  const done = new Set<string>(),
    active = new Set<string>();
  function visit(id: string) {
    if (active.has(id)) throw Error("Concept prerequisite cycle");
    if (done.has(id)) return;
    const n = nodes.get(id);
    if (!n) throw Error("Unknown prerequisite");
    active.add(id);
    for (const p of n.prerequisites) visit(p);
    active.delete(id);
    done.add(id);
  }
  for (const n of graph.nodes) visit(n.id);
  return graph;
}
export const conceptGraph = validateConceptGraph(data);
export const conceptParameters = (n: ConceptNode) => n.parameters ?? conceptGraph.parameters;
export const conceptModelVersion = (n: ConceptNode) =>
  `${conceptGraph.modelVersion}:${createHash("sha256")
    .update(
      JSON.stringify({
        id: n.id,
        version: n.version,
        probe: n.probeKind,
        parameters: conceptParameters(n),
      }),
    )
    .digest("hex")
    .slice(0, 20)}`;
