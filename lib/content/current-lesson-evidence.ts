import { Prisma } from "@prisma/client";

export const authoredLessonPrefix = "Vela original / ";
const bptAuthoredPrefix = authoredLessonPrefix + "BPT1501-";

// Once a reader revision is screened, active learning uses its current authored text.
export const currentLessonEvidenceSql = Prisma.sql`(
  COALESCE(i."sourceName", '') NOT LIKE ${authoredLessonPrefix + "%"} OR
  (
    COALESCE(i."sourceName", '') NOT LIKE ${bptAuthoredPrefix + "%"} AND NOT EXISTS (
      SELECT 1 FROM "StudySession" screened WHERE screened."studyUnitId" = lo."studyUnitId"
      AND screened.concepts->>'lessonVoice' = 'direct-teaching'
    )
  ) OR EXISTS (
    SELECT 1 FROM "StudySession" ss
    WHERE ss."studyUnitId" = lo."studyUnitId" AND ss.markdown = i."sourceText"
  )
)`;
