import "server-only";
import { prisma } from "../db";
import { createIngestionRepository, type Database } from "./repository";
import { embedTokens } from "./embeddings";
import { ingest } from "./service";

const database: Database = {
  query: (statement) => prisma.$queryRaw(statement),
  transaction: (callback) =>
    prisma.$transaction((tx) => callback({ query: (statement) => tx.$queryRaw(statement) }), {
      timeout: 30_000,
    }),
};
const repository = createIngestionRepository(database);

export function ingestStudyText(input: unknown) {
  return ingest(input, repository, embedTokens);
}
