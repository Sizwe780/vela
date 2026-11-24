import "server-only";
import { prisma } from "../db";
import { createQuizEngine } from "./engine";

export const quizEngine = createQuizEngine({
  query: (statement) => prisma.$queryRaw(statement),
  transaction: (callback) =>
    prisma.$transaction((tx) => callback({ query: (statement) => tx.$queryRaw(statement) }), {
      maxWait: 15_000,
      timeout: 60_000,
    }),
});
