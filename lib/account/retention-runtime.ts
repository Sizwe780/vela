import "server-only";
import { prisma } from "../db";
import type { Database } from "../ingest/repository";
export const retentionDatabase: Database = {
  query: (sql) => prisma.$queryRaw(sql),
  transaction: (callback) =>
    prisma.$transaction((tx) => callback({ query: (sql) => tx.$queryRaw(sql) }), {
      maxWait: 5000,
      timeout: 25000,
    }),
};
