export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { requireStudentPage } from "../../../lib/student/page-auth";
export default async function MathPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ notebook?: string; view?: string }>;
}) {
  const params = await searchParams;
  const path =
    params.notebook === "1" ? "?notebook=1" : params.view === "visuals" ? "?view=visuals" : "";
  await requireStudentPage(`/practice/lab${path}`);
  redirect(`/practice/lab${path}`);
}
