import "server-only";
import { prisma } from "../db";
import { createQuizEngine } from "./engine";
import { generateQuiz } from "./generator";
import { generateUnitQuiz } from "./bank";

const database = {
  query: (statement) => prisma.$queryRaw(statement),
  transaction: (callback) =>
    prisma.$transaction((tx) => callback({ query: (statement) => tx.$queryRaw(statement) }), {
      maxWait: 15_000,
      timeout: 60_000,
    }),
} satisfies import("../ingest/repository").Database;
export const quizEngine = {
  submit: createQuizEngine(database).submit,
  async generate(studentId: string, value: unknown, signal?: AbortSignal) {
    const id =
      value && typeof value === "object" && "studyUnitId" in value ? value.studyUnitId : null;
    const unit =
      typeof id === "string"
        ? await prisma.studyUnit.findUnique({
            where: { id },
            select: { code: true, module: { select: { institution: true } } },
          })
        : null;
    return createQuizEngine(database, (sources, provider, abort) =>
      generateUnitQuiz(
        unit?.code ?? "",
        sources,
        provider,
        abort,
        generateQuiz,
        unit?.module.institution ?? "",
      ),
    ).generate(studentId, value, signal);
  },
};
