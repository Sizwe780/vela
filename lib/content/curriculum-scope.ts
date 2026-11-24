import { chemistrySource } from "../../content/che1501/source-map";
import { IngestError } from "../ingest/errors";

export function assertCurriculumScope(
  institution: string,
  moduleCode: string,
  unitCode: string,
  position?: number,
) {
  if (institution !== "UNISA" || moduleCode !== "CHE1501") return;
  const excludedHistorical = chemistrySource.excludedUnits.find((entry) => {
    const code = entry.split(" ")[0];
    return code === unitCode.trim().toUpperCase();
  });
  if (excludedHistorical) {
    throw new IngestError(
      422,
      "UNIT_EXCLUDED_FROM_SYLLABUS",
      excludedHistorical + " is excluded from the CHE1501 syllabus.",
    );
  }
}
