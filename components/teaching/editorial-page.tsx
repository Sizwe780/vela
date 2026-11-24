import { notFound } from "next/navigation";
import { EditorialWorkspace } from "./editorial-workspace";
import { LearningShell } from "../learning-shell";
import { requireStudentPage } from "../../lib/student/page-auth";
import { staffScopes } from "../../lib/staff/access";
import { IngestError } from "../../lib/ingest/errors";

export async function EditorialPage({ moduleCode }: { moduleCode?: string }) {
  const user = await requireStudentPage(
    moduleCode ? "/staff/editor/" + moduleCode : "/staff/review",
  );
  try {
    await staffScopes(user.id);
  } catch (error) {
    if (error instanceof IngestError && error.status === 403) notFound();
    throw error;
  }
  return (
    <LearningShell
      title="Editorial review"
      breadcrumb={[{ label: "Teaching workspace", href: "/staff" }]}
    >
      <EditorialWorkspace initialModule={moduleCode} />
    </LearningShell>
  );
}
