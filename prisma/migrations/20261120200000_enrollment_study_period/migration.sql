ALTER TABLE "Enrollment"
  ADD COLUMN "studyPlanYear" INTEGER,
  ADD COLUMN "studyPlanSemester" INTEGER,
  ADD CONSTRAINT "Enrollment_study_plan_period_check" CHECK (
    ("studyPlanYear" IS NULL AND "studyPlanSemester" IS NULL) OR
    ("studyPlanYear" IS NOT NULL AND "studyPlanSemester" IS NOT NULL
      AND "studyPlanYear" BETWEEN 2000 AND 9999 AND "studyPlanSemester" IN (1, 2))
  );
